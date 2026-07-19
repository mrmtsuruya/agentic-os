"""
backend/scheduler.py — Simple heartbeat hook for IntelligenceService.
The FastAPI app mounts this module via a background task: on each server start, we call
get_intel() and schedule an hourly refresh. The route /api/intel/refresh will trigger the same call.
"""

import json
from pathlib import Path
from fastapi import APIRouter, BackgroundTasks

router = APIRouter(prefix="/api/intel", tags=["intel"])

BASE_DIR = Path(__file__).resolve().parent.parent
DATA = BASE_DIR / "data"
INTEL_FILE = DATA / "intel_signals.json"

def _load(p: Path):
    if p.exists():
        return json.loads(p.read_text())
    return []

def _save(p: Path, data):
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(data, indent=2))

# Import the collector
from .web_intel import collect_intel

def refresh_intel() -> None:
    """Collect intelligence and store locally (used by /refresh)."""
    res = collect_intel()
    existing = _load(INTEL_FILE)
    existing.extend(res.get("signals", []))  # append new signals
    _save(INTEL_FILE, existing)

@router.get("/refresh")
def get_refresh(background: BackgroundTasks):
    background.add_task(refresh_intel)
    return {"status": "scheduled", "timestamp": int(time.time())}
