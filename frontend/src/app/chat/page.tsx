"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { api, type ChatMessage } from "@/lib/api";
import { Icon } from "@/components/Icon";

export default function ChatPage() {
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.chatHistory().then(setMsgs).catch((e) => setErr(String(e)));
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setBusy(true);
    setErr(null);
    setMsgs((m) => [...m, { role: "user", content: text }]);
    setInput("");
    try {
      const r = await api.chatSend(text);
      setMsgs((m) => [...m, { role: "assistant", content: r.reply ?? "(no reply)" }]);
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page" style={{ display: "flex", flexDirection: "column", minHeight: "calc(100vh - 56px)" }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 12 }}>
        <h1 className="page-title">AI Chat</h1>
        <span className="page-sub">Multi-agent conversation</span>
      </div>

      <div className="card" style={{ flex: 1, marginTop: 16, padding: 16, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
        {err && <div style={{ color: "var(--color-danger)" }}>{err}</div>}
        {msgs.length === 0 && !err && <div className="dim">No messages yet. Say something.</div>}
        {msgs.map((m, i) => {
          const mine = m.role === "user";
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                alignSelf: mine ? "flex-end" : "flex-start",
                maxWidth: "78%",
                padding: "10px 14px",
                borderRadius: 12,
                background: mine ? "var(--color-accent-soft)" : "rgba(255,255,255,0.04)",
                border: "1px solid " + (mine ? "var(--color-accent-line)" : "var(--color-hairline)"),
                fontSize: 13.5,
                lineHeight: 1.5,
              }}
            >
              <span className="chip" style={{ marginBottom: 6 }}>{m.role}</span>
              <div style={{ whiteSpace: "pre-wrap" }}>{m.content}</div>
            </motion.div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Message the agents…"
          className="btn"
          style={{ flex: 1, background: "var(--color-bg-input)", color: "var(--color-ink)" }}
        />
        <button className="btn btn-primary" onClick={send} disabled={busy}>
          <Icon name="chat" width={16} height={16} />
          {busy ? "…" : "Send"}
        </button>
      </div>
    </div>
  );
}
