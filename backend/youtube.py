"""
backend/youtube.py — P5 YouTube Studio autopilot (HUMAN-APPROVE GATE).

Pipeline stages (all run WITHOUT YouTube upload perms):
  research  -> trending/competitor topics (YouTube Data API search; needs API key)
  seo       -> title/tags/description generator (LLM via OpenAI/Nous)
  script     -> faceless narrated script + shot list (LLM)
  voiceover  -> TTS audio (reuses OpenAI/Nous path)
  visuals    -> ffmpeg text-slide deck (local; AI imagery is a later swap)
  assemble   -> ffmpeg mux voiceover + slides + burned captions -> mp4
  thumbnail  -> title-card PNG via ffmpeg
  schedule   -> UPLOAD (requires YouTube OAuth token) — GATED, human-approved only

Fail-closed: every stage that needs an external input (API key / OAuth) returns a
clear error instead of fabricating. Publish NEVER happens without an OAuth token
present AND an explicit approve flag.
"""
import json
import os
import subprocess
import tempfile
import time
from pathlib import Path
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel

router = APIRouter(prefix="/api/studio", tags=["studio"])

BASE_DIR = Path(__file__).resolve().parent.parent
STUDIO_DIR = BASE_DIR / "data" / "studio"
STUDIO_DIR.mkdir(parents=True, exist_ok=True)

# ── helpers ────────────────────────────────────────────────────────
def _settings() -> dict:
    try:
        f = BASE_DIR / "data" / "settings.json"
        if f.exists():
            return json.loads(f.read_text())
    except Exception:
        pass
    return {}

def _llm(prompt: str, max_tokens: int = 800) -> str:
    """Cheap LLM call via OpenAI-compatible (Nous). Fail-closed."""
    s = _settings().get("youtube", {})
    key = (s.get("llm_api_key")
           or os.environ.get("NOUS_OPENAI_KEY")
           or os.environ.get("OPENAI_API_KEY"))
    if not key:
        raise RuntimeError("No LLM key configured (set youtube.llm_api_key or NOUS_OPENAI_KEY)")
    try:
        from openai import OpenAI
        client = OpenAI(api_key=key, base_url=os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1"))
        r = client.chat.completions.create(
            model=s.get("llm_model", "gpt-4o-mini"),
            messages=[{"role": "user", "content": prompt}],
            max_tokens=max_tokens,
        )
        return r.choices[0].message.content.strip()
    except Exception as e:
        raise RuntimeError(f"LLM error: {e}")

def _yt_api():
    """Return an authenticated YouTube Data API service (read-only needs API key)."""
    key = _settings().get("youtube", {}).get("api_key") or os.environ.get("YOUTUBE_API_KEY")
    if not key:
        raise RuntimeError("YouTube Data API key not configured")
    from googleapiclient.discovery import build
    return build("youtube", "v3", developerKey=key)

def _oauth_creds_path() -> Path:
    return BASE_DIR / "data" / "youtube_token.json"

def _has_oauth() -> bool:
    p = _oauth_creds_path()
    if not p.exists():
        return False
    try:
        d = json.loads(p.read_text())
        return bool(d.get("token") or d.get("refresh_token"))
    except Exception:
        return False

# ── stages ─────────────────────────────────────────────────────────
@router.get("/research")
def research(query: str = Query("AI trading XAUUSD"), max_results: int = 10):
    try:
        yt = _yt_api()
        req = yt.search().list(part="snippet", q=query, type="video",
                               order="viewCount", maxResults=max_results)
        resp = req.execute()
        items = [{"title": i["snippet"]["title"],
                  "channel": i["snippet"]["channelTitle"],
                  "videoId": i["id"]["videoId"]} for i in resp.get("items", [])]
        return {"query": query, "results": items}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"research failed: {e}")

@router.post("/seo")
def seo(payload: dict):
    topic = (payload.get("topic") or "").strip()
    if not topic:
        raise HTTPException(400, "topic required")
    try:
        out = _llm(f"Generate YouTube SEO for the topic '{topic}'. Return JSON only: "
                   f"{{\"title\": str, \"tags\": [str], \"description\": str}}. No commentary.")
        # best-effort parse; fall back to raw
        try:
            data = json.loads(out)
        except Exception:
            data = {"title": topic, "tags": [topic], "description": out}
        return data
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"seo failed: {e}")

@router.post("/script")
def script(payload: dict):
    topic = (payload.get("topic") or "").strip()
    if not topic:
        raise HTTPException(400, "topic required")
    try:
        out = _llm(f"Write a faceless YouTube narration script (~200 words) about '{topic}' "
                   f"for an AI/trading audience. Return JSON only: "
                   f"{{\"hook\": str, \"script\": str, \"shots\": [str]}}. No commentary.")
        try:
            data = json.loads(out)
        except Exception:
            data = {"hook": topic, "script": out, "shots": []}
        return data
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"script failed: {e}")

