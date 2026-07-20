"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api, type AgentControl } from "@/lib/api";
import { Icon } from "@/components/Icon";

export default function AgentsPage() {
  const [data, setData] = useState<AgentControl | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.agentControl().then(setData).catch((e) => setErr(String(e)));
  }, []);

  const agents = data?.agents ?? [];

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
        {data && agents.length === 0 && <div className="row dim">No agents registered.</div>}
        {agents.map((a, i) => {
          const online = a.status === "online";
          return (
            <motion.div
              key={a.name}
              className="row"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.3), duration: 0.22 }}
            >
              <span className={online ? "chip-ok" : "chip-danger"}>{a.status}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 550, fontSize: 14 }}>{a.name}</div>
                <div className="dim" style={{ fontSize: 12.5, marginTop: 2 }}>
                  tier: {a.tier} · autonomy: {a.autonomy}
                  {a.paused ? " · paused" : ""}
                </div>
              </div>
              <Icon name="agents" width={15} height={15} />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
