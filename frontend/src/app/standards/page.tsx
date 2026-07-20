"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api, type StdEntry } from "@/lib/api";
import { Icon } from "@/components/Icon";

export default function StandardsPage() {
  const [data, setData] = useState<StdEntry[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.standards().then((d) => setData(d.standards)).catch((e) => setErr(String(e)));
  }, []);

  return (
    <div className="page">
      <div style={{ display: "flex", alignItems: "flex-end", gap: 12 }}>
        <h1 className="page-title">Standards</h1>
        <span className="page-sub">Engineering standards</span>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--color-hairline)" }}>
          <h3 style={{ fontSize: 14, fontWeight: 600 }}>Standards</h3>
        </div>
        {err && <div className="row" style={{ color: "var(--color-danger)" }}>{err}</div>}
        {!data && !err && <div className="row dim">Loading…</div>}
        {data?.map((s, i) => (
          <motion.div
            key={s.name}
            className="row"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.22 }}
            style={{ flexDirection: "column", alignItems: "stretch", gap: 4 }}
          >
            <div style={{ fontWeight: 550, fontSize: 14 }}>{s.name}</div>
            <div className="dim" style={{ fontSize: 12.5 }}>{s.content.replace(/[#*`]/g, "").slice(0, 160)}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
