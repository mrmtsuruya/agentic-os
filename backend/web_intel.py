"""
backend/web_intel.py — Offline-safe external intelligence collector (Track A).

Strategy:
  - Try a best-effort network fetch (urllib to a search-friendly endpoint). If the network
    is unavailable or the call fails, FALL BACK to a curated seed list of realistic signals
    (clearly marked source='seed'). Never fabricate live data we couldn't fetch.
  - Returns a list of signal dicts ready to append to data/intel/signals.json.

Fail-closed: any exception returns the seed list, not a crash.
"""
import json
import time
import urllib.request
import urllib.parse

SEED_SIGNALS = [
    {"title": "Competitor shipped agent-eval harness", "summary": "A peer AI lab open-sourced a benchmark for agent safety — relevant to Mission quality gates.", "source": "seed", "severity": "medium", "kind": "competitor", "confidence_delta": -0.05},
    {"title": "New CVE in widely-used LLM proxy", "summary": "High-severity advisory affects self-hosted model gateways; audit agent dependency chain.", "source": "seed", "severity": "high", "kind": "cve"},
    {"title": "Regulator proposes AI-agent disclosure rule", "summary": "Upcoming requirement for autonomous agents to log decisions — maps to our Trail feature.", "source": "seed", "severity": "medium", "kind": "regulation", "confidence_delta": -0.03},
    {"title": "Model provider cut latency 40% on streaming", "summary": "Token-streaming throughput improvement; relevant to real-time Brief push.", "source": "seed", "severity": "low", "kind": "release"},
]


def _now():
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def collect_intel(query: str = "AI agent platform release", limit: int = 5) -> dict:
    """Return dict: {collected, source, signals:[...]}. source='live' or 'seed'."""
    try:
        q = urllib.parse.quote(query)
        url = f"https://duckduckgo.com/html/?q={q}"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=6) as r:
            html = r.read().decode("utf-8", "ignore")
        # very light parse: pull result titles
        import re
        titles = re.findall(r'result__a"[^>]*>(.*?)</a>', html)
        signals = []
        for t in titles[:limit]:
            t = re.sub(r"<.*?>", "", t).strip()
            if t:
                signals.append({
                    "title": t[:160], "summary": "", "source": "live:duckduckgo",
                    "severity": "low", "kind": "news", "confidence_delta": 0.0,
                })
        if signals:
            return {"collected": len(signals), "source": "live", "signals": signals}
    except Exception:
        pass
    # fall back to seed
    return {"collected": len(SEED_SIGNALS), "source": "seed", "signals": list(SEED_SIGNALS)}
