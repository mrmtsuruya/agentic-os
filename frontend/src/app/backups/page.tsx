"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api, type BackupEntry } from "@/lib/api";
import { Icon } from "@/components/Icon";

export default function BackupsPage() {
  const [data, setData] = useState<BackupEntry[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.backups().then(setData).catch((e) => setErr(String(e)));
  }, []);

  return (
    <div className="page">
      <div style={{ display: "flex", alignItems: "flex-end", gap: 12 }}>
        <h1 className="page-title">Backups</h1>
        <span className="page-sub">Snapshots</span>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--color-hairline)" }}>
          <h3 style={{ fontSize: 14, fontWeight: 600 }}>Backups</h3>
        </div>
        {err && <div className="row" style={{ color: "var(--color-danger)" }}>{err}</div>}
        {!data && !err && <div className="row dim">Loading…</div>}
        {data && data.length === 0 && <div className="row dim">No backups yet.</div>}
        {data?.map((b, i) => (
          <motion.div
            key={b.id ?? i}
            className="row"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.22 }}
          >
            <Icon name="backups" width={16} height={16} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 550, fontSize: 14 }}>{b.name ?? b.id ?? "backup"}</div>
              {b.created && <div className="muted tnum" style={{ fontSize: 11 }}>{b.created}</div>}
            </div>
            {typeof b.size === "number" && <span className="chip tnum">{Math.round(b.size / 1024)} KB</span>}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
