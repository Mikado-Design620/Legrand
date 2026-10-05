import { BookText, FileText, User, Paperclip } from "lucide-react";
import type { ChatMessage } from "@/lib/chatbot/types";
import { RichBlockView } from "./RichBlocks";
import { BRAND } from "@/lib/brand";

type Props = {
  message: ChatMessage;
  onPrompt: (text: string) => void;
};

export function MessageBubble({ message, onPrompt }: Props) {
  const isUser = message.role === "user";

  return (
    <div className={`animate-fade-up flex w-full gap-4 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary shadow-glow">
          <img src={BRAND.mark} alt="Legrand" className="h-full w-full object-cover" />
        </div>
      )}

      <div className={`flex max-w-[78%] flex-col gap-3 ${isUser ? "items-end" : "items-start"}`}>
        {/* Assistant intermediate states */}
        {!isUser && message.state === "thinking" && (
          <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm">
            <span className="shimmer-text font-medium">Thinking</span>
            <span className="flex gap-1">
              {[0, 150, 300].map((d) => (
                <span key={d} className="h-1 w-1 animate-pulse rounded-full bg-primary" style={{ animationDelay: `${d}ms` }} />
              ))}
            </span>
          </div>
        )}

        {!isUser && message.state === "searching" && (
          <div className="flex flex-col gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
            <div className="flex items-center gap-2 text-sm">
              <BookText className="h-3.5 w-3.5 text-primary" />
              <span className="shimmer-text font-medium">Searching Legrand Knowledge…</span>
            </div>
            <div className="flex flex-col gap-1.5">
              {["SPD Catalogue 2024", "IEC 61643-11 Standards", "Installation Manual"].map((s, i) => (
                <div key={s} className="flex items-center gap-2 text-xs text-muted-foreground" style={{ opacity: 0, animation: `fade-up 0.4s ${i * 250}ms forwards` }}>
                  <span className="h-1 w-1 rounded-full bg-accent" />
                  <span>Retrieving · {s}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Attachment chip on user message */}
        {isUser && message.attachment && (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-xs">
            <Paperclip className="h-3 w-3 text-muted-foreground" />
            <span className="font-medium text-foreground">{message.attachment.name}</span>
            <span className="text-muted-foreground">· {message.attachment.type}</span>
          </div>
        )}

        {/* Text body */}
        {message.text !== undefined && message.text.length > 0 && (
          <div
            className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-elegant ${
              isUser
                ? "bg-gradient-primary text-primary-foreground"
                : "border border-border bg-card text-card-foreground"
            }`}
          >
            <span className="whitespace-pre-wrap">{message.text}</span>
            {message.streaming && <span className="ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 animate-cursor bg-current" />}
          </div>
        )}

        {/* Rich blocks */}
        {message.blocks?.map((b, i) => (
          <div key={i} className="w-full max-w-2xl">
            <RichBlockView block={b} onPrompt={onPrompt} />
          </div>
        ))}

        {/* Citations */}
        {!isUser && message.citations && message.citations.length > 0 && (
          <div className="flex flex-col gap-1.5 rounded-xl border border-border/60 bg-surface/60 p-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Sources
            </span>
            <div className="flex flex-wrap gap-2">
              {message.citations.map((c, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs"
                >
                  <FileText className="h-3 w-3 text-primary" />
                  <span className="font-medium text-foreground">{c.title}</span>
                  {c.page && <span className="text-muted-foreground">· {c.page}</span>}
                  <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary">
                    {c.source}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Follow-ups */}
        {!isUser && message.suggestions && message.suggestions.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              You may also ask
            </span>
            <div className="flex flex-wrap gap-2">
              {message.suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => onPrompt(s)}
                  className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-foreground transition hover:border-primary hover:bg-primary/5 hover:text-primary"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {isUser && (
        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-surface">
          <User className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
