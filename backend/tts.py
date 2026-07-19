"""
backend/tts.py — Text-to-Speech endpoint for Agentic OS.

Uses OpenAI-compatible TTS (gpt-4o-mini-tts via Nous subscription by default).
Key resolution order:
  1. settings.json -> tts.api_key (or NOUS_OPENAI_KEY / OPENAI_API_KEY)
  2. env NOUS_OPENAI_KEY / OPENAI_API_KEY
Fails closed with a clear JSON error if no key is configured (never fabricates audio).
"""
import os
import json
from pathlib import Path
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel

router = APIRouter(prefix="/api/tts", tags=["tts"])

BASE_DIR = Path(__file__).resolve().parent.parent


def _settings() -> dict:
    try:
        f = BASE_DIR / "data" / "settings.json"
        if f.exists():
            return json.loads(f.read_text())
    except Exception:
        pass
    return {}


def _resolve_key() -> str | None:
    s = _settings().get("tts", {})
    for candidate in (
        s.get("api_key"),
        os.environ.get("NOUS_OPENAI_KEY"),
        os.environ.get("OPENAI_API_KEY"),
    ):
        if candidate:
            return candidate
    return None


def _resolve_base_url() -> str:
    # Nous subscription exposes an OpenAI-compatible TTS endpoint when set,
    # otherwise fall back to OpenAI directly.
    return os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1")


class TTSRequest(BaseModel):
    text: str
    voice: str | None = None
    model: str | None = None


@router.post("")
def tts(req: TTSRequest):
    key = _resolve_key()
    if not key:
        raise HTTPException(
            status_code=503,
            detail="TTS not configured: set tts.api_key (or env NOUS_OPENAI_KEY/OPENAI_API_KEY) in data/settings.json",
        )
    if not req.text or not req.text.strip():
        raise HTTPException(status_code=400, detail="text is required")

    s = _settings().get("tts", {})
    model = req.model or s.get("model", "gpt-4o-mini-tts")
    voice = req.voice or s.get("voice", "nova")

    try:
        from openai import OpenAI
    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="openai package not installed (add to requirements.txt)",
        )

    try:
        client = OpenAI(api_key=key, base_url=_resolve_base_url())
        resp = client.audio.speech.create(model=model, voice=voice, input=req.text[:4000])
        return Response(content=resp.content, media_type="audio/mpeg")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"TTS upstream error: {e}")
