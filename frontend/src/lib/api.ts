// Typed API client. All routes proxied to FastAPI (:8090) via next.config rewrites.
// Base path is /api — same origin as the Next dev server, so no absolute URL needed.

async function get<T>(path: string): Promise<T> {
  const r = await fetch(`/api${path}`, { cache: "no-store" });
  if (!r.ok) throw new Error(`${path} -> ${r.status}`);
  return r.json() as Promise<T>;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(`/api${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`${path} -> ${r.status}`);
  return r.json() as Promise<T>;
}

export type Decision = {
  severity: "critical" | "high" | "medium" | "low";
  kind: string;
  title: string;
  detail: string;
  ref: string;
};

export type Brief = {
  generated: string;
  count: number;
  decisions: Decision[];
  summary: { critical: number; high: number; medium: number; low: number };
};

export type Mission = {
  id: string;
  title: string;
  owner: string;
  intended_result: string;
  confidence: number;
  next_decision: string;
  escalation: string;
  status: "blocked" | "active" | "done" | "paused" | string;
  evidence: unknown[];
  audit: { ts: string; actor: string; action: string; detail?: string }[];
  created: string;
  updated: string;
};

export type AgentControlEntry = {
  name: string;
  status: string;
  tier: string;
  autonomy: string;
  paused: boolean;
};

export type AgentControl = {
  agents: AgentControlEntry[];
};

export type TrailEntry = {
  ts: string;
  actor: string;
  action: string;
  detail?: string;
  mission?: string;
};

export type Skill = {
  name: string;
  description: string;
  has_learnings?: boolean;
  eval_criteria?: unknown[];
};

export type KanbanTask = {
  id: string;
  title: string;
  body: string;
  status: string;
  priority: "low" | "medium" | "high" | string;
  assignee: string;
  comments: unknown[];
  links: unknown[];
  created: string;
  updated: string;
  summary?: string;
  completed_at?: string | null;
  block_reason?: string;
};

export type KanbanBoard = {
  columns: Record<string, KanbanTask[]>;
};

export type SchedulerJob = {
  id: string;
  name: string;
  skill: string;
  cron: string;
  enabled: boolean;
  created: string;
  last_run: string | null;
  next_run: string | null;
};

export type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  ts?: string;
};

export const api = {
  brief: () => get<Brief>("/ops/brief"),
  missions: () => get<{ missions: Mission[] }>("/ops/missions"),
  agentControl: () => get<AgentControl>("/ops/agent-control"),
  audit: () => get<{ audit: TrailEntry[] }>("/ops/audit"),
  intelSignals: () => get<{ signals: unknown[] }>("/intel/signals"),
  intelPlugins: () => get<{ plugins: unknown[] }>("/intel/plugins"),
  intelPluginAudit: () => get<{ total: number; enabled: number; blocked: string[] }>("/intel/plugins/audit"),

  skills: () => get<Skill[]>("/skills"),
  kanban: () => get<KanbanBoard>("/kanban/board"),
  schedulerJobs: () => get<SchedulerJob[]>("/scheduler/jobs"),
  chatHistory: () => get<ChatMessage[]>("/chat/history"),
  chatSend: (message: string, agent = "hermes") =>
    post<{ reply?: string }>("/chat", { message, agent }),
};
