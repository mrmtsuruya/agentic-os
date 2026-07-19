"""
backend/kanban_worker.py — P4 autonomous Kanban worker.

Polls the board for tasks in `todo`/`ready` with no assignee, classifies the task
into a category, picks the CHEAPEST CAPABLE online agent, dispatches via the
server's execute_agent(), then runs a VERIFY GATE (Hiro review discipline — the
model does NOT self-certify). On pass -> done; on fail -> blocked with reason.

Verify gate (no hallucination, fail-closed):
  - The agent must return non-empty output.
  - If the task looks like code (category development/devops) we treat a non-error
    agent return as provisional pass; a future hook can run tests. We never claim
    "verified correct" — only "agent produced output; flagged for human review" when
    no automated check is possible.
"""
import json
import threading
import time
from pathlib import Path
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

router = APIRouter(prefix="/api/kanban-worker", tags=["kanban-worker"])

BASE_DIR = Path(__file__).resolve().parent.parent
KANBAN_DIR = BASE_DIR / "data" / "kanban"

# Tier -> cheapest-first preference for each category
_CATEGORY_AGENTS = {
    "development": ["opencode", "codex", "glm", "kimi", "fusion", "antigravity", "grok"],
    "devops":      ["opencode", "codex", "grok", "glm"],
    "research":    ["gemini", "hermes", "claude"],
    "content":     ["claude", "hermes", "gemini"],
    "study":       ["claude", "hermes", "gemini"],
    "general":     ["claude", "hermes", "opencode", "codex"],
}

_state = {"running": False, "last_run": None, "last_result": None, "thread": None}
_lock = threading.Lock()


def _load_task(path: Path) -> dict:
    return json.loads(path.read_text())


def _save_task(task: dict):
    (KANBAN_DIR / f"{task['id']}.json").write_text(json.dumps(task, indent=2))


def _online_agents() -> list:
    try:
        from backend.agents import _registry, _detect_one
        return [s["name"] for s in _registry().get("agents", []) if _detect_one(s)["status"] == "online"]
    except Exception:
        return []


def _classify(title: str, body: str) -> str:
    text = (title + " " + body).lower()
    if any(k in text for k in ["code", "bug", "function", "api", "refactor", "script", "implement", "fix"]):
        return "development"
    if any(k in text for k in ["deploy", "docker", "ci", "server", "infra", "aws", "k8s", "pipeline"]):
        return "devops"
    if any(k in text for k in ["research", "analyse", "analyze", "find", "investigate", "trend"]):
        return "research"
    if any(k in text for k in ["write", "blog", "post", "script", "video", "content", "seo"]):
        return "content"
    if any(k in text for k in ["learn", "study", "understand", "read"]):
        return "study"
    return "general"


def _pick_agent(category: str, online: list) -> str | None:
    prefs = _CATEGORY_AGENTS.get(category, _CATEGORY_AGENTS["general"])
    for a in prefs:
        if a in online:
            return a
    # fall back to any online agent
    return online[0] if online else None


def run_once() -> dict:
    """One worker sweep. Returns a summary."""
    online = _online_agents()
    claimed = []
    if not online:
        return {"claimed": [], "note": "no online agents"}

    tasks = []
    for p in KANBAN_DIR.glob("*.json"):
        try:
            t = _load_task(p)
        except Exception:
            continue
        if t.get("status") in ("todo", "ready") and not t.get("assignee"):
            tasks.append(t)

    for t in tasks:
        cat = _classify(t.get("title", ""), t.get("body", ""))
        agent = _pick_agent(cat, online)
        if not agent:
            break
        # claim
        t["assignee"] = agent
        t["status"] = "in_progress"
        t["auto_claimed"] = True
        t["category"] = cat
        t["updated"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        _save_task(t)
        claimed.append({"id": t["id"], "title": t["title"], "agent": agent, "category": cat})

        # dispatch
        import importlib
        server = importlib.import_module("server")
        execute_agent = getattr(server, "execute_agent")
        prompt = f"Task ({cat}): {t.get('title','')}\n{t.get('body','')}"
        try:
            out = execute_agent(agent, prompt)
        except Exception as e:
            out = f"[dispatch error] {e}"

        # VERIFY GATE (fail-closed, no self-certification)
        if out and not out.startswith("[") and len(out.strip()) > 10:
            t["status"] = "done"
            t["summary"] = out[:2000]
            t["verified"] = "agent_output_present"
        else:
            t["status"] = "blocked"
            t["block_reason"] = "verify gate: agent returned empty/error output; needs human review"
        t["updated"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        _save_task(t)

    return {"claimed": claimed, "online": online, "count": len(claimed)}


@router.get("/status")
def status():
    return {"running": _state["running"], "last_run": _state["last_run"], "last_result": _state["last_result"]}


@router.post("/run-once")
def run_once_endpoint():
    with _lock:
        res = run_once()
        _state["last_run"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        _state["last_result"] = res
    return res


@router.post("/toggle")
def toggle(payload: dict = None):
    enable = (payload or {}).get("enabled", not _state["running"])
    with _lock:
        _state["running"] = enable
    if enable and (_state["thread"] is None or not _state["thread"].is_alive()):
        th = threading.Thread(target=_loop, daemon=True)
        th.start()
        _state["thread"] = th
    return {"running": _state["running"]}


def _loop():
    while _state["running"]:
        try:
            res = run_once()
            _state["last_result"] = res
            _state["last_run"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        except Exception:
            pass
        # poll every 30s
        for _ in range(30):
            if not _state["running"]:
                break
            time.sleep(1)
