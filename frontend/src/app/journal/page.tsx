"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api, type JournalEntry } from "@/lib/api";
import { Icon } from "@/components/Icon";

export default function JournalPage() {
  const [data, setData] = useState<JournalEntry[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.journal().then((d) => setData(d.entries)).catch((e) => setErr(String(e)));
  }, []);

  return (
    <div className="page">
      <div style={{ display: "flex", alignItems: "flex-end", gap: 12 }}>
        <h1 className="page-title">Journal</h1>
        <span className="page-sub">Daily entries</span>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--color-hairline)" }}>
          <h3 style={{ fontSize: 14, fontWeight: 600 }}>Journal</h3>
        </div>
        {err && <div className="row" style={{ color: "var(--color-danger)" }}>{err}</div>}
        {!data && !err && <div className="row dim">Loading…</div>}
        {data && data.length === 0 && <div className="row dim">No entries.</div>}
        {data?.map((e, i) => (
          <motion.div
            key={e.date}
            className="row"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.22 }}
            style={{ flexDirection: "column", alignItems: "stretch", gap: 4 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="journal" width={15} height={15} />
              <span style={{ fontWeight: 600, fontSize: 13 }} className="tnum">{e.date}</span>
              <span className="muted tnum" style={{ marginLeft: "auto", fontSize: 11 }}>{e.modified}</span>
            </div>
            <div className="dim" style={{ fontSize: 12.5, whiteSpace: "pre-wrap" }}>{e.preview.slice(0, 200)}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
