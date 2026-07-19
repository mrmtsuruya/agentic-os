"""
backend/panel.py — P3 Multi-Agent Brainstorm Panel.

Fan-out one prompt to every DETECTED + online agent CLI (from the P2 registry
discovery), run them, and return their responses side-by-side. Reuses the
server's execute_agent() so each agent's CLI invocation matches the chat path.
"""
import json
from pathlib import Path
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

router = APIRouter(prefix="/api/panel", tags=["panel"])

BASE_DIR = Path(__file__).resolve().parent.parent


def _discover_online() -> list:
    """Call the agents discovery logic inline (avoid import cycle)."""
    try:
        from backend.agents import _registry, _detect_one
        specs = _registry().get("agents", [])
        return [s["name"] for s in specs if _detect_one(s)["status"] == "online"]
    except Exception:
        return []


class BroadcastRequest(BaseModel):
    prompt: str
    agents: list = []  # optional explicit subset; empty = all online


@router.post("/broadcast")
def broadcast(req: BroadcastRequest):
    prompt = (req.prompt or "").strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="prompt required")
    if len(prompt) > 10000:
        raise HTTPException(status_code=400, detail="prompt too long")

    # Import execute_agent lazily from server module
    import importlib
    server = importlib.import_module("server")
    execute_agent = getattr(server, "execute_agent", None)
    if execute_agent is None:
        raise HTTPException(status_code=500, detail="agent executor unavailable")

    targets = req.agents if req.agents else _discover_online()
    if not targets:
        return {"agents": [], "note": "no online agents detected"}

    results = []
    for name in targets:
        try:
            out = execute_agent(name, prompt)
            results.append({"agent": name, "status": "ok", "response": out})
        except Exception as e:
            results.append({"agent": name, "status": "error", "response": str(e)})

    return {"prompt": prompt, "agents": results, "count": len(results)}
