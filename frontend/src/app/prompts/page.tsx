"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { Icon } from "@/components/Icon";

export default function PromptsPage() {
  const [data, setData] = useState<Record<string, string> | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.prompts().then(setData).catch((e) => setErr(String(e)));
  }, []);

  return (
    <div className="page">
      <div style={{ display: "flex", alignItems: "flex-end", gap: 12 }}>
        <h1 className="page-title">Prompts</h1>
        <span className="page-sub">Prompt library</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
        {err && <div className="card" style={{ padding: 16, color: "var(--color-danger)" }}>{err}</div>}
        {!data && !err && <div className="dim">Loading…</div>}
        {data && Object.keys(data).length === 0 && <div className="card" style={{ padding: 16 }}><div className="dim">No prompts.</div></div>}
        {data && Object.entries(data).map(([k, v], i) => (
          <motion.div
            key={k}
            className="card"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.04, 0.3), duration: 0.22 }}
            style={{ padding: 16 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Icon name="prompts" width={15} height={15} />
              <span style={{ fontWeight: 600, fontSize: 13, textTransform: "capitalize" }}>{k.replace(/-/g, " ")}</span>
            </div>
            <pre style={{
              margin: 0, whiteSpace: "pre-wrap", fontSize: 12.5, lineHeight: 1.55,
              fontFamily: "var(--font-mono)", color: "var(--color-ink-soft)",
              background: "rgba(0,0,0,0.25)", border: "1px solid var(--color-hairline)",
              borderRadius: 10, padding: 12, maxHeight: 320, overflowY: "auto",
            }}>{v}</pre>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
