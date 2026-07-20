"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api, type TrailEntry } from "@/lib/api";

export default function TrailPage() {
  const [data, setData] = useState<TrailEntry[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.audit().then((d) => setData(d.audit)).catch((e) => setErr(String(e)));
  }, []);

  return (
    <div className="page">
      <div style={{ display: "flex", alignItems: "flex-end", gap: 12 }}>
        <h1 className="page-title">Trail</h1>
        <span className="page-sub">Audit log · who did what, when</span>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--color-hairline)" }}>
          <h3 style={{ fontSize: 14, fontWeight: 600 }}>Audit Trail</h3>
        </div>
        {err && <div className="row" style={{ color: "var(--color-danger)" }}>{err}</div>}
        {!data && !err && <div className="row dim">Loading…</div>}
        {data?.slice(0, 60).map((e, i) => (
          <motion.div
            key={i}
            className="row"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.02, 0.3), duration: 0.2 }}
          >
            <span className="chip tnum">{e.ts.slice(11, 19)}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontWeight: 550, fontSize: 13.5 }}>{e.action}</span>
              {e.detail && <span className="dim" style={{ fontSize: 12.5 }}> — {e.detail}</span>}
            </div>
            <span className="muted" style={{ fontSize: 12 }}>{e.actor}{e.mission ? ` · ${e.mission}` : ""}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
