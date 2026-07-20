"""
backend/intel.py — Intelligence layer router (Track B).

Exposes the API the dashboard's Intelligence page expects:
  /api/intel/signals            GET list, POST add
  /api/intel/refresh            GET re-collect (count)
  /api/intel/research           POST track a research signal
  /api/intel/graph/nodes        GET knowledge-graph nodes+edges
  /api/intel/graph/lookup?q=    GET node + capability lookup
  /api/intel/graph/build        GET re-index repo graph
  /api/intel/plugins            GET list, POST register
  /api/intel/plugins/{id}/enable   POST
  /api/intel/plugins/{id}/disable   POST
  /api/intel/plugins/audit      GET trust-gate audit

Stdlib + FastAPI only. Fail-closed: any parse error returns [] / {}, never 500s the app.
"""
import json
import time
import uuid
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query, Request

from backend import graphify

router = APIRouter(prefix="/api/intel", tags=["intel"])

BASE_DIR = Path(__file__).resolve().parent.parent
INTEL_DIR = BASE_DIR / "data" / "intel"
SIGNALS_FILE = INTEL_DIR / "signals.json"
PLUGINS_FILE = INTEL_DIR / "plugins.json"


# ─── persistence helpers (fail-closed) ────────────────────────────────
def _read_json(path: Path, default):
    try:
        if not path.exists():
            return default
        return json.loads(path.read_text(encoding="utf-8", errors="ignore"))
    except Exception:
        return default


def _write_json(path: Path, data):
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(data, indent=2), encoding="utf-8")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"write failed: {e}")


def _now():
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


# ─── signals ───────────────────────────────────────────────────────────
@router.get("/signals")
def get_signals():
    data = _read_json(SIGNALS_FILE, {"signals": []})
    return {"signals": data.get("signals", [])}


@router.post("/signals")
async def add_signal(request: Request):
    try:
        body = await request.json()
    except Exception:
        body = {}
    if not isinstance(body, dict):
        raise HTTPException(status_code=400, detail="body must be an object")
    sig = {
        "id": uuid.uuid4().hex[:8],
        "title": str(body.get("title", "Untitled signal"))[:200],
        "summary": str(body.get("summary", ""))[:1000],
        "source": str(body.get("source", "manual"))[:40],
        "severity": str(body.get("severity", "low"))[:12],
        "kind": str(body.get("kind", "manual"))[:40],
        "related_mission": str(body.get("related_mission", ""))[:80],
        "confidence_delta": float(body.get("confidence_delta", 0.0)),
        "retrieved_at": _now(),
    }
    data = _read_json(SIGNALS_FILE, {"signals": []})
    data.setdefault("signals", []).append(sig)
    _write_json(SIGNALS_FILE, data)
    return {"signals": data["signals"], "id": sig["id"]}


@router.get("/refresh")
def refresh_signals():
    # No external feed configured here; re-read persisted signals.
    data = _read_json(SIGNALS_FILE, {"signals": []})
    collected = len(data.get("signals", []))
    return {"collected": collected, "refreshed_at": _now()}


@router.post("/research")
async def research_signal(request: Request):
    try:
        body = await request.json()
    except Exception:
        body = {}
    query = str(body.get("query", "")).strip()
    if not query:
        raise HTTPException(status_code=400, detail="query required")
    rel = body.get("related_mission", "")
    rel_suffix = f" (mission {rel})" if rel else ""
    sig = {
        "id": uuid.uuid4().hex[:8],
        "title": f"Research: {query[:160]}",
        "summary": f"Tracked research query{rel_suffix}",
        "source": "research",
        "severity": "medium",
        "kind": "research",
        "related_mission": str(body.get("related_mission", "")),
        "confidence_delta": 0.0,
        "retrieved_at": _now(),
    }
    data = _read_json(SIGNALS_FILE, {"signals": []})
    data.setdefault("signals", []).append(sig)
    _write_json(SIGNALS_FILE, data)
    return {"id": sig["id"], "status": "tracked"}


