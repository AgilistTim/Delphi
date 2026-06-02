// In-memory fixture data for the Phase 1 UI.
// Real data layer wires to Supabase in a later PR per Delphi Hosted Build Brief §6.

export type SessionStatus = "running" | "complete" | "errored";

export interface DemoSession {
  id: string;
  title: string;
  createdAt: string;
  status: SessionStatus;
  verdict: "conditional" | "strong" | "against" | null;
  tokens: number;
  pdfReady: boolean;
  roundCurrent?: number;
  roundTotal?: number;
}

export const DEMO_SESSIONS: DemoSession[] = [
  {
    id: "3a1f",
    title: "Kafka → RabbitMQ migration",
    createdAt: "3 Apr",
    status: "complete",
    verdict: "conditional",
    tokens: 47000,
    pdfReady: true
  },
  {
    id: "4f2a",
    title: "Deprecate free tier?",
    createdAt: "Today",
    status: "complete",
    verdict: "conditional",
    tokens: 42000,
    pdfReady: true
  }
];

export const PANEL = [
  { name: "Dr Renu", role: "methodology skeptic", confidence: 7 },
  { name: "JP Klein", role: "implementation realist", confidence: 6 },
  { name: "Maya W", role: "ethics maximalist", confidence: 5 },
  { name: "A Hoyle", role: "operator pragmatist", confidence: 6 },
  { name: "K Tanaka", role: "data skeptic", confidence: 7 }
];

export const ADMIN_QUEUE = [
  {
    id: 41,
    name: "Sarah Adewale",
    company: "Acme",
    role: "Head of Strategy",
    context: "Whether to deprecate our free tier given margin pressure from the board.",
    ageHours: 2,
    stale: false
  },
  {
    id: 40,
    name: "Marcus Volk",
    company: "LoomCo",
    role: "Director, Risk",
    context: "Migration off legacy supplier — 30-day window, audit implications.",
    ageHours: 27,
    stale: true
  },
  {
    id: 39,
    name: "Priya Kannan",
    company: "(unknown)",
    role: "PM",
    context: "Should we raise or bootstrap our next stage?",
    ageHours: 72,
    stale: true
  }
];

export const ADMIN_METRICS = [
  { key: "requests", value: "24", sub: "+8 wk" },
  { key: "approved", value: "17", sub: "71%" },
  { key: "first-session", value: "13", sub: "76% of approved" },
  { key: "completed", value: "31", sub: "1.8/user" },
  { key: "calls booked", value: "4", sub: "★ north star" },
  { key: "cap-hit", value: "3", sub: "wall of conversion" }
];
