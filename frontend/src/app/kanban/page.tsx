"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api, type KanbanTask } from "@/lib/api";
import { Icon } from "@/components/Icon";

const prioChip: Record<string, string> = {
  high: "chip-danger",
  medium: "chip-warn",
  low: "chip",
};

const COLS = ["triage", "todo", "ready", "in_progress", "blocked"] as const;

function TaskCard({ t, i }: { t: KanbanTask; i: number }) {
  return (
    <motion.div
      className="card"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(i * 0.03, 0.25), duration: 0.22 }}
      style={{ padding: 12, marginBottom: 10 }}
    >
      <div style={{ fontWeight: 550, fontSize: 13.5 }}>{t.title}</div>
      <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
        <span className={prioChip[t.priority] ?? "chip"}>{t.priority}</span>
        {t.assignee && <span className="chip">{t.assignee}</span>}
        <span className="chip">{t.status}</span>
      </div>
      {t.block_reason && (
        <div className="muted" style={{ fontSize: 11.5, marginTop: 6 }}>⛔ {t.block_reason}</div>
      )}
    </motion.div>
  );
}

export default function KanbanPage() {
  const [board, setBoard] = useState<Record<string, KanbanTask[]> | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.kanban().then((b) => setBoard(b.columns)).catch((e) => setErr(String(e)));
  }, []);

  return (
    <div className="page">
      <div style={{ display: "flex", alignItems: "flex-end", gap: 12 }}>
        <h1 className="page-title">Kanban</h1>
        <span className="page-sub">Autonomous worker board</span>
      </div>

      {err && <div className="card" style={{ padding: 16, marginTop: 16, color: "var(--color-danger)" }}>{err}</div>}
      {!board && !err && <div className="dim" style={{ marginTop: 16 }}>Loading…</div>}

      {board && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginTop: 16 }}>
          {COLS.map((col) => (
            <div key={col} className="card" style={{ padding: 12, alignSelf: "start" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <Icon name="kanban" width={15} height={15} />
                <span style={{ fontWeight: 600, fontSize: 13, textTransform: "capitalize" }}>{col.replace("_", " ")}</span>
                <span className="chip tnum" style={{ marginLeft: "auto" }}>{board[col]?.length ?? 0}</span>
              </div>
              {(board[col] ?? []).map((t, i) => (
                <TaskCard key={t.id} t={t} i={i} />
              ))}
              {(!board[col] || board[col].length === 0) && (
                <div className="muted" style={{ fontSize: 11.5 }}>empty</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