# ─── knowledge graph (Graphify) ────────────────────────────────────────
@router.get("/graph/nodes")
def graph_nodes():
    nodes = _read_json(INTEL_DIR / "graph_nodes.json", [])
    edges = _read_json(INTEL_DIR / "graph_edges.json", [])
    return {"nodes": nodes, "edges": edges}


@router.get("/graph/lookup")
def graph_lookup(q: str = Query("", description="agent or module name")):
    if not q or not q.strip():
        raise HTTPException(status_code=400, detail="q required")
    ql = q.strip().lower()
    nodes = _read_json(INTEL_DIR / "graph_nodes.json", [])
    matches = [n for n in nodes if ql in str(n.get("name", "")).lower()]
    # capability lookup if an agent node matches closely
    caps = None
    for n in matches:
        if n.get("kind") == "agent":
            caps = graphify.get_capabilities(n.get("name", ""))
            if caps:
                break
    return {"query": q, "nodes": matches, "capabilities": caps}


@router.get("/graph/build")
def graph_build():
    try:
        result = graphify.build_graph()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"graph build failed: {e}")
    return {"nodes": result.get("nodes", 0), "edges": result.get("edges", 0),
            "built_at": _now()}


# ─── plugins (trust gate) ──────────────────────────────────────────────
@router.get("/plugins")
def get_plugins():
    plugins = _read_json(PLUGINS_FILE, [])
    return {"plugins": plugins if isinstance(plugins, list) else []}


@router.post("/plugins")
async def register_plugin(request: Request):
    try:
        body = await request.json()
    except Exception:
        body = {}
    if not isinstance(body, dict) or not body.get("name"):
        raise HTTPException(status_code=400, detail="name required")
    plugins = _read_json(PLUGINS_FILE, [])
    if not isinstance(plugins, list):
        plugins = []
    plugin = {
        "id": uuid.uuid4().hex[:8],
        "name": str(body["name"])[:80],
        "version": str(body.get("version", "0.1.0"))[:32],
        "author": str(body.get("author", "—"))[:80],
        "signature": str(body.get("signature", ""))[:128],
        "capabilities": body.get("capabilities", []) if isinstance(body.get("capabilities"), list) else [],
        "sandbox": bool(body.get("sandbox", True)),
        "enabled": False,
        "registered_at": _now(),
    }
    plugins.append(plugin)
    _write_json(PLUGINS_FILE, plugins)
    return {"plugins": plugins, "id": plugin["id"]}


def _toggle_plugin(pid: str, enable: bool):
    plugins = _read_json(PLUGINS_FILE, [])
    if not isinstance(plugins, list):
        raise HTTPException(status_code=404, detail="no plugins")
    found = next((p for p in plugins if p.get("id") == pid), None)
    if not found:
        raise HTTPException(status_code=404, detail="plugin not found")
    # trust gate: refuse to enable an unsigned plugin
    if enable and not found.get("signature"):
        raise HTTPException(status_code=423, detail="blocked: unsigned plugin cannot be enabled")
    found["enabled"] = enable
    found["enabled_at"] = _now() if enable else None
    _write_json(PLUGINS_FILE, plugins)
    return {"plugins": plugins, "id": pid, "enabled": enable}


@router.post("/plugins/{pid}/enable")
def enable_plugin(pid: str):
    return _toggle_plugin(pid, True)


@router.post("/plugins/{pid}/disable")
def disable_plugin(pid: str):
    return _toggle_plugin(pid, False)


@router.get("/plugins/audit")
def plugin_audit():
    plugins = _read_json(PLUGINS_FILE, [])
    if not isinstance(plugins, list):
        plugins = []
    total = len(plugins)
    enabled = sum(1 for p in plugins if p.get("enabled"))
    blocked = [p.get("id") for p in plugins if not p.get("signature")]
    return {"total": total, "enabled": enabled, "blocked": blocked}
