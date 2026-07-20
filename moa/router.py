"""
MoA router — heuristic + optional LLM-classifier routing to local Ollama models.

Design (per user spec 2026-07-20):
  task types:  fast_chat | code_light | code_heavy | vision | reasoning_heavy
  mapping:     fast_chat/code_light -> main (uncensored) agent
               code_heavy           -> coder model
               vision               -> vision model
               reasoning_heavy      -> coder (or reasoning model)
  Classification: cheap heuristics first (image/code/token-length); borderline
  cases delegated to the main model as a 1-word classifier (agent-as-router).

Models are resolved from routing.json so you can swap without code changes.
The 34B main cannot be GPU-resident alongside others on a 12 GB card — see notes.
"""
from __future__ import annotations
import json, re, sys, urllib.request
from pathlib import Path

CONFIG = Path(__file__).parent / "routing.json"
OLLAMA = "http://127.0.0.1:11434"

CODE_TOKENS = re.compile(r"\b(def|class|import|function|const|fn|SELECT|FROM|return|async|interface|struct|void)\b", re.I)
FENCE = re.compile(r"```")
IMG_EXT = (".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp")
REASON_MARKERS = re.compile(r"\b(plan|prove|step[- ]by[- ]step|algorithm|derive|analy[sz]e|why|reason|trade[- ]off)\b", re.I)


def load_config() -> dict:
    if not CONFIG.exists():
        raise SystemExit(f"missing {CONFIG}")
    return json.loads(CONFIG.read_text())


def est_tokens(text: str) -> int:
    # ~4 chars/token heuristic
    return max(1, len(text) // 4)


def heuristics(text: str, has_image: bool) -> str | None:
    if has_image:
        return "vision"
    toks = est_tokens(text)
    code_hits = len(CODE_TOKENS.findall(text)) + len(FENCE.findall(text))
    # Code takes priority: any real code signal routes to a coder.
    if code_hits >= 1:
        return "code_heavy" if (toks > 400 or code_hits >= 6) else "code_light"
    # Reasoning markers → reasoning_heavy even when short.
    if REASON_MARKERS.search(text):
        return "reasoning_heavy"
    # Plain conversational text → fast_chat (no LLM classifier needed).
    if toks < 400:
        return "fast_chat"
    return "reasoning_heavy"


def llm_classify(text: str, cfg: dict) -> str:
    """Agent-as-router: ask the MAIN model for a single task-type word."""
    main = cfg["models"].get("main")
    if not main:
        return "fast_chat"
    prompt = (
        "You are a router. Given the user message, output exactly one word: "
        "fast_chat, code_light, code_heavy, vision, or reasoning_heavy. No other text."
    )
    try:
        body = json.dumps({
            "model": main, "prompt": f"{prompt}\n\nUser: {text}",
            "stream": False, "options": {"num_ctx": 2048, "temperature": 0},
        }).encode()
        req = urllib.request.Request(f"{OLLAMA}/api/generate", data=body,
                                     headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=30) as r:
            out = json.loads(r.read().decode()).get("response", "fast_chat")
        return out.strip().split()[0] if out.strip() else "fast_chat"
    except Exception:
        return "fast_chat"


def route(text: str, has_image: bool = False, cfg: dict | None = None) -> str:
    cfg = cfg or load_config()
    t = heuristics(text, has_image)
    if t is None:
        t = llm_classify(text, cfg)
    # vision can't be served without a vision model configured
    if t == "vision" and not cfg["models"].get("vision"):
        t = "fast_chat"
    # Resolve task type -> model KEY -> actual model NAME for the caller.
    key = cfg["routing_table"].get(t, "main")
    return cfg["models"].get(key, cfg["models"].get("main", "fast_chat"))


def forward(model: str, text: str, images: list[str] | None = None) -> str:
    payload: dict = {"model": model, "stream": False}
    if images:
        payload["images"] = images
        payload["prompt"] = text
    else:
        payload["prompt"] = text
    body = json.dumps(payload).encode()
    req = urllib.request.Request(f"{OLLAMA}/api/generate", data=body,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=180) as r:
        return json.loads(r.read().decode()).get("response", "")


def main() -> None:
    cfg = load_config()
    text = sys.stdin.read()
    has_image = any(p.strip().lower().endswith(IMG_EXT) for p in sys.argv[1:])
    model = route(text, has_image, cfg)
    print(f"[router] -> {model}", file=sys.stderr)
    print(forward(model, text))


if __name__ == "__main__":
    main()
