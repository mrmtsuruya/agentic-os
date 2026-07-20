"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";

type Signal = {
  title: string;
  summary: string;
  severity: string;
  kind: string;
  source?: string;
};

const sevChip: Record<string, string> = {
  critical: "chip-danger",
  high: "chip-danger",
  medium: "chip-warn",
  low: "chip",
};

export default function IntelPage() {
  const [signals, setSignals] = useState<Signal[] | null>(null);
  const [audit, setAudit] = useState<{ total: number; enabled: number; blocked: string[] } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.intelSignals(), api.intelPluginAudit()])
      .then(([s, a]) => {
        setSignals(s.signals as Signal[]);
        setAudit(a);
      })
      .catch((e) => setErr(String(e)));
  }, []);

  return (
    <div className="page">
      <div style={{ display: "flex", alignItems: "flex-end", gap: 12 }}>
        <h1 className="page-title">Intelligence</h1>
        <span className="page-sub">World-aware signals · trust-gated plugins</span>
      </div>

      {audit && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
          <span className="chip tnum">{audit.total} plugins</span>
          <span className="chip-ok tnum">{audit.enabled} enabled</span>
          {audit.blocked.length > 0 && <span className="chip-danger tnum">{audit.blocked.length} blocked (unsigned)</span>}
        </div>
      )}

      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--color-hairline)" }}>
          <h3 style={{ fontSize: 14, fontWeight: 600 }}>External Signals</h3>
        </div>
        {err && <div className="row" style={{ color: "var(--color-danger)" }}>{err}</div>}
        {!signals && !err && <div className="row dim">Loading…</div>}
        {signals?.map((s, i) => (
          <motion.div
            key={i}
            className="row"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.22 }}
          >
            <span className={sevChip[s.severity] ?? "chip"}>{s.severity}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 550, fontSize: 14 }}>{s.title}</div>
              <div className="dim" style={{ fontSize: 12.5, marginTop: 2 }}>{s.summary}</div>
            </div>
            <span className="chip">{s.kind}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
