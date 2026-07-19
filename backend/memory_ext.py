"""
backend/memory_ext.py — Obsidian-vault memory with OmniMemory failover.

Primary: markdown files in the Obsidian vault path (data/settings.json -> obsidian.path).
Failover: if Obsidian path missing/empty, fall back to OmniMemory REST API
          (data/settings.json -> obsidian.omnimemory_url, default http://localhost:8001).

Dual-write: on save, write to Obsidian AND optionally sync to OmniMemory
            (obsidian.failover_to_omnimemory = true). Fail-open on OmniMemory error.
"""
import json
import os
from pathlib import Path
from urllib import request as urllib_request
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/api/memory", tags=["memory-ext"])

BASE_DIR = Path(__file__).resolve().parent.parent


def _obsidian_cfg() -> dict:
    try:
        f = BASE_DIR / "data" / "settings.json"
        if f.exists():
            d = json.loads(f.read_text())
            return d.get("obsidian", {})
    except Exception:
        pass
    return {}


def _vault_path() -> Path | None:
    p = _obsidian_cfg().get("path")
    if not p:
        return None
    pp = Path(p)
    return pp if pp.exists() else None


def _list_vault_notes() -> list:
    vp = _vault_path()
    if not vp:
        return []
    out = []
    for md in vp.rglob("*.md"):
        rel = md.relative_to(vp)
        out.append({"name": str(rel), "size": md.stat().st_size})
    return out


@router.get("/obsidian")
def obsidian_status():
    cfg = _obsidian_cfg()
    vp = _vault_path()
    notes = _list_vault_notes() if vp else []
    return {
        "configured_path": cfg.get("path"),
        "vault_exists": vp is not None,
        "note_count": len(notes),
        "failover_to_omnimemory": cfg.get("failover_to_omnimemory", False),
        "omnimemory_url": cfg.get("omnimemory_url", "http://localhost:8001"),
        "notes": notes[:200],
    }


@router.get("/obsidian/note")
def read_note(name: str = Query(...)):
    vp = _vault_path()
    if not vp:
        # Failover read from OmniMemory
        return _omnimemory_read(name)
    target = (vp / name).resolve()
    if not str(target).startswith(str(vp.resolve())):
        raise HTTPException(status_code=400, detail="path escapes vault")
    if not target.exists():
        return _omnimemory_read(name)
    return {"name": name, "content": target.read_text(encoding="utf-8"), "source": "obsidian"}


@router.post("/obsidian/note")
def write_note(payload: dict):
    name = payload.get("name")
    content = payload.get("content", "")
    if not name:
        raise HTTPException(status_code=400, detail="name required")
    vp = _vault_path()
    if not vp:
        raise HTTPException(status_code=409, detail="obsidian path not configured")
    target = (vp / name).resolve()
    if not str(target).startswith(str(vp.resolve())):
        raise HTTPException(status_code=400, detail="path escapes vault")
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")

    # Dual-write to OmniMemory (fail-open)
    if _obsidian_cfg().get("failover_to_omnimemory"):
        _omnimemory_write(name, content)
    return {"status": "ok", "name": name, "source": "obsidian"}


def _omnimemory_url() -> str:
    return _obsidian_cfg().get("omnimemory_url", "http://localhost:8001")


def _omnimemory_read(name: str):
    try:
        url = f"{_omnimemory_url()}/api/memories?query={urllib_request.quote(name)}"
        with urllib_request.urlopen(url, timeout=5) as r:
            data = json.loads(r.read().decode())
        return {"name": name, "content": json.dumps(data), "source": "omnimemory"}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"OmniMemory failover read failed: {e}")


def _omnimemory_write(name: str, content: str):
    try:
        url = f"{_omnimemory_url()}/api/memories"
        body = json.dumps({"app_id": "agentic-os", "user_id": "local", "notes": [{"key": name, "value": content}]}).encode()
        req = urllib_request.Request(url, data=body, headers={"Content-Type": "application/json"})
        urllib_request.urlopen(req, timeout=5)
    except Exception as e:
        # fail-open: Obsidian write already succeeded
        print(f"[omnimemory] dual-write skipped: {e}")
