"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api, type PluginEntry } from "@/lib/api";
import { Icon } from "@/components/Icon";

export default function PluginsPage() {
  const [data, setData] = useState<PluginEntry[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.plugins().then((d) => setData(d.plugins)).catch((e) => setErr(String(e)));
  }, []);

  return (
    <div className="page">
      <div style={{ display: "flex", alignItems: "flex-end", gap: 12 }}>
        <h1 className="page-title">Plugins</h1>
        <span className="page-sub">Installed &amp; available</span>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--color-hairline)" }}>
          <h3 style={{ fontSize: 14, fontWeight: 600 }}>Plugins</h3>
        </div>
        {err && <div className="row" style={{ color: "var(--color-danger)" }}>{err}</div>}
        {!data && !err && <div className="row dim">Loading…</div>}
        {data?.map((p, i) => (
          <motion.div
            key={p.name}
            className="row"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.22 }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 550, fontSize: 14 }}>{p.name}</div>
              <div className="dim" style={{ fontSize: 12.5, marginTop: 2 }}>{p.description}</div>
            </div>
            <span className="chip tnum">{p.version}</span>
            <span className="chip">{p.type}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
