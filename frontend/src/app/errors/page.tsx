"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api, type ErrEntry } from "@/lib/api";
import { Icon } from "@/components/Icon";

export default function ErrorsPage() {
  const [data, setData] = useState<ErrEntry[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.errors().then((d) => setData(d.errors)).catch((e) => setErr(String(e)));
  }, []);

  return (
    <div className="page">
      <div style={{ display: "flex", alignItems: "flex-end", gap: 12 }}>
        <h1 className="page-title">Errors</h1>
        <span className="page-sub">Failure log</span>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--color-hairline)" }}>
          <h3 style={{ fontSize: 14, fontWeight: 600 }}>Error Dashboard</h3>
        </div>
        {err && <div className="row" style={{ color: "var(--color-danger)" }}>{err}</div>}
        {!data && !err && <div className="row dim">Loading…</div>}
        {data && data.length === 0 && <div className="row dim">No errors logged.</div>}
        {data?.map((e, i) => (
          <motion.div
            key={e.id ?? i}
            className="row"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.22 }}
          >
            <span className={(e.level === "error" ? "chip-danger" : "chip-warn")}>{e.level ?? "log"}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5 }}>{e.msg ?? JSON.stringify(e).slice(0, 120)}</div>
              {e.ts && <div className="muted tnum" style={{ fontSize: 11 }}>{e.ts}</div>}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
