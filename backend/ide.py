"""
backend/ide.py — P3 IDE tab.

- REST: safe file read/write under a sandboxed root (the project dir by default).
- WebSocket /ws/pty: a real Windows PTY via pywinpty so xterm.js gets a real
  shell (cmd/bash) with a prompt, not a flat subprocess stream.
"""
import os
from pathlib import Path
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

router = APIRouter(prefix="/api/ide", tags=["ide"])

BASE_DIR = Path(__file__).resolve().parent.parent
ROOT = BASE_DIR  # sandbox root = project dir


def _safe(path: str) -> Path:
    p = (ROOT / path).resolve()
    if not str(p).startswith(str(ROOT.resolve())):
        raise HTTPException(status_code=400, detail="path escapes sandbox")
    return p


class FileReq(BaseModel):
    path: str
    content: str = ""


@router.get("/file")
def read_file(path: str):
    p = _safe(path)
    if not p.exists():
        raise HTTPException(status_code=404, detail="not found")
    if p.is_dir():
        files = sorted(
            {"type": "dir" if c.is_dir() else "file", "name": c.name}
            for c in p.iterdir()
        )
        return {"path": path, "is_dir": True, "children": files[:500]}
    return {"path": path, "is_dir": False, "content": p.read_text(encoding="utf-8", errors="replace")}


@router.post("/file")
def write_file(req: FileReq):
    p = _safe(req.path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(req.content, encoding="utf-8")
    return {"status": "ok", "path": req.path}


@router.websocket("/ws/pty")
async def pty_ws(ws: WebSocket):
    await ws.accept()
    try:
        from winpty import PTY
        # spawn a bash login shell (git-bash) for POSIX tooling
        proc = PTY(cols=100, rows=30, backend="conpty")
        proc.spawn(r"C:\Program Files\Git\bin\bash.exe -lc 'cd /c/Users/mrmts/agentic-os-build && exec bash'")
        # read loop
        import asyncio
        async def pump():
            while True:
                try:
                    data = await ws.receive_text()
                    if data == "\x03":  # Ctrl-C
                        proc.write("\x03")
                    else:
                        proc.write(data)
                except WebSocketDisconnect:
                    break
                except Exception:
                    break
        async def read():
            import time
            while True:
                try:
                    out = proc.read()
                    if out:
                        await ws.send_text(out)
                except Exception:
                    break
                await asyncio.sleep(0.05)
        await asyncio.gather(pump(), read())
    except Exception as e:
        try:
            await ws.send_text(f"\r\n[ide] PTY unavailable: {e}\r\n")
        except Exception:
            pass
    finally:
        try:
            await ws.close()
        except Exception:
            pass
