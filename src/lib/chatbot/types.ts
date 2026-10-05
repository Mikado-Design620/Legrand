export type AgentState =
  | "idle"
  | "listening"
  | "thinking"
  | "searching"
  | "speaking";

export type MessageRole = "user" | "assistant";

export type Citation = {
  title: string;
  source: string;
  page?: string;
};

export type SpecRow = { label: string; value: string; note?: string };

export type RichBlock =
  | { kind: "text"; content: string }
  | { kind: "spec"; title: string; rows: SpecRow[] }
  | { kind: "compare"; title: string; columns: string[]; rows: string[][] }
  | { kind: "lesson"; title: string; steps: string[]; progress: number }
  | { kind: "clarify"; prompt: string; options: string[] }
  | { kind: "low-confidence"; note: string }
  | { kind: "no-answer" }
  | { kind: "off-topic" }
  | { kind: "error" }
  | { kind: "image"; src: string; alt: string; caption?: string; title?: string }
  | { kind: "attachment-analysis"; filename: string; findings: string[] };

export type ChatMessage = {
  id: string;
  role: MessageRole;
  text?: string;            // plain text or assistant streaming buffer
  blocks?: RichBlock[];
  citations?: Citation[];
  suggestions?: string[];
  attachment?: { name: string; type: string };
  streaming?: boolean;
  state?: "thinking" | "searching" | "responding" | "done";
  createdAt: number;
};

export type ScenarioKind =
  | "greeting"
  | "technical"
  | "compare"
  | "install"
  | "learning"
  | "followup"
  | "clarify"
  | "off-topic"
  | "no-answer"
  | "low-confidence"
  | "attachment"
  | "general";
