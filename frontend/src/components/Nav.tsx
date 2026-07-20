"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";

const TABS = [
  { page: "brief", label: "Brief", icon: "brief" },
  { page: "missions", label: "Missions", icon: "missions" },
  { page: "intel", label: "Intelligence", icon: "intel" },
  { page: "agents", label: "Agents", icon: "agents" },
  { page: "trail", label: "Trail", icon: "trail" },
] as const;

const TOOLS = [
  { page: "chat", label: "AI Chat", icon: "chat" },
  { page: "dashboard", label: "Dashboard", icon: "dashboard" },
  { page: "skills", label: "Skills", icon: "skills" },
  { page: "memory", label: "Memory", icon: "memory" },
  { page: "brainstorm", label: "Brainstorm", icon: "brainstorm" },
  { page: "ide", label: "IDE", icon: "ide" },
  { page: "studio", label: "Studio", icon: "studio" },
  { page: "scheduler", label: "Scheduler", icon: "scheduler" },
  { page: "kanban", label: "Kanban Board", icon: "kanban" },
  { page: "goals", label: "Goals", icon: "goals" },
  { page: "journal", label: "Journal", icon: "journal" },
  { page: "agent-health", label: "Agent Health", icon: "health" },
  { page: "smart-router", label: "Smart Router", icon: "router" },
  { page: "learning-analytics", label: "Learning Analytics", icon: "analytics" },
  { page: "session-replay", label: "Session Replay", icon: "replay" },
  { page: "errors", label: "Error Dashboard", icon: "errors" },
  { page: "cost", label: "Cost Analytics", icon: "cost" },
  { page: "plugins", label: "Plugins", icon: "plugins" },
  { page: "backups", label: "Backups", icon: "backups" },
  { page: "prompts", label: "Prompts", icon: "prompts" },
  { page: "standards", label: "Standards", icon: "standards" },
  { page: "settings", label: "Settings", icon: "settings" },
] as const;

export function Nav() {
  const router = useRouter();
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);
  const active = pathname === "/" ? "brief" : pathname.replace("/", "");

  return (
    <>
      <header className="tabbar">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: 8 }}>
          <span
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              background: "var(--color-accent)",
              display: "inline-block",
            }}
          />
          <span style={{ fontWeight: 650, fontSize: 14, letterSpacing: "-0.01em" }}>Agentic OS</span>
        </div>

        {TABS.map((t) => {
          const isActive = active === t.page;
          return (
            <button
              key={t.page}
              className={`tab ${isActive ? "tab-active" : ""}`}
              onClick={() => router.push(t.page === "brief" ? "/" : `/${t.page}`)}
            >
              <Icon name={t.icon as never} width={16} height={16} />
              {t.label}
            </button>
          );
        })}

        <div style={{ marginLeft: "auto" }}>
          <button className="tab" onClick={() => setDrawer(true)}>
            <Icon name="tools" width={16} height={16} />
            Tools
          </button>
        </div>
      </header>

      <AnimatePresence>
        {drawer && (
          <>
            <motion.div
              className="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawer(false)}
            />
            <motion.aside
              className="drawer"
              initial={{ x: 300 }}
              animate={{ x: 0 }}
              exit={{ x: 300 }}
              transition={{ type: "spring", stiffness: 360, damping: 36 }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600 }}>Tools</h3>
                <button className="btn" style={{ padding: 6 }} onClick={() => setDrawer(false)} aria-label="Close">
                  <Icon name="close" width={16} height={16} />
                </button>
              </div>
              {TOOLS.map((t) => (
                <div
                  key={t.page}
                  className="drawer-item"
                  onClick={() => {
                    setDrawer(false);
                    router.push(`/${t.page}`);
                  }}
                >
                  <Icon name={t.icon as never} width={16} height={16} />
                  {t.label}
                </div>
              ))}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
