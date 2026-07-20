"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { Icon } from "@/components/Icon";

export default function MemoryPage() {
  const [q, setQ] = useState("");
  const [res, setRes] = useState<{ results: unknown[]; entities: unknown[] } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    setErr(null);
    try {
      const r = await api.memorySearch(q || " ");
      setRes(r);
    } catch (e) {
      setErr(String(e));
    }
  }

  useEffect(() => { run(); /* initial load */ }, []);

  return (
    <div className="page">
      <div style={{ display: "flex", alignItems: "flex-end", gap: 12 }}>
        <h1 className="page-title">Memory</h1>
        <span className="page-sub">Search the knowledge store</span>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run()}
          placeholder="Search memory…"
          className="btn"
          style={{ flex: 1, background: "var(--color-bg-input)", color: "var(--color-ink)" }}
        />
        <button className="btn btn-primary" onClick={run}><Icon name="search" width={16} height={16} />Search</button>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        {err && <div className="row" style={{ color: "var(--color-danger)" }}>{err}</div>}
        {!res && !err && <div className="row dim">Loading…</div>}
        {res && (
          <>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--color-hairline)" }} className="muted">
              {res.results.length} results · {res.entities.length} entities
            </div>
            {res.results.length === 0 && <div className="row dim">No matches.</div>}
            {res.results.map((r, i) => (
              <motion.div
                key={i}
                className="row"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.22 }}
              >
                <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 12.5, fontFamily: "var(--font-mono)", flex: 1 }}>
                  {typeof r === "string" ? r : JSON.stringify(r).slice(0, 200)}
                </pre>
              </motion.div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
