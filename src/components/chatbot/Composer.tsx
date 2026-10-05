import { useRef, useState, type FormEvent } from "react";
import { ArrowUp, Mic, Paperclip, Square } from "lucide-react";

type Props = {
  disabled?: boolean;
  onSend: (text: string, attachment?: { name: string; type: string }) => void;
  onStartVoice: () => void;
  onStop?: () => void;
  streaming?: boolean;
};

export function Composer({ disabled, onSend, onStartVoice, onStop, streaming }: Props) {
  const [value, setValue] = useState("");
  const [attach, setAttach] = useState<{ name: string; type: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (streaming) return onStop?.();
    if (!value.trim() && !attach) return;
    onSend(value.trim() || "Please analyze this attachment.", attach ?? undefined);
    setValue("");
    setAttach(null);
  };

  return (
    <form onSubmit={submit} className="px-6 pb-6 pt-2">
      <div className="glass mx-auto flex max-w-3xl flex-col gap-2 rounded-2xl p-3 shadow-elegant">
        {attach && (
          <div className="flex items-center gap-2 self-start rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs">
            <Paperclip className="h-3 w-3 text-primary" />
            <span className="font-medium text-foreground">{attach.name}</span>
            <button type="button" onClick={() => setAttach(null)} className="text-muted-foreground hover:text-destructive">
              ✕
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-muted-foreground transition hover:text-foreground"
            aria-label="Attach"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setAttach({ name: f.name, type: f.type.split("/")[1]?.toUpperCase() || "FILE" });
            }}
          />

          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit(e as unknown as FormEvent);
              }
            }}
            rows={1}
            placeholder="Ask about SPD selection, installation, specs…"
            className="max-h-40 min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            disabled={disabled && !streaming}
          />

          <button
            type="button"
            onClick={onStartVoice}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-muted-foreground transition hover:text-foreground"
            aria-label="Voice"
          >
            <Mic className="h-4 w-4" />
          </button>

          <button
            type="submit"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow transition hover:opacity-90 disabled:opacity-40"
            disabled={!streaming && !value.trim() && !attach}
            aria-label={streaming ? "Stop" : "Send"}
          >
            {streaming ? <Square className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" strokeWidth={2.5} />}
          </button>
        </div>
        <div className="px-2 text-[10px] text-muted-foreground">
          AI responses are based on Legrand's technical knowledge documentation base.
        </div>
      </div>
    </form>
  );
}
