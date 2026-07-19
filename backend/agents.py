"""
backend/agents.py — P2 Agent Registry.

Auto-detect installed cloud-agent CLIs, 1-click install missing ones, and
auto-remediate (stale/crash). All shell work runs under `bash -lc "..."`
so POSIX `command -v` works on Windows (git-bash). Install/fix run as
tracked background subprocesses; their output is buffered and served via
GET /api/agents/log?name=... for live UI streaming.
"""
import json
import os
import subprocess
import threading
from pathlib import Path
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/api/agents", tags=["agents"])

BASE_DIR = Path(__file__).resolve().parent.parent
_REGISTRY_CACHE = None
_INSTALL_LOGS = {}  # name -> list[str]
_INSTALL_LOCK = threading.Lock()


def _registry() -> dict:
    global _REGISTRY_CACHE
    if _REGISTRY_CACHE is None:
        f = BASE_DIR / "data" / "agents-registry.json"
        if f.exists():
            _REGISTRY_CACHE = json.loads(f.read_text())
        else:
            _REGISTRY_CACHE = {"agents": []}
    return _REGISTRY_CACHE


def _run(cmd: str, timeout: int = 20) -> tuple[int, str]:
    """Run a POSIX command via git-bash; returns (rc, combined_output)."""
    try:
        r = subprocess.run(
            ["bash", "-lc", cmd], capture_output=True, text=True, timeout=timeout,
            cwd=str(BASE_DIR),
        )
        out = (r.stdout or "") + (r.stderr or "")
        return r.returncode, out.strip()
    except subprocess.TimeoutExpired:
        return 124, "timeout"
    except Exception as e:  # pragma: no cover
        return 1, str(e)


def _detect_one(spec: dict) -> dict:
    rc, _ = _run(spec["detect_cmd"], timeout=10)
    installed = rc == 0
    needs_auth = False
    if installed and spec.get("auth_check"):
        rc_a, _ = _run(spec["auth_check"], timeout=10)
        needs_auth = rc_a != 0
    return {
        "name": spec["name"],
        "label": spec.get("label", spec["name"]),
        "tier": spec.get("tier", ""),
        "installed": installed,
        "needs_auth": needs_auth,
        "status": "online" if installed and not needs_auth else ("needs_auth" if installed else "missing"),
    }


@router.get("/discover")
def discover():
    specs = _registry().get("agents", [])
    results = [_detect_one(s) for s in specs]
    return {"agents": results, "total": len(results),
            "online": sum(1 for a in results if a["status"] == "online")}


@router.get("/status")
def status():
    return discover()


@router.post("/install")
def install(payload: dict):
    name = payload.get("name")
    spec = next((s for s in _registry().get("agents", []) if s["name"] == name), None)
    if not spec:
        raise HTTPException(status_code=404, detail=f"unknown agent {name}")
    if spec.get("install"):
        # fire-and-forget tracked install
        t = threading.Thread(target=_run_install, args=(spec,), daemon=True)
        t.start()
        return {"status": "install_started", "name": name}
    raise HTTPException(status_code=400, detail="no install recipe for this agent")


@router.post("/fix")
def fix(payload: dict):
    name = payload.get("name")
    kind = payload.get("kind", "stale")
    spec = next((s for s in _registry().get("agents", []) if s["name"] == name), None)
    if not spec:
        raise HTTPException(status_code=404, detail=f"unknown agent {name}")
    recipe = (spec.get("remediation") or {}).get(kind) or spec.get("install")
    if not recipe:
        raise HTTPException(status_code=400, detail="no remediation recipe")
    t = threading.Thread(target=_run_install, args=(spec, recipe, kind), daemon=True)
    t.start()
    return {"status": "fix_started", "name": name, "kind": kind}


def _run_install(spec: dict, recipe: str = None, kind: str = "install"):
    cmd = recipe or spec.get("install")
    name = spec["name"]
    with _INSTALL_LOCK:
        _INSTALL_LOGS[name] = []
    def log(line: str):
        with _INSTALL_LOCK:
            _INSTALL_LOGS.setdefault(name, []).append(line)
            if len(_INSTALL_LOGS[name]) > 200:
                _INSTALL_LOGS[name] = _INSTALL_LOGS[name][-200:]
    log(f"$ {cmd}")
    try:
        proc = subprocess.Popen(
            ["bash", "-lc", cmd], stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
            text=True, cwd=str(BASE_DIR),
        )
        for line in proc.stdout:
            log(line.rstrip("\n"))
        proc.wait(timeout=300)
        log(f"exit={proc.returncode}")
    except Exception as e:
        log(f"error: {e}")


@router.get("/log")
def install_log(name: str = Query(...)):
    with _INSTALL_LOCK:
        return {"name": name, "log": _INSTALL_LOGS.get(name, [])}
