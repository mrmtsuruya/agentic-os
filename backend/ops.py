"""
backend/ops.py — Executive Operating System core.

Mission Board (outcome-driven, accountable):
  Each mission = a business outcome with owner, intended result, confidence,
  next decision, escalation path, evidence, and an append-only audit trail.
  Not a fleet monitor — a company operating system.

CEO Brief (decision-first):
  Aggregates what needs a human decision NOW: blocked missions, agents needing
  auth, failed installs, unusual spend, pending approvals, approval deadlines.

Agent Control (safe coordination):
  Per-agent autonomy limits (autonomous | manual | elevated), handoff (reassign
  owner), one-click intervention (pause / resume / escalate), and an audit/replay
  event log so every consequential action is traceable.

No fabrication: every number maps to a real local source (registry, kanban,
missions file, cost file).
"""
import json
import time
import uuid
from pathlib import Path
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

router = APIRouter(prefix="/api/ops", tags=["ops"])

BASE_DIR = Path(__file__).resolve().parent.parent
DATA = BASE_DIR / "data"
MISSIONS = DATA / "missions.json"
AUDIT = DATA / "ops_audit.json"
INTEL_FILE = DATA / "intel" / "signals.json"

AUTONOMY_DEFAULT = "autonomous"  # autonomous | manual | elevated
AGENT_CTRL = {}  # name -> {"autonomy": str, "paused": bool}


def _now():
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def _load(path: Path, default):
    if path.exists():
        try:
            return json.loads(path.read_text())
        except Exception:
            return default
    return default


def _save(path: Path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2))


def _append_audit(event: dict):
    log = _load(AUDIT, [])
    log.append({"ts": _now(), **event})
    if len(log) > 1000:
        log = log[-1000:]
    _save(AUDIT, log)


# ── Missions ───────────────────────────────────────────────────────
class MissionCreate(BaseModel):
    title: str
    owner: str = ""
    intended_result: str = ""
    confidence: float = 0.5
    next_decision: str = ""
    escalation: str = ""
    status: str = "active"  # active | blocked | done | escalated


class MissionUpdate(BaseModel):
    title: str = None
    owner: str = None
    intended_result: str = None
    confidence: float = None
    next_decision: str = None
    escalation: str = None
    status: str = None
    evidence: str = None


@router.get("/missions")
def list_missions():
    return {"missions": _load(MISSIONS, [])}


@router.post("/missions")
def create_mission(m: MissionCreate):
    missions = _load(MISSIONS, [])
    rec = {
        "id": uuid.uuid4().hex[:8],
        "title": m.title,
        "owner": m.owner,
        "intended_result": m.intended_result,
        "confidence": max(0.0, min(1.0, m.confidence)),
        "next_decision": m.next_decision,
        "escalation": m.escalation,
        "status": m.status,
        "evidence": [],
        "audit": [{"ts": _now(), "actor": "human", "action": "created", "detail": m.title}],
        "created": _now(),
        "updated": _now(),
    }
    missions.append(rec)
    _save(MISSIONS, missions)
    _append_audit({"actor": "human", "action": "mission_created", "id": rec["id"], "title": m.title})
    return rec


@router.patch("/missions/{mid}")
def update_mission(mid: str, u: MissionUpdate):
    missions = _load(MISSIONS, [])
    rec = next((x for x in missions if x["id"] == mid), None)
    if not rec:
        raise HTTPException(404, "mission not found")
    for f in ["title", "owner", "intended_result", "next_decision", "escalation", "status"]:
        v = getattr(u, f, None)
        if v is not None:
            rec[f] = v
    if u.confidence is not None:
        rec["confidence"] = max(0.0, min(1.0, u.confidence))
    if u.evidence:
        rec["evidence"].append({"ts": _now(), "note": u.evidence})
    rec["updated"] = _now()
    rec["audit"].append({"ts": _now(), "actor": "human", "action": "updated",
                          "detail": f"owner={rec['owner']} status={rec['status']} conf={rec['confidence']}"})
    _save(MISSIONS, missions)
    _append_audit({"actor": "human", "action": "mission_updated", "id": mid})
    return rec


@router.post("/missions/{mid}/handoff")
def handoff(mid: str, payload: dict):
    """Reassign owner (ownership transfer) — logged in audit."""
    to = payload.get("to", "")
    if not to:
        raise HTTPException(400, "to required")
    missions = _load(MISSIONS, [])
    rec = next((x for x in missions if x["id"] == mid), None)
    if not rec:
        raise HTTPException(404, "mission not found")
    prev = rec["owner"]
    rec["owner"] = to
    rec["audit"].append({"ts": _now(), "actor": "human", "action": "handoff",
                          "detail": f"{prev or 'unassigned'} -> {to}"})
    rec["updated"] = _now()
    _save(MISSIONS, missions)
    _append_audit({"actor": "human", "action": "handoff", "id": mid, "from": prev, "to": to})
    return rec


@router.post("/missions/{mid}/intervene")
def intervene(mid: str, payload: dict):
    """One-click intervention: pause | resume | escalate | close."""
    action = payload.get("action", "")
    if action not in ("pause", "resume", "escalate", "close"):
        raise HTTPException(400, "action must be pause|resume|escalate|close")
    missions = _load(MISSIONS, [])
    rec = next((x for x in missions if x["id"] == mid), None)
    if not rec:
        raise HTTPException(404, "mission not found")
    if action == "pause":
        rec["status"] = "blocked"
    elif action == "resume":
        rec["status"] = "active"
    elif action == "escalate":
        rec["status"] = "escalated"
    elif action == "close":
        rec["status"] = "done"
    rec["audit"].append({"ts": _now(), "actor": "human", "action": f"intervene:{action}"})
    rec["updated"] = _now()
    _save(MISSIONS, missions)
    _append_audit({"actor": "human", "action": f"intervene:{action}", "id": mid})
    return rec


