"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api, type SchedulerJob } from "@/lib/api";
import { Icon } from "@/components/Icon";

export default function SchedulerPage() {
  const [jobs, setJobs] = useState<SchedulerJob[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.schedulerJobs().then(setJobs).catch((e) => setErr(String(e)));
  }, []);

  return (
    <div className="page">
      <div style={{ display: "flex", alignItems: "flex-end", gap: 12 }}>
        <h1 className="page-title">Scheduler</h1>
        <span className="page-sub">Cron jobs &amp; cadence</span>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--color-hairline)" }}>
          <h3 style={{ fontSize: 14, fontWeight: 600 }}>Jobs</h3>
        </div>
        {err && <div className="row" style={{ color: "var(--color-danger)" }}>{err}</div>}
        {!jobs && !err && <div className="row dim">Loading…</div>}
        {jobs?.map((j, i) => (
          <motion.div
            key={j.id}
            className="row"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.22 }}
          >
            <span className={j.enabled ? "chip-ok" : "chip"}>{j.enabled ? "on" : "off"}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 550, fontSize: 14 }}>{j.name}</div>
              <div className="dim" style={{ fontSize: 12.5, marginTop: 2 }}>skill: {j.skill}</div>
            </div>
            <code className="chip tnum" style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{j.cron}</code>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
