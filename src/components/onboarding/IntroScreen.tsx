import { useEffect, useRef } from "react";
import { ArrowRight, Bot, Box, ListChecks, ShieldCheck, X } from "lucide-react";
import { BRAND } from "@/lib/brand";

type Props = {
  firstVisit: boolean;
  onStartTour: () => void;
  onSkip: () => void;
};

const FEATURES = [
  {
    icon: Box,
    title: "Explore the digital twin",
    body: "Rotate a 3D Type 2 SPD, explode it into parts and tap the red pins to inspect each component.",
  },
  {
    icon: Bot,
    title: "Ask the AI trainer",
    body: "Type or speak a question. The trainer answers out loud and only from approved Legrand documentation.",
  },
  {
    icon: ListChecks,
    title: "Track your progress",
    body: "Inspect all six components to complete the module. Run a surge simulation to see the SPD at work.",
  },
];

const LEARN = [
  "What an SPD does and where it sits in a board",
  "Type 1 vs Type 2 selection",
  "The 50 cm wiring rule",
  "Reading status indicators and markings",
];

export function IntroScreen({ firstVisit, onStartTour, onSkip }: Props) {
  const primaryRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    primaryRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onSkip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onSkip]);

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-black/55 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="intro-title"
    >
      <div className="animate-fade-up relative my-auto w-full max-w-3xl overflow-hidden rounded-3xl bg-card shadow-2xl">
        <button
          onClick={onSkip}
          aria-label="Close introduction"
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Brand band */}
        <div className="relative bg-primary px-7 pb-7 pt-6 text-primary-foreground sm:px-10">
          <img src={BRAND.logoWhite} alt="Legrand" className="h-6 w-auto" />
          <div className="mt-6 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/75">
            {firstVisit ? "Welcome" : "Introduction"}
          </div>
          <h2 id="intro-title" className="mt-2 text-balance text-2xl font-semibold leading-tight sm:text-3xl">
            Your hands-on training for Legrand surge protection devices
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/85">
            This workspace pairs a live 3D model of a Type 2 SPD with an AI trainer, so you can see each
            part, ask about it and hear the answer, all in one place.
          </p>
        </div>

        <div className="grid gap-6 px-7 py-7 sm:px-10 md:grid-cols-[1.4fr_1fr]">
          <div className="space-y-4">
            {FEATURES.map(({ icon: Icon, title, body }, i) => (
              <div key={title} className="flex gap-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-[18px] w-[18px]" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">
                    <span className="mr-1.5 text-muted-foreground">{i + 1}.</span>
                    {title}
                  </div>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">{body}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-border bg-surface p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-foreground/70">
              What you'll learn
            </div>
            <ul className="mt-3 space-y-2">
              {LEARN.map((l) => (
                <li key={l} className="flex gap-2 text-[13px] leading-snug text-foreground/85">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {l}
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-start gap-2 border-t border-border pt-3 text-[11.5px] leading-snug text-muted-foreground">
              <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0 text-brand-blue" />
              Answers are restricted to approved Legrand technical documentation.
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse items-stretch gap-2 border-t border-border bg-surface/60 px-7 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-10">
          <button
            onClick={onSkip}
            className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Skip, I'll explore on my own
          </button>
          <button
            ref={primaryRef}
            onClick={onStartTour}
            className="flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:translate-x-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Start the 1-minute tour
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
