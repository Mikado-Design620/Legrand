import { Mic, X, Pause, Send } from "lucide-react";
import { useEffect, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit?: (text: string) => void;
};

export function VoiceOverlay({ open, onClose, onSubmit }: Props) {
  const [phase, setPhase] = useState<"listening" | "processing" | "speaking">("listening");
  const [transcript, setTranscript] = useState("");

  useEffect(() => {
    if (!open) return;
    setPhase("listening");
    setTranscript("");
    const lines = ["What is", "What is the difference", "What is the difference between Type 1 and Type 2 SPD?"];
    let i = 0;
    const t = setInterval(() => {
      if (i < lines.length) { setTranscript(lines[i]); i++; }
      else {
        clearInterval(t);
        setPhase("processing");
        setTimeout(() => setPhase("speaking"), 1200);
      }
    }, 700);
    return () => clearInterval(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter" && transcript && phase === "speaking") {
        e.preventDefault();
        handleSubmit();
      }
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, transcript, phase]);

  const handleSubmit = () => {
    if (!transcript) return;
    onSubmit?.(transcript);
    onClose();
  };

  if (!open) return null;

  const label =
    phase === "listening" ? "Listening" :
    phase === "processing" ? "Thinking" : "Speaking";

  const canSubmit = phase === "speaking" && transcript.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/90 backdrop-blur-xl">
      <button
        onClick={onClose}
        className="absolute right-6 top-6 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="relative flex h-72 w-72 items-center justify-center">
        <span className="absolute inset-0 animate-ring rounded-full border border-primary" />
        <span className="absolute inset-0 animate-ring rounded-full border border-accent" style={{ animationDelay: "0.7s" }} />
        <div className="h-56 w-56 animate-orb-pulse rounded-full bg-gradient-agent shadow-glow" />
      </div>

      <div className="mt-10 flex flex-col items-center gap-4">
        <span className="shimmer-text text-sm font-medium uppercase tracking-[0.3em]">{label}</span>
        <p className="max-w-md px-6 text-center text-2xl font-light leading-snug text-foreground">
          {transcript || "Say something to begin…"}
          {phase === "listening" && <span className="ml-1 inline-block h-5 w-[2px] translate-y-1 animate-cursor bg-foreground" />}
        </p>

        <div className="mt-6 flex h-12 items-center gap-1">
          {Array.from({ length: 32 }).map((_, i) => (
            <span
              key={i}
              className="w-1 animate-wave rounded-full bg-primary"
              style={{
                height: `${10 + ((i * 17) % 32)}px`,
                animationDelay: `${i * 50}ms`,
                opacity: phase === "processing" ? 0.4 : 1,
              }}
            />
          ))}
        </div>

        {canSubmit && (
          <button
            onClick={handleSubmit}
            className="animate-fade-up mt-4 flex items-center gap-2 rounded-full bg-gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-90"
          >
            <Send className="h-4 w-4" />
            Send to chat
            <span className="ml-1 rounded-md border border-primary-foreground/30 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider">
              Enter
            </span>
          </button>
        )}
      </div>

      <div className="absolute bottom-12 flex items-center gap-4">
        <button className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-surface text-foreground">
          <Pause className="h-5 w-5" />
        </button>
        <button
          onClick={onClose}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shadow-glow"
        >
          <Mic className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}
