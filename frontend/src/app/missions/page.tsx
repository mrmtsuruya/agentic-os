"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api, type Mission } from "@/lib/api";

const statusChip: Record<string, string> = {
  blocked: "chip-danger",
  active: "chip-ok",
  done: "chip",
  paused: "chip-warn",
};

function MissionRow({ m, i }: { m: Mission; i: number }) {
  return (
    <motion.div
      className="row"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(i * 0.04, 0.3), duration: 0.22 }}
    >
      <span className={statusChip[m.status] ?? "chip"}>{m.status}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 550, fontSize: 14 }}>{m.title}</div>
        <div className="dim" style={{ fontSize: 12.5, marginTop: 2 }}>
          owner <b style={{ color: "var(--color-ink)" }}>{m.owner}</b> · next: {m.next_decision}
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div className="tnum" style={{ fontSize: 13, fontWeight: 600 }}>{Math.round(m.confidence * 100)}%</div>
        <div className="muted" style={{ fontSize: 11 }}>conf · esc {m.escalation}</div>
      </div>
    </motion.div>
  );
}

export default function MissionsPage() {
  const [data, setData] = useState<Mission[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.missions().then((d) => setData(d.missions)).catch((e) => setErr(String(e)));
  }, []);

  return (
    <div className="page">
      <div style={{ display: "flex", alignItems: "flex-end", gap: 12 }}>
        <h1 className="page-title">Missions</h1>
        <span className="page-sub">Outcome-driven, owner + confidence + escalation</span>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--color-hairline)" }}>
          <h3 style={{ fontSize: 14, fontWeight: 600 }}>Mission Board</h3>
        </div>
        {err && <div className="row" style={{ color: "var(--color-danger)" }}>{err}</div>}
        {!data && !err && <div className="row dim">Loading…</div>}
        {data?.map((m, i) => (
          <MissionRow key={m.id} m={m} i={i} />
        ))}
      </div>
    </div>
  );
}
