"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api, type CostView } from "@/lib/api";
import { Icon } from "@/components/Icon";

export default function CostPage() {
  const [data, setData] = useState<CostView | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.cost().then(setData).catch((e) => setErr(String(e)));
  }, []);

  return (
    <div className="page">
      <div style={{ display: "flex", alignItems: "flex-end", gap: 12 }}>
        <h1 className="page-title">Cost</h1>
        <span className="page-sub">Spend &amp; projections</span>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        {err && <div className="row" style={{ color: "var(--color-danger)" }}>{err}</div>}
        {!data && !err && <div className="row dim">Loading…</div>}
        {data && (
          <>
            <div style={{ padding: "18px 16px", borderBottom: "1px solid var(--color-hairline)" }}>
              <div className="dim" style={{ fontSize: 12 }}>Monthly projection</div>
              <div className="tnum" style={{ fontSize: 30, fontWeight: 600, color: "var(--color-accent)" }}>
                ${Number(data.monthly_projection).toLocaleString()}
              </div>
            </div>
            <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--color-hairline)" }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Daily totals</h3>
              {Object.keys(data.daily_totals).length === 0 && <div className="dim">No spend recorded.</div>}
              {Object.entries(data.daily_totals).map(([day, amt], i) => (
                <motion.div
                  key={day}
                  className="row"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.22 }}
                >
                  <span className="tnum muted">{day}</span>
                  <span className="tnum" style={{ marginLeft: "auto", fontWeight: 550 }}>${Number(amt).toLocaleString()}</span>
                </motion.div>
              ))}
            </div>
            {data.free_tier_alerts.length > 0 && (
              <div style={{ padding: "14px 16px" }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Free-tier alerts</h3>
                {data.free_tier_alerts.map((a, i) => (
                  <div key={i} className="row" style={{ color: "var(--color-warn)" }}>{String(a)}</div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