# ── Agent control ──────────────────────────────────────────────────
@router.get("/agent-control")
def agent_control():
    from backend.agents import _registry, _detect_one
    out = []
    for s in _registry().get("agents", []):
        d = _detect_one(s)
        ctl = AGENT_CTRL.get(d["name"], {})
        out.append({
            "name": d["name"], "status": d["status"], "tier": d["tier"],
            "autonomy": ctl.get("autonomy", AUTONOMY_DEFAULT),
            "paused": ctl.get("paused", False),
        })
    return {"agents": out}


@router.post("/agent-control/{name}")
def set_agent_control(name: str, payload: dict):
    if "autonomy" in payload and payload["autonomy"] not in ("autonomous", "manual", "elevated"):
        raise HTTPException(400, "autonomy must be autonomous|manual|elevated")
    cur = AGENT_CTRL.get(name, {"autonomy": AUTONOMY_DEFAULT, "paused": False})
    if "autonomy" in payload:
        cur["autonomy"] = payload["autonomy"]
    if "paused" in payload:
        cur["paused"] = bool(payload["paused"])
    AGENT_CTRL[name] = cur
    _append_audit({"actor": "human", "action": "agent_control", "agent": name, **cur})
    return {"name": name, **cur}


# ── CEO Brief (decision-first) ─────────────────────────────────────
@router.get("/brief")
def ceo_brief():
    items = []  # each: {severity, kind, title, detail, action}

    # 1) blocked / escalated missions
    missions = _load(MISSIONS, [])
    for m in missions:
        if m.get("status") == "blocked":
            items.append({"severity": "high", "kind": "blocked_mission",
                          "title": f"Mission blocked: {m['title']}",
                          "detail": f"owner {m.get('owner') or 'unassigned'} — {m.get('next_decision') or 'no next decision set'}",
                          "ref": m["id"]})
        elif m.get("status") == "escalated":
            items.append({"severity": "critical", "kind": "escalated_mission",
                          "title": f"Mission ESCALATED: {m['title']}",
                          "detail": f"owner {m.get('owner') or 'unassigned'} — escalation: {m.get('escalation') or 'n/a'}",
                          "ref": m["id"]})

    # 2) agents needing auth (can't operate)
    from backend.agents import _registry, _detect_one
    for s in _registry().get("agents", []):
        d = _detect_one(s)
        if d["status"] == "needs_auth":
            items.append({"severity": "medium", "kind": "agent_needs_auth",
                          "title": f"{d['name']} needs auth",
                          "detail": "Installed but no API key — cannot execute tasks.",
                          "ref": d["name"]})
        elif d["status"] == "missing":
            items.append({"severity": "low", "kind": "agent_missing",
                          "title": f"{d['name']} not installed",
                          "detail": "Not available for delegation.", "ref": d["name"]})

    # 3) paused agents (autonomy reduced)
    for nm, ctl in AGENT_CTRL.items():
        if ctl.get("paused"):
            items.append({"severity": "medium", "kind": "agent_paused",
                          "title": f"{nm} paused by operator",
                          "detail": "Autonomy suspended — needs resume to act.", "ref": nm})

    # 4) unusual spend (cost > threshold)
    costs = _load(BASE_DIR / "data" / "agent_costs.json", {})
    for nm, c in costs.items():
        spent = float(c.get("spent", 0.0))
        if spent > 5.0:
            items.append({"severity": "medium", "kind": "unusual_spend",
                          "title": f"Unusual spend: {nm}",
                          "detail": f"${spent:.2f} accrued", "ref": nm})

    # 5) pending Studio approvals (human-approve gate)
    studio = BASE_DIR / "data" / "studio"
    if studio.exists():
        for d in studio.iterdir():
            meta = d / "meta.json"
            if meta.exists():
                em = json.loads(meta.read_text())
                if not em.get("published"):
                    items.append({"severity": "low", "kind": "pending_publish",
                                  "title": f"Video draft awaiting publish: {em.get('topic')}",
                                  "detail": "Human approval required before YouTube upload.",
                                  "ref": em.get("id")})

    sev_rank = {"critical": 0, "high": 1, "medium": 2, "low": 3}

    try:
        from backend.intel import _load as _iload, INTEL_DIR
        raw = _iload(INTEL_DIR / "signals.json", [])
        sigs = raw.get("signals", []) if isinstance(raw, dict) else (raw or [])
        for s in sigs:
            items.append({"severity": s.get("severity", "low"), "kind": "external_signal",
                          "title": f"[ext] {s.get('title', '')}",
                          "detail": f"{s.get('kind', 'news')} · {s.get('source', 'seed')}"
                                    + (f" · affects mission {s.get('related_mission')}" if s.get("related_mission") else ""),
                          "ref": s.get("id")})
    except Exception:
        pass

    sev_rank = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    items.sort(key=lambda x: sev_rank.get(x["severity"], 9))
    return {
        "generated": _now(),
        "count": len(items),
        "decisions": items,
        "summary": {
            "critical": sum(1 for i in items if i["severity"] == "critical"),
            "high": sum(1 for i in items if i["severity"] == "high"),
            "medium": sum(1 for i in items if i["severity"] == "medium"),
            "low": sum(1 for i in items if i["severity"] == "low"),
        },
    }


@router.get("/audit")
def get_audit(limit: int = 50):
    log = _load(AUDIT, [])
    return {"audit": log[-limit:]}
