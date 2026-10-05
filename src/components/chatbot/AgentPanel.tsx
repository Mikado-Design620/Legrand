import { Mic, Languages } from "lucide-react";
import type { AgentState } from "@/lib/chatbot/types";
import { BRAND } from "@/lib/brand";

type Props = {
  state: AgentState;
  language: "EN" | "HI";
  onToggleLanguage: () => void;
  onStartVoice: () => void;
};

const STATE_LABEL: Record<AgentState, string> = {
  idle: "Ready",
  listening: "Listening…",
  thinking: "Thinking…",
  searching: "Searching Legrand Knowledge…",
  speaking: "Speaking",
};

const STATE_COLOR: Record<AgentState, string> = {
  idle: "var(--success)",
  listening: "var(--accent)",
  thinking: "var(--primary)",
  searching: "var(--primary-glow)",
  speaking: "var(--accent)",
};

export function AgentPanel({ state, language, onToggleLanguage, onStartVoice }: Props) {
  const orbAnim =
    state === "thinking" || state === "searching" ? "animate-orb-think"
    : state === "speaking" ? "animate-orb-speak"
    : "animate-orb-pulse";

  return (
    <aside className="flex h-full flex-col gap-6 border-r border-border bg-gradient-surface p-8">
      {/* Identity */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-primary shadow-glow">
          <img src={BRAND.mark} alt="Legrand" className="h-full w-full object-cover" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Legrand
          </span>
          <span className="text-sm font-semibold text-foreground">SPD AI Trainer</span>
        </div>
      </div>

      {/* Orb */}
      <div className="relative mx-auto my-6 flex h-64 w-64 items-center justify-center">
        {(state === "listening" || state === "speaking" || state === "searching") && (
          <>
            <span
              className="absolute inset-0 animate-ring rounded-full border"
              style={{ borderColor: STATE_COLOR[state] }}
            />
            <span
              className="absolute inset-0 animate-ring rounded-full border"
              style={{ borderColor: STATE_COLOR[state], animationDelay: "0.8s" }}
            />
          </>
        )}
        <div
          className={`relative h-44 w-44 rounded-full bg-gradient-agent shadow-glow ${orbAnim}`}
          style={{
            boxShadow: `0 0 80px ${STATE_COLOR[state]}, inset 0 4px 30px oklch(1 0 0 / 0.1)`,
          }}
        >
          <div className="absolute inset-6 rounded-full bg-gradient-to-br from-white/20 to-transparent blur-md" />
          <div className="absolute left-10 top-10 h-8 w-8 rounded-full bg-white/40 blur-lg" />
        </div>
      </div>

      {/* State */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: STATE_COLOR[state], boxShadow: `0 0 8px ${STATE_COLOR[state]}` }}
          />
          <span className={state === "thinking" || state === "searching" ? "shimmer-text text-sm font-medium" : "text-sm font-medium text-foreground"}>
            {STATE_LABEL[state]}
          </span>
        </div>

        {/* Waveform */}
        <div className="flex h-10 items-center gap-[3px]">
          {Array.from({ length: 18 }).map((_, i) => {
            const active = state === "listening" || state === "speaking";
            return (
              <span
                key={i}
                className={`w-[3px] rounded-full ${active ? "animate-wave" : ""}`}
                style={{
                  height: active ? `${10 + ((i * 13) % 26)}px` : "4px",
                  background: active ? STATE_COLOR[state] : "var(--border-strong)",
                  animationDelay: `${i * 70}ms`,
                  transition: "height 0.3s ease",
                }}
              />
            );
          })}
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-3">
        <button
          onClick={onStartVoice}
          className="group flex items-center justify-center gap-2 rounded-xl bg-gradient-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-elegant transition hover:opacity-90"
        >
          <Mic className="h-4 w-4" />
          Start Voice Mode
        </button>
        <button
          onClick={onToggleLanguage}
          className="flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
        >
          <Languages className="h-3.5 w-3.5" />
          Language · <span className="text-foreground">{language === "EN" ? "English" : "हिन्दी"}</span>
        </button>
        <div className="rounded-lg border border-border/50 bg-surface/50 px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">
          RAG · Legrand Manuals · Catalogues · Standards
        </div>
      </div>
    </aside>
  );
}
