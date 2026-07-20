"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api, type Brief, type Decision } from "@/lib/api";
import { Icon } from "@/components/Icon";

const sevChip: Record<string, string> = {
  critical: "chip-danger",
  high: "chip-danger",
  medium: "chip-warn",
  low: "chip",
};

function DecisionRow({ d, i }: { d: Decision; i: number }) {
  return (
    <motion.div
      className="row"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(i * 0.03, 0.25), duration: 0.22 }}
    >
      <span className={sevChip[d.severity] ?? "chip"}>{d.severity}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 550, fontSize: 14 }}>{d.title}</div>
        <div className="dim" style={{ fontSize: 12.5, marginTop: 2 }}>{d.detail}</div>
      </div>
      <span className="chip">{d.kind.replace(/_/g, " ")}</span>
    </motion.div>
  );
}

function SeverityBar({ summary }: { summary: Brief["summary"] }) {
  const { critical, high, medium, low } = summary;
  const total = Math.max(1, critical + high + medium + low);
  const segs: [number, string][] = [
    [critical, "var(--color-danger)"],
    [high, "var(--color-danger)"],
    [medium, "var(--color-warn)"],
    [low, "var(--color-accent)"],
  ];
  return (
    <div
      title={`${critical} critical · ${high} high · ${medium} medium · ${low} low`}
      style={{ display: "flex", width: 160, height: 8, borderRadius: 5, overflow: "hidden", background: "var(--color-hairline)" }}
    >
      {segs.map(([n, color], i) =>
        n > 0 ? (
          <motion.div
            key={i}
            initial={{ width: 0 }}
            animate={{ width: `${(n / total) * 100}%` }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
            style={{ background: color }}
          />
        ) : null
      )}
    </div>
  );
}

export default function BriefPage() {
  const [brief, setBrief] = useState<Brief | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.brief().then(setBrief).catch((e) => setErr(String(e)));
  }, []);

  // Collapse repeated "agent_missing / Not available for delegation" entries into one group.
  const real = brief?.decisions.filter((d) => d.kind !== "agent_missing") ?? [];
  const missingAgents =
    brief?.decisions.filter((d) => d.kind === "agent_missing").map((d) => d.ref) ?? [];

  return (
    <div className="page">
      <div style={{ display: "flex", alignItems: "flex-end", gap: 12, marginBottom: 6 }}>
        <h1 className="page-title">Brief</h1>
        <span className="page-sub">Decision-first command surface</span>
      </div>

      {err && <div className="card" style={{ padding: 16, color: "var(--color-danger)" }}>{err}</div>}

      {/* HERO: severity summary — decisions/risks first, never status noise */}
      <motion.div
        className="card"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ padding: 18, marginTop: 14, display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}
      >
        <div>
          <div className="muted" style={{ fontSize: 12 }}>Open decisions</div>
          <div className="tnum" style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.1 }}>
            {brief?.count ?? 0}
          </div>
        </div>
        {brief && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginLeft: "auto", alignItems: "center" }}>
            <SeverityBar summary={brief.summary} />
            {brief.summary.high > 0 && <span className="chip-danger tnum">{brief.summary.high} high</span>}
            {brief.summary.medium > 0 && <span className="chip-warn tnum">{brief.summary.medium} medium</span>}
            {brief.summary.low > 0 && <span className="chip tnum">{brief.summary.low} low</span>}
            {missingAgents.length > 0 && (
              <span className="chip tnum" title={missingAgents.join(", ")}>
                {missingAgents.length} agents not installed
              </span>
            )}
          </div>
        )}
      </motion.div>

      {/* Severity distribution — operational signal, not decoration */}
      {brief && (
        <div style={{ marginTop: 10, display: "flex", gap: 6, alignItems: "center" }}>
          <span className="muted" style={{ fontSize: 11 }}>Severity mix</span>
          <SeverityBar summary={brief.summary} />
        </div>
      )}

      {/* Decision list */}
      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--color-hairline)" }}>
          <h3 style={{ fontSize: 14, fontWeight: 600 }}>Decisions requiring attention</h3>
        </div>
        {!brief && !err && <div className="row dim">Loading…</div>}
        {brief && real.length === 0 && (
          <div className="row dim">No blocking decisions. {missingAgents.length} agent(s) not installed (non-blocking).</div>
        )}
        {real.map((d, i) => (
          <DecisionRow key={d.ref + i} d={d} i={i} />
        ))}
        {missingAgents.length > 0 && (
          <div className="row" style={{ flexWrap: "wrap", gap: 6 }}>
            <Icon name="agents" width={15} height={15} />
            <span className="dim" style={{ fontSize: 12.5 }}>Not available for delegation:</span>
            {missingAgents.map((a) => (
              <span key={a} className="chip">{a}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
