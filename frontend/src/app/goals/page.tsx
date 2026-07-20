"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api, type Goal } from "@/lib/api";
import { Icon } from "@/components/Icon";

const statusChip: Record<string, string> = {
  done: "chip-ok",
  active: "chip-ok",
  paused: "chip-warn",
};

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.goals().then((g) => setGoals(g.goals)).catch((e) => setErr(String(e)));
  }, []);

  return (
    <div className="page">
      <div style={{ display: "flex", alignItems: "flex-end", gap: 12 }}>
        <h1 className="page-title">Goals</h1>
        <span className="page-sub">Objectives &amp; progress</span>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--color-hairline)" }}>
          <h3 style={{ fontSize: 14, fontWeight: 600 }}>Goals</h3>
        </div>
        {err && <div className="row" style={{ color: "var(--color-danger)" }}>{err}</div>}
        {!goals && !err && <div className="row dim">Loading…</div>}
        {goals?.map((g, i) => (
          <motion.div
            key={g.id}
            className="row"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.22 }}
            style={{ flexDirection: "column", alignItems: "stretch", gap: 6 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontWeight: 550, fontSize: 14 }}>{g.title}</span>
              <span className={statusChip[g.status] ?? "chip"} style={{ marginLeft: "auto" }}>{g.status}</span>
              <span className="chip">{g.category}</span>
            </div>
            <div style={{ height: 4, borderRadius: 4, background: "var(--color-hairline)", overflow: "hidden" }}>
              <div style={{ width: `${Math.max(0, Math.min(100, g.progress))}%`, height: "100%", background: "var(--color-accent)" }} />
            </div>
            <div className="muted tnum" style={{ fontSize: 11 }}>{g.progress}% · {g.target_date || "no target date"}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
