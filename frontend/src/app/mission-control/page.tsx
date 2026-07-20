"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api, type AgentControl, type Mission, type Goal } from "@/lib/api";
import { Icon } from "@/components/Icon";

type AgentView = {
  name: string;
  status: string;
  tier: string;
  autonomy: string;
  paused: boolean;
  activeMissions: number;
  doneMissions: number;
  activeGoals: number;
  doneGoals: number;
};

export default function MissionControlPage() {
  const [agents, setAgents] = useState<AgentView[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.agentControl(), api.missions(), api.goals()])
      .then(([ac, m, g]) => {
        const missions = m.missions as Mission[];
        const goals = g.goals as Goal[];
        const views: AgentView[] = (ac.agents ?? []).map((a) => {
          const owned = missions.filter((mm) => mm.owner === a.name);
          const goalOwned = goals.filter((gg) => gg.category === a.tier || gg.title.toLowerCase().includes(a.name));
          return {
            name: a.name,
            status: a.status,
            tier: a.tier,
            autonomy: a.autonomy,
            paused: a.paused,
            activeMissions: owned.filter((mm) => mm.status === "active" || mm.status === "blocked").length,
            doneMissions: owned.filter((mm) => mm.status === "done").length,
            activeGoals: goalOwned.filter((gg) => gg.status !== "done").length,
            doneGoals: goalOwned.filter((gg) => gg.status === "done").length,
          };
        });
        setAgents(views);
      })
      .catch((e) => setErr(String(e)));
  }, []);

  return (
    <div className="page">
      <div style={{ display: "flex", alignItems: "flex-end", gap: 12 }}>
        <h1 className="page-title">Mission Control</h1>
        <span className="page-sub">Per-agent workspace · cost / builds / issues not tracked by backend</span>
      </div>

      {err && <div className="card" style={{ padding: 16, marginTop: 16, color: "var(--color-danger)" }}>{err}</div>}
      {!agents && !err && <div className="dim" style={{ marginTop: 16 }}>Loading…</div>}

      {agents && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12, marginTop: 16 }}>
          {agents.map((a, i) => {
            const online = a.status === "online";
            return (
              <motion.div
                key={a.name}
                className="card"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.3), duration: 0.22 }}
                style={{ padding: 14 }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Icon name="agents" width={16} height={16} />
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{a.name}</span>
                  <span className={online ? "chip-ok" : "chip-danger"} style={{ marginLeft: "auto" }}>{a.status}</span>
                </div>
                <div className="dim" style={{ fontSize: 12, marginTop: 4 }}>
                  {a.tier} · {a.autonomy}{a.paused ? " · paused" : ""}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
                  <Metric label="Missions" active={a.activeMissions} done={a.doneMissions} />
                  <Metric label="Goals" active={a.activeGoals} done={a.doneGoals} />
                </div>

                <div className="muted" style={{ fontSize: 11, marginTop: 10, borderTop: "1px solid var(--color-hairline)", paddingTop: 8 }}>
                  cost · builds · issues — not tracked
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Metric({ label, active, done }: { label: string; active: number; done: number }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--color-hairline)", borderRadius: 10, padding: "8px 10px" }}>
      <div className="dim" style={{ fontSize: 11 }}>{label}</div>
      <div style={{ marginTop: 4, fontSize: 13 }}>
        <span className="tnum" style={{ color: "var(--color-accent)" }}>{active}</span>
        <span className="muted"> active</span>
        <span className="tnum" style={{ marginLeft: 8 }}>{done}</span>
        <span className="muted"> done</span>
      </div>
    </div>
  );
}
