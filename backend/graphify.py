"""
backend/graphify.py — Knowledge-graph ingestion (Track B). Self-contained, stdlib-only.

Indexes the repo into a queryable graph (Graphify-style):
  - nodes: module (.py under backend/), agent (from agents-registry.json), page (dashboard/pages/*.js)
  - edges: module->module (imports via ast), agent->mission (owner), page->module (api wrapper call)
Capability lookup: get_capabilities(agent) -> {agent, modules} where modules are linked nodes.

No pydantic / no external deps. Reads/writes data/intel/graph_nodes.json + graph_edges.json.
Fail-closed: any parse error is skipped, never crashes the build.
"""
import ast
import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA = BASE_DIR / "data"
INTEL = DATA / "intel"
NODES = INTEL / "graph_nodes.json"
EDGES = INTEL / "graph_edges.json"


def _now():
    import time
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def _imports_of(path: Path):
    try:
        tree = ast.parse(path.read_text(encoding="utf-8", errors="ignore"))
    except Exception:
        return []
    mods = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for a in node.names:
                mods.add(a.name.split(".")[0])
        elif isinstance(node, ast.ImportFrom):
            if node.module:
                mods.add(node.module.split(".")[0])
    return mods


def build_graph():
    nodes = []
    edges = []
    nid = {}

    def add_node(kind, name, meta):
        n = {"id": f"{kind}:{name}", "kind": kind, "name": name, "meta": meta, "indexed_at": _now()}
        nodes.append(n)
        nid[n["id"]] = n
        return n

    # modules (backend .py only)
    py_files = [p for p in (BASE_DIR / "backend").glob("*.py") if not p.name.startswith("__")]
    mod_loc = {}
    for f in py_files:
        try:
            loc = sum(1 for _ in open(f, encoding="utf-8", errors="ignore"))
        except Exception:
            loc = 0
        mod_loc[f.stem] = (f, loc)
    for stem, (f, loc) in mod_loc.items():
        add_node("module", stem, {"loc": loc, "path": str(f.relative_to(BASE_DIR))})
    for stem, (f, _) in mod_loc.items():
        for m in _imports_of(f):
            if m in mod_loc and m != stem:
                edges.append({"from": f"module:{stem}", "to": f"module:{m}", "rel": "imports"})

    # agents from registry (shape: {"agents":[...]})
    reg = DATA / "agents-registry.json"
    if reg.exists():
        try:
            agents = json.loads(reg.read_text()).get("agents", [])
        except Exception:
            agents = []
        for a in agents:
            if not isinstance(a, dict):
                continue
            add_node("agent", a.get("name", "?"), {"tier": a.get("tier", ""), "status": a.get("status", "")})

    # missions -> agent edges (owner)
    mfile = DATA / "missions.json"
    if mfile.exists():
        try:
            missions = json.loads(mfile.read_text())
        except Exception:
            missions = []
        for m in missions:
            owner = m.get("owner")
            if owner:
                edges.append({"from": f"agent:{owner}", "to": f"mission:{m.get('id')}", "rel": "owns"})

    # pages
    pages = list((BASE_DIR / "dashboard" / "pages").glob("*.js"))
    for p in pages:
        add_node("page", p.stem, {"path": str(p.relative_to(BASE_DIR))})
        try:
            txt = p.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            txt = ""
        for m in mod_loc:
            if f"api.{m}" in txt and f"module:{m}" in nid:
                edges.append({"from": f"page:{p.stem}", "to": f"module:{m}", "rel": "calls"})

    INTEL.mkdir(parents=True, exist_ok=True)
    NODES.write_text(json.dumps(nodes, indent=2))
    EDGES.write_text(json.dumps(edges, indent=2))
    return {"nodes": len(nodes), "edges": len(edges)}


def get_capabilities(agent_name: str):
    """Return {agent, modules} for capability view. modules = linked module node names."""
    if not NODES.exists():
        build_graph()
    nodes = json.loads(NODES.read_text()) if NODES.exists() else []
    edges = json.loads(EDGES.read_text()) if EDGES.exists() else []
    agent = next((n for n in nodes if n["kind"] == "agent" and n["name"].lower() == agent_name.lower()), None)
    if not agent:
        return None
    linked = [e["to"] for e in edges if e["from"] == agent["id"]]
    mods = [n["name"] for n in nodes if n["id"] in linked and n["kind"] == "module"]
    return {"agent": agent["name"], "tier": agent["meta"].get("tier"), "modules": mods}
