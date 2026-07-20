"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api, type Skill } from "@/lib/api";
import { Icon } from "@/components/Icon";

function stripMd(s: string): string {
  return s
    .replace(/^---[\s\S]*?---/, "")
    .replace(/#{1,6}\s?/g, "")
    .replace(/\*\*|__|\*/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();
}

export default function SkillsPage() {
  const [skills, setSkills] = useState<Skill[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.skills().then(setSkills).catch((e) => setErr(String(e)));
  }, []);

  return (
    <div className="page">
      <div style={{ display: "flex", alignItems: "flex-end", gap: 12 }}>
        <h1 className="page-title">Skills</h1>
        <span className="page-sub">Skill catalog &amp; eval</span>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--color-hairline)" }}>
          <h3 style={{ fontSize: 14, fontWeight: 600 }}>Catalog</h3>
        </div>
        {err && <div className="row" style={{ color: "var(--color-danger)" }}>{err}</div>}
        {!skills && !err && <div className="row dim">Loading…</div>}
        {skills?.map((s, i) => (
          <motion.div
            key={s.name}
            className="row"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.22 }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 550, fontSize: 14 }}>{s.name}</div>
              <div className="dim" style={{ fontSize: 12.5, marginTop: 2 }}>{stripMd(s.description).slice(0, 140)}</div>
            </div>
            {s.has_learnings && <span className="chip-accent">learnings</span>}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
