# Agentic OS — BUILD SPEC & PROGRESS (living doc)

PURPOSE: This file is the source of truth for the agentic-os fork extension. Any new
session must read it first to resume exactly where the last left off. Update it after
every phase with real, verified results (no fabrication).

## CANONICAL LOCATIONS
- Fork repo:        https://github.com/mrmtsuruya/agentic-os.git
- Upstream:         https://github.com/modimihir07/agentic-os.git
- Local working dir: C:/Users/mrmts/agentic-os-build  (git clone of the fork)
- Python:           py -3.11 (NOT python3.11 — not on git-bash PATH). Venv at .venv/.
- Dashboard URL:    http://127.0.0.1:8090  (PORT MOVED FROM 8080 — see note)
- Settings:         data/settings.json (gitignored in upstream; we created it)

## WHY PORT 8090 (not 8080)
Original repo defaults to 8080. 8080 was previously the dead MT5 bridge port on this
machine. Moving the dashboard to 8090 avoids any future collision if the bridge is ever
rebuilt. CORS origins in server.py are now derived dynamically from settings + common
ports (8080/8090/3000) instead of hardcoded 8080.

## BASELINE FACTS (verified 2026-07-19)
- Fork: MIT, v0.3.0, single upstream maintainer, last push 2026-06-29 (quiet but alive).
- Stack: FastAPI backend (server.py) + vanilla-JS SPA (dashboard/, no build step).
- Wired for 3 agents by default: opencode, Hermes, Gemini CLI.
- Has: Kanban, multi-agent chat, cost analytics, scheduler, skills hub, agent-health,
  smart-router, learning-analytics, session-replay, error dashboard, circuit-breaker,
  brain/ + SQLite FTS5 memory.
- Does NOT have: voice/talk, Obsidian vault, Omi/OmniMemory, IDE embed, multi-agent
  brainstorm panel, trading TA tab, builds/issues views.

## REQUIREMENTS (locked from user answers)
1. Dashboard integrates all cloud agent CLIs (Claude, Codex, Kimi Code, GLM Code,
   Antigravity, Grok Build, opencode, Hermes, Gemini, + Free Claude Code/Fusion/Local).
   Auto-DETECT → auto-INSTALL (1-click) → auto-REMEDIATE issues.
2. IDE-like tab (Monaco + xterm) = home for per-CLI brainstorm/panel (fan-out all CLIs).
3. Kanban: autonomous worker claims a todo, orchestrator picks CHEAPEST CAPABLE model,
   verify-before-accept gate (Hiro discipline, NOT model self-certification).
4. Memory tab: Obsidian vault PRIMARY + OmniMemory (omnirexflora-labs/omnimemory, port
   8001) as FAILOVER/sync — dual-write, fallback read if Obsidian missing/empty.
5. Mission Control/Workspace tab (agents, cost, builds, issues, goals, active, done).
6. Voice chat: Web Speech API STT (zero cost) + OpenAI TTS via Nous (gpt-4o-mini-tts,
   voice "nova") for human-sounding output.
7. YouTube autopilot (Studio tab): research trends + SEO + script + generate (faceless,
   AI-narrated, ORIGINAL generated visuals, good TTS audio) + thumbnail + schedule.
   HUMAN-APPROVE gate before publish. User has channel + API key; needs OAuth client
   (upload requires OAuth, not API key) — setup deferred to P5.
8. Workflow: Hiro model (captain orchestrator + isolated worker + fail-closed review
   gate). Trading/MQL5 framing REMOVED from default workflow per user request.

## PHASE PLAN & STATUS
- [x] P0: Fork + boot on Windows (git-bash), move port 8080->8090, CORS dynamic.
        VERIFIED 2026-07-19: HTTP 200 @ http://127.0.0.1:8090, title "Agentic OS",
        /api/memory/search responds. Venv at .venv/ (py -3.11).
- [x] P1: Voice chat (Web Speech STT + /api/tts OpenAI via Nous) + Obsidian Memory tab
        with OmniMemory failover. VERIFIED 2026-07-19:
        - backend/tts.py: POST /api/tts -> 503 "TTS not configured" when no key (fails closed).
          Reads key from settings.json tts.api_key OR env NOUS_OPENAI_KEY/OPENAI_API_KEY.
        - backend/memory_ext.py: GET/POST /api/memory/obsidian[/note] -> write/read verified
          to C:/Users/mrmts/Documents/AgenticOS_Vault (vault_exists:true, note_count:1).
          Dual-write to OmniMemory fails OPEN (OmniMemory not running). Failover read paths
          to OmniMemory when Obsidian missing.
        - chat.js: mic button (Web Speech STT) + speaker toggle (calls /api/tts on reply).
        - memory.js: Obsidian vault panel (status, notes grid, new/edit). api.js wrappers added.
        GOTCHA: TTS key not yet present on machine — user must put NOUS_OPENAI_KEY (or
        tts.api_key) in settings.json to enable audio. Web Speech STT needs a Chromium browser.
- [ ] P2: Agent registry (data/agents-registry.json) — auto-detect all CLIs, 1-click
        install, auto-remediate. Backend backend/agents.py + pages/agents.js.
        Windows: all detect/install via `bash -lc "..."`.
- [ ] P3: IDE embed (Monaco + xterm via pywinpty) + multi-agent brainstorm panel
        (fan-out). Backend backend/ide.py + backend/panel.py.
- [ ] P4: Kanban autonomous worker loop (claim->classify->cheapest-capable->verify gate).
        Backend backend/kanban_worker.py + kanban.js autopilot toggle.
- [ ] P5: Studio/YouTube autopilot. Backend backend/youtube.py + pages/studio.js.
        Needs Google OAuth client (setup script). Human-approve gate.

## DEPLOYMENT NOTES (verified)
- Start: cd agentic-os-build && . .venv/Scripts/activate && python server.py --port 8090
- Kill on 8090: find PID via `netstat -ano | grep :8090`, then `taskkill /PID <n> /F`
  (use SINGLE slash in git-bash; double-slash breaks taskkill).
- Always restart server after editing server.py or backend/*.py (static JS needs no restart
  but a hard refresh clears browser cache).

## KEY DEPENDENCIES TO ADD (requirements.txt)
openai (Nous TTS), google-api-python-client, google-auth-oauthlib, pywinpty (Win),
websockets, moviepy, omnimemory (optional). ffmpeg already on PATH (WinGet).

## WINDOWS PITFALLS (front-loaded)
- PTY for xterm -> pywinpty; plain subprocess won't give shell prompt.
- All agent detect/install under `bash -lc "..."` (git-bash), not cmd/powershell.
- python3.11 NOT on PATH in git-bash -> use `py -3.11`.
- search_files (ripgrep) FAILS on MSYS paths -> use terminal grep / read_file instead.
- OAuth token stored encrypted in data/, never committed.

## NEXT ACTION
Proceed to P1: add backend/tts.py (POST /api/tts), extend memory endpoints for Obsidian
read/write + OmniMemory fallback, and update dashboard/pages/memory.js + chat.js for
voice. Boot-test each endpoint before marking done.
