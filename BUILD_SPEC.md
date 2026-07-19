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
- [x] P2: Agent registry — auto-detect all CLIs, 1-click install, auto-remediate.
        VERIFIED 2026-07-19:
        - data/agents-registry.json: 10 target CLIs (claude, codex, kimi, glm, antigravity,
          grok, opencode, hermes, gemini, fusion) with detect/install/auth/remediation recipes.
        - backend/agents.py: GET /api/agents/discover (parallel bash -lc detect),
          POST /api/agents/install + /fix (tracked bg subprocess), GET /api/agents/log (stream).
        - Live discover: 2/10 online (claude, opencode); codex+hermes needs_auth (installed,
          no API key in env); 6 missing. Accurate.
        - 1-click install pipeline proven: triggered install, log streamed real `npm install`
          output (E404 on guessed @fusion/cli scope -> expected; proves streaming path).
        - Frontend: dashboard/pages/agents.js (badge grid + install/fix + live log),
          nav item + PAGE_TITLES entry. api.js wrappers added.
        GOTCHA: install recipes for kimi/glm/antigravity/grok/fusion use guessed npm scopes
          (@moonshot/kimi-code etc.) — correct exact package names in registry as you confirm.
        "Local" excluded (it's a Hermes local profile, not a separate CLI).
- [x] P3: IDE embed (Monaco+xterm pywinpty) + multi-agent brainstorm panel.
        VERIFIED 2026-07-20:
        - backend/panel.py: POST /api/panel/broadcast fans prompt to all ONLINE agents
          (reuses server.execute_agent). Live: claude+opencode returned ok.
        - backend/ide.py: GET/POST /api/ide/file (sandbox root = project dir) +
          WS /api/ide/ws/pty (pywinpty conpty PTY). REST verified (read server.py 60k).
          WS PTY is browser-only verify (route registered; xterm from CDN).
        - Frontend: dashboard/pages/panels.js (fan-out grid) + ide.js (Monaco editor +
          xterm terminal), nav entries + PAGE_TITLES. api.js wrappers added.
        - pywinpty 3.0.5 + websockets installed in venv.
        GOTCHA: a STALE clone exists at C:/Users/mrmts/Projects/agentic-os/ (older,
          lacks P3). If a Python import ever resolves there first it loads the wrong
          server. Authoritative build = C:/Users/mrmts/agentic-os-build. Recommend
          deleting or ignoring the Projects copy to avoid confusion.
- [x] P4: Kanban autonomous worker loop (claim→cheapest-capable→verify gate).
        VERIFIED 2026-07-20:
        - backend/kanban_worker.py: scans todo/ready unassigned tasks, classifies
          (development/devops/research/content/study/general), picks CHEAPEST CAPABLE
          online agent (tier prefs in module), dispatches via server.execute_agent(),
          VERIFY GATE (fail-closed: marks done only if non-empty agent output; else
          blocked with reason — model does NOT self-certify correctness).
        - POST /api/kanban-worker/run-once, /toggle (30s poll loop), /status.
        - Live: created todo task -> worker claimed (opencode, dev) -> done,
          verified=agent_output_present. Ad-hoc script ALL PASSED.
        - Frontend: kanban.js autopilot toggle (⚙ Autopilot ON/OFF) + status line +
          runWorkerOnce(). api.js wrappers added.
        NOTE: "verified" means agent produced output, not test-verified-correct. A
          future hook can run unit tests for code tasks; currently human-review gate.
- [x] P5: Studio/YouTube autopilot.
        VERIFIED 2026-07-20 (fail-closed; no API keys on machine):
        - backend/youtube.py: /research (YT Data API), /seo + /script + /generate
          (LLM via OpenAI/Nous), /generate assembles mp4 (TTS voiceover + ffmpeg
          text-slide deck + burned captions) + thumbnail PNG. /episodes lists drafts.
          /approve-publish is HUMAN-APPROVE GATED: uploads only if OAuth token
          present + explicit approve; else 409. /oauth-status reports state.
        - Live (no keys): oauth-status configured:false, episodes empty,
          /generate -> 502 "No LLM key configured" (fail-closed, no fabrication).
          Ad-hoc script ALL PASSED.
        - Frontend: studio.js pipeline board + episodes + approve button; nav entry;
          PAGE_TITLES; api.js wrappers.
        GOTCHAS: needs NOUS_OPENAI_KEY (LLM/TTS), YOUTUBE_API_KEY (research), and a
          Google Cloud OAuth token at data/youtube_token.json to PUBLISH. Visuals are
          local ffmpeg text-slides (AI imagery is a later swap).
- [x] SHIP: P0-P5 built, each verified live (ad-hoc scripts ALL PASSED), committed + pushed.
- [x] A/B/C hardening (prior turn): install recipes fixed (real cmds), Mission Control tab,
        premium glass redesign + animations.
- [x] OPS — Executive Operating System (this turn).
        VERIFIED 2026-07-20 (ad-hoc ALL PASSED; py_compile rc0; 30 JS node --check 0 fails):
        - Encoding fix: replaced StaticFiles mount with charset-aware handler
          (text/html+js+css+json => charset=utf-8). KILLS mojibake (â / âœ). Confirmed
          visually in browser + content-type header. Commit e5a89f4.
        - backend/ops.py: CEO Brief (decision-first; severity-ranked exceptions/risks/blocked/
          auth/spend/approvals), Mission Board (outcome-driven: owner, intended_result,
          confidence, next_decision, escalation, evidence, append-only audit), Agent Control
          (autonomy autonomous|manual|elevated, pause/resume, handoff=ownership transfer,
          one-click intervene pause/resume/escalate/close, ops_audit.json trail).
        - Frontend: dashboard/pages/ops.js (Operations command surface) + nav entry (🛰,
          top-level under Dashboard) + api wrappers. Brief + mission cards + agent control
          all render live (browser smoke confirmed: glyphs clean, blocked mission surfaces
          as HIGH in brief, opencode manual+paused persisted).
        - Motion: operational-feedback only (brief-row urgency border, mission-card status
          accent, toast slide). No sci-fi animation added.
        - Seed mission "Ship voice chat to prod" (blocked, owner claude) left as demo data.
        GOTCHA: JSON API responses don't declare charset (FastAPI default) but are UTF-8 by
          spec; browsers decode correctly (no mojibake seen). Static assets now force utf-8.
- [ ] NEXT OPTIONAL: morning brief automation (cron), approve-deadline timestamps on missions,
        replay viewer for ops_audit.json, live cost hook from worker log-cost.

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
