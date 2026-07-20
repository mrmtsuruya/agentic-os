"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api, type AgentControl } from "@/lib/api";

export default function AgentsPage() {
  const [data, setData] = useState<AgentControl | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.agentControl().then(setData).catch((e) => setErr(String(e)));
  }, []);

  return (
    <div className="page">
      <div style={{ display: "flex", alignItems: "flex-end", gap: 12 }}>
        <h1 className="page-title">Agents</h1>
        <span className="page-sub">Installed · autonomy · last seen</span>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--color-hairline)" }}>
          <h3 style={{ fontSize: 14, fontWeight: 600 }}>Agent Control</h3>
        </div>
        {err && <div className="row" style={{ color: "var(--color-danger)" }}>{err}</div>}
        {!data && !err && <div className="row dim">Loading…</div>}
        {data?.map((a, i) => (
          <motion.div
            key={a.name}
            className="row"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.04, 0.3), duration: 0.22 }}
          >
            <span className={a.installed ? "chip-ok" : "chip"}>{a.installed ? "installed" : "missing"}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 550, fontSize: 14 }}>{a.name}</div>
              <div className="dim" style={{ fontSize: 12.5, marginTop: 2 }}>autonomy: {a.autonomy}</div>
            </div>
            {a.last_seen && <span className="muted tnum" style={{ fontSize: 12 }}>{a.last_seen}</span>}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