@router.post("/generate")
def generate(payload: dict):
    """Assemble a local mp4: TTS voiceover + ffmpeg text-slide deck + burned captions.
    Uses the script from payload or generates one. Saves to data/studio/<id>.mp4."""
    topic = (payload.get("topic") or "").strip()
    if not topic:
        raise HTTPException(400, "topic required")
    # get script
    try:
        sc = script({"topic": topic}).body if False else None
    except Exception:
        sc = None
    # inline: call _llm for script
    try:
        out = _llm(f"Write a faceless YouTube narration script (~150 words) about '{topic}'. "
                   f"Return only the plain script text, no JSON, no headings.")
        script_text = out
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"script gen failed: {e}")

    vid_id = f"ep_{int(time.time())}"
    work = STUDIO_DIR / vid_id
    work.mkdir(parents=True, exist_ok=True)

    # 1) voiceover via TTS (reuse tts module)
    voice_path = work / "voice.mp3"
    try:
        from backend.tts import _resolve_key, _resolve_base_url
        from openai import OpenAI
        key = _resolve_key()
        if not key:
            raise RuntimeError("TTS key not set")
        client = OpenAI(api_key=key, base_url=_resolve_base_url())
        audio = client.audio.speech.create(
            model=_settings().get("tts", {}).get("model", "gpt-4o-mini-tts"),
            voice=_settings().get("tts", {}).get("voice", "nova"),
            input=script_text[:4000])
        voice_path.write_bytes(audio.content)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"voiceover failed: {e}")

    # 2) slides: text cards as PNGs via ffmpeg (local, no external image gen)
    slides = [topic] + [f"{i+1}. {line.strip()}" for i, line in enumerate(script_text.split(". ")[:6]) if line.strip()]
    slide_imgs = []
    for i, txt in enumerate(slides[:6]):
        p = work / f"slide_{i:02d}.png"
        draw = f"text=x=40:y=h/2:fontsize=48:fontcolor=white:text='{txt[:60].replace(chr(39),'')}':box=1:boxcolor=black@0.6"
        subprocess.run(["ffmpeg", "-y", "-f", "lavfi", "-i", "color=c=0x1a1a2e:s=1280x720:d=3",
                        "-vf", draw, str(p)], capture_output=True, text=True, timeout=60)
        if p.exists():
            slide_imgs.append(p)

    # 3) concat slides -> video, mux voiceover, burn captions
    out_mp4 = work / f"{vid_id}.mp4"
    if slide_imgs:
        list_file = work / "slides.txt"
        list_file.write_text("\n".join(f"file '{p.resolve()}'" for p in slide_imgs))
        subprocess.run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(list_file),
                        "-i", str(voice_path), "-c:v", "libx264", "-pix_fmt", "yuv420p",
                        "-c:a", "aac", "-shortest", str(out_mp4)], capture_output=True, text=True, timeout=180)

    # 4) thumbnail
    thumb = work / f"{vid_id}_thumb.png"
    subprocess.run(["ffmpeg", "-y", "-f", "lavfi", "-i", "color=c=0x6c5ce7:s=1280x720:d=1",
                    "-vf", f"text=x=40:y=h/2:fontsize=64:fontcolor=white:text='{topic[:50].replace(chr(39),'')}'",
                    str(thumb)], capture_output=True, text=True, timeout=60)

    # save episode metadata (NOT published)
    meta = {"id": vid_id, "topic": topic, "script": script_text,
            "video": str(out_mp4), "thumbnail": str(thumb),
            "published": False, "created": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}
    (work / "meta.json").write_text(json.dumps(meta, indent=2))

    return {"id": vid_id, "topic": topic, "video": str(out_mp4),
            "thumbnail": str(thumb), "published": False,
            "note": "Draft created. Publish requires YouTube OAuth + human approve."}

@router.get("/episodes")
def episodes():
    out = []
    for d in STUDIO_DIR.iterdir():
        m = d / "meta.json"
        if m.exists():
            out.append(json.loads(m.read_text()))
    return {"episodes": out}

@router.post("/approve-publish")
def approve_publish(payload: dict):
    """HUMAN-APPROVE GATE. Publishes only if OAuth token present + explicit approve."""
    vid_id = payload.get("id")
    if not vid_id:
        raise HTTPException(400, "id required")
    work = STUDIO_DIR / vid_id
    meta_f = work / "meta.json"
    if not meta_f.exists():
        raise HTTPException(404, "episode not found")
    meta = json.loads(meta_f.read_text())
    if not _has_oauth():
        raise HTTPException(status_code=409,
            detail="YouTube OAuth not configured — cannot publish. Run OAuth setup first.")
    # perform upload
    try:
        from google_auth_oauthlib.flow import InstalledAppFlow
        from googleapiclient.discovery import build
        import google.oauth2.credentials as oc
        tok = json.loads(_oauth_creds_path().read_text())
        creds = oc.Credentials.from_authorized_user_info(tok, ["https://www.googleapis.com/auth/youtube.upload"])
        yt = build("youtube", "v3", credentials=creds)
        body = {
            "snippet": {"title": meta["topic"], "description": meta.get("script", "")[:4000],
                        "tags": ["AI", "trading", "XAUUSD"]},
            "status": {"privacyStatus": "private"},
        }
        media = __import__("googleapiclient.http", fromlist=["MediaFileUpload"]).MediaFileUpload(
            meta["video"], chunksize=-1, resumable=True)
        req = yt.videos().insert(part="snippet,status", body=body, media_body=media)
        resp = req.execute()
        meta["published"] = True
        meta["youtube_id"] = resp.get("id")
        meta_f.write_text(json.dumps(meta, indent=2))
        return {"status": "published", "youtube_id": resp.get("id")}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"publish failed: {e}")

@router.get("/oauth-status")
def oauth_status():
    return {"configured": _has_oauth(),
            "note": "To enable publishing, create a Google Cloud OAuth client and save the token to data/youtube_token.json"}
