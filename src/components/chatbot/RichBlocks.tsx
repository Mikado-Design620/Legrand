import { AlertTriangle, BookOpen, CheckCircle2, FileQuestion, Image as ImageIcon, Info, ShieldAlert } from "lucide-react";
import type { RichBlock } from "@/lib/chatbot/types";

export function RichBlockView({ block, onPrompt }: { block: RichBlock; onPrompt: (s: string) => void }) {
  switch (block.kind) {
    case "text":
      return <p className="whitespace-pre-wrap leading-relaxed">{block.content}</p>;

    case "spec":
      return (
        <div className="overflow-hidden rounded-xl border border-border bg-surface-elevated">
          <div className="flex items-center gap-2 border-b border-border bg-surface px-4 py-2.5">
            <Info className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {block.title}
            </span>
          </div>
          <div className="divide-y divide-border/60">
            {block.rows.map((r) => (
              <div key={r.label} className="grid grid-cols-[120px_1fr] gap-4 px-4 py-2.5 text-sm">
                <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">{r.label}</span>
                <div>
                  <div className="font-medium text-foreground">{r.value}</div>
                  {r.note && <div className="text-xs text-muted-foreground">{r.note}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    case "compare":
      return (
        <div className="overflow-hidden rounded-xl border border-border bg-surface-elevated">
          <div className="border-b border-border bg-surface px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {block.title}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface/50">
                  {block.columns.map((c, i) => (
                    <th key={i} className={`px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider ${i === 0 ? "text-muted-foreground" : "text-primary"}`}>
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, ri) => (
                  <tr key={ri} className="border-t border-border/60">
                    {row.map((cell, ci) => (
                      <td key={ci} className={`px-4 py-2.5 align-top ${ci === 0 ? "text-xs uppercase tracking-wider text-muted-foreground" : "text-foreground"}`}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );

    case "lesson":
      return (
        <div className="rounded-xl border border-border bg-surface-elevated p-4">
          <div className="mb-3 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-accent" />
            <span className="text-sm font-semibold text-foreground">{block.title}</span>
          </div>
          <ol className="space-y-2">
            {block.steps.map((s, i) => {
              const done = i < block.progress;
              const current = i === block.progress;
              return (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${
                      done ? "border-success bg-success/20 text-success"
                      : current ? "border-primary bg-primary/20 text-primary"
                      : "border-border text-muted-foreground"
                    }`}
                  >
                    {done ? "✓" : i + 1}
                  </span>
                  <span className={current ? "text-foreground" : done ? "text-muted-foreground line-through" : "text-muted-foreground"}>
                    {s}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      );

    case "clarify":
      return (
        <div className="rounded-xl border border-border bg-surface-elevated p-4">
          <div className="mb-3 flex items-center gap-2">
            <FileQuestion className="h-4 w-4 text-accent" />
            <span className="text-sm text-foreground">{block.prompt}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {block.options.map((o) => (
              <button
                key={o}
                onClick={() => onPrompt(o)}
                className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-foreground transition hover:border-primary hover:text-primary"
              >
                {o}
              </button>
            ))}
          </div>
        </div>
      );

    case "low-confidence":
      return (
        <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/5 p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <div className="text-xs text-foreground/90">
            <div className="font-semibold text-warning">Low confidence</div>
            <div className="text-muted-foreground">{block.note}</div>
          </div>
        </div>
      );

    case "no-answer":
      return (
        <div className="rounded-xl border border-border bg-surface-elevated p-4">
          <div className="mb-2 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">No reliable answer found</span>
          </div>
          <p className="text-sm text-muted-foreground">
            I could not find a reliable answer in the current Legrand knowledge base. Try rephrasing,
            a related topic, or check another guide.
          </p>
        </div>
      );

    case "off-topic":
      return (
        <div className="mt-2 flex flex-wrap gap-2">
          {[
            "What is an electrical surge?",
            "Difference between Type 1 and Type 2 SPD",
            "What causes 80% of surges?",
            "Teach me SPD basics",
          ].map((o) => (
            <button
              key={o}
              onClick={() => onPrompt(o)}
              className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-foreground transition hover:border-primary hover:bg-primary/5 hover:text-primary"
            >
              {o}
            </button>
          ))}
        </div>
      );

    case "error":
      return (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <div className="font-semibold text-destructive">Something interrupted the response.</div>
          <div className="mt-1 text-muted-foreground">Please try again.</div>
        </div>
      );

    case "attachment-analysis":
      return (
        <div className="rounded-xl border border-border bg-surface-elevated p-4">
          <div className="mb-2 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <span className="text-sm font-semibold text-foreground">Analysis · {block.filename}</span>
          </div>
          <ul className="space-y-1.5 text-sm text-foreground/90">
            {block.findings.map((f, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-primary">›</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      );

    case "image":
      return (
        <figure className="overflow-hidden rounded-xl border border-border bg-surface-elevated">
          {block.title && (
            <figcaption className="flex items-center gap-2 border-b border-border bg-surface px-4 py-2.5">
              <ImageIcon className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {block.title}
              </span>
            </figcaption>
          )}
          <div className="bg-white p-3">
            <img
              src={block.src}
              alt={block.alt}
              loading="lazy"
              className="mx-auto h-auto w-full max-w-full rounded-md object-contain"
            />
          </div>
          {block.caption && (
            <figcaption className="border-t border-border bg-surface/50 px-4 py-2 text-xs text-muted-foreground">
              {block.caption}
            </figcaption>
          )}
        </figure>
      );
  }
}
