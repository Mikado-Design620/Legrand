import { HOTSPOTS, getHotspot, type HotspotId } from "./spdData";
import { BookOpen, CheckCircle2, Lightbulb, Zap } from "lucide-react";

type Props = {
  activeHotspot: HotspotId | null;
  onSelect: (id: HotspotId) => void;
  onSimulate: () => void;
  surging: boolean;
  progress: { id: HotspotId; done: boolean }[];
};

export function KnowledgePanel({ activeHotspot, onSelect, onSimulate, surging, progress }: Props) {
  const hs = activeHotspot ? getHotspot(activeHotspot) : null;
  const completed = progress.filter((p) => p.done).length;

  return (
    <aside className="flex h-full w-full flex-col overflow-hidden border-r border-border bg-surface/60">
      {/* Header */}
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          <BookOpen className="h-3.5 w-3.5" /> Knowledge Context
        </div>
        <div className="mt-1 text-sm font-semibold text-foreground">
          {hs ? hs.title : "SPD Learning Path"}
        </div>
      </div>

      {/* Body */}
      <div className="scroll-area flex-1 overflow-y-auto px-5 py-5">
        {hs ? (
          <div className="animate-fade-up space-y-5">
            <p className="text-sm leading-relaxed text-foreground/80">{hs.summary}</p>

            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Key points
              </div>
              <ul className="space-y-2">
                {hs.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-[13px] text-foreground/85">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Spec snapshot
              </div>
              <div className="divide-y divide-border">
                {hs.spec.map((s) => (
                  <div key={s.label} className="flex items-center justify-between py-2 text-[13px]">
                    <span className="text-muted-foreground">{s.label}</span>
                    <span className="font-medium text-foreground">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="rounded-2xl border border-dashed border-border bg-card/40 p-5 text-center">
              <Lightbulb className="mx-auto h-6 w-6 text-primary" />
              <div className="mt-2 text-sm font-medium text-foreground">
                Tap any red pin on the product
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                The AI Trainer will walk you through that component.
              </div>
            </div>

            <div>
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Components ({completed}/{HOTSPOTS.length})
              </div>
              <div className="grid grid-cols-2 gap-2">
                {HOTSPOTS.map((h) => {
                  const done = progress.find((p) => p.id === h.id)?.done;
                  return (
                    <button
                      key={h.id}
                      onClick={() => onSelect(h.id)}
                      className="group rounded-xl border border-border bg-card p-3 text-left transition-all hover:border-primary hover:shadow-glow"
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-[11px] font-semibold text-foreground">{h.label}</div>
                        {done && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                      </div>
                      <div className="mt-1 line-clamp-2 text-[10px] text-muted-foreground">
                        {h.summary}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Progress bar */}
        <div className="mt-6 rounded-2xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between text-[11px]">
            <span className="font-semibold text-foreground">Training progress</span>
            <span className="text-muted-foreground">{completed}/{HOTSPOTS.length}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-gradient-primary transition-all duration-500"
              style={{ width: `${(completed / HOTSPOTS.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Simulation CTA */}
      <div className="border-t border-border bg-surface px-5 py-4">
        <button
          onClick={onSimulate}
          className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all ${
            surging
              ? "bg-warning text-foreground"
              : "bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-95"
          }`}
        >
          <Zap className="h-4 w-4" />
          {surging ? "Stop surge simulation" : "Run surge simulation"}
        </button>
        <div className="mt-2 text-center text-[10px] text-muted-foreground">
          Watch the SPD divert a lightning-induced surge to earth.
        </div>
      </div>
    </aside>
  );
}
