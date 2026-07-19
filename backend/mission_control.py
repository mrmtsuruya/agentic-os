"""
backend/mission_control.py — B: Mission Control aggregation.

Per-agent operational view: status (from registry), active/done tasks (from Kanban,
matched by assignee), issues (blocked tasks), goals (done tasks), and a local cost
accumulator (honest baseline — extendable to a real billing API later). No fabricated
external data: every number maps to a real local source.
"""
import json
from pathlib import Path
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/mission-control", tags=["mission-control"])

BASE_DIR = Path(__file__).resolve().parent.parent
KANBAN_DIR = BASE_DIR / "data" / "kanban"
COST_FILE = BASE_DIR / "data" / "agent_costs.json"


def _agents() -> list:
    from backend.agents import _registry, _detect_one
    return [_detect_one(s) for s in _registry().get("agents", [])]


def _kanban_tasks() -> list:
    tasks = []
    if KANBAN_DIR.exists():
        for p in KANBAN_DIR.glob("*.json"):
            try:
                tasks.append(json.loads(p.read_text()))
            except Exception:
                pass
    return tasks


def _costs() -> dict:
    if COST_FILE.exists():
        try:
            return json.loads(COST_FILE.read_text())
        except Exception:
            pass
    return {}


@router.get("/overview")
def overview():
    agents = _agents()
    tasks = _kanban_tasks()
    costs = _costs()
    rows = []
    total_active = total_done = total_issues = 0
    for a in agents:
        name = a["name"]
        a_tasks = [t for t in tasks if (t.get("assignee") or "").lower() == name.lower()]
        active = [t for t in a_tasks if t.get("status") in ("todo", "ready", "in_progress")]
        done = [t for t in a_tasks if t.get("status") == "done"]
        issues = [t for t in a_tasks if t.get("status") == "blocked"]
        c = costs.get(name, {"spent": 0.0, "tasks": 0})
        rows.append({
            "name": name,
            "label": a["label"],
            "status": a["status"],
            "tier": a["tier"],
            "active": len(active),
            "done": len(done),
            "issues": len(issues),
            "spent": round(float(c.get("spent", 0.0)), 4),
            "active_tasks": [{"id": t["id"], "title": t.get("title", ""), "status": t.get("status")} for t in active[:5]],
            "done_tasks": [{"id": t["id"], "title": t.get("title", "")} for t in done[:5]],
        })
        total_active += len(active)
        total_done += len(done)
        total_issues += len(issues)
    return {
        "agents": rows,
        "totals": {"online": sum(1 for a in agents if a["status"] == "online"),
                   "active": total_active, "done": total_done, "issues": total_issues},
    }


@router.post("/log-cost")
def log_cost(payload: dict):
    """Local cost accumulator (honest baseline). Called by worker when it runs a task."""
    name = payload.get("agent")
    amount = float(payload.get("amount", 0.0))
    if not name:
        raise HTTPException(400, "agent required")
    costs = _costs()
    cur = costs.get(name, {"spent": 0.0, "tasks": 0})
    cur["spent"] = round(float(cur.get("spent", 0.0)) + amount, 4)
    cur["tasks"] = int(cur.get("tasks", 0)) + 1
    costs[name] = cur
    COST_FILE.write_text(json.dumps(costs, indent=2))
    return {"status": "ok", "agent": name, "spent": cur["spent"]}
