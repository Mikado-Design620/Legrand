import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";

export type TourStep = {
  /** Matches a `data-tour="…"` attribute in the workspace. */
  target: string;
  title: string;
  body: string;
  hint?: string;
};

export const TOUR_STEPS: TourStep[] = [
  {
    target: "viewer",
    title: "The SPD digital twin",
    body: "A 3D model of a Legrand Type 2 surge protection device. Drag to rotate it and scroll to zoom.",
    hint: "Tap any red pin to inspect that component.",
  },
  {
    target: "viewer-actions",
    title: "Take it apart, then test it",
    body: "Explode separates the module into its parts. Surge sim shows how the SPD diverts a voltage spike to earth.",
  },
  {
    target: "trainer",
    title: "Your live AI trainer",
    body: "The trainer explains whatever you're looking at and speaks its answers. Use the speaker icon to mute it.",
  },
  {
    target: "chat",
    title: "Conversation & knowledge",
    body: "Answers, diagrams and specs appear here. Not sure where to start? Tap one of the suggested questions.",
  },
  {
    target: "composer",
    title: "Ask anything about SPDs",
    body: "Type a question, or tap the microphone to ask out loud. Answers come only from Legrand documentation.",
  },
  {
    target: "progress",
    title: "Track your progress",
    body: "Inspect all six components to complete the module. Reset starts the session over.",
  },
  {
    target: "help",
    title: "Need this again?",
    body: "Open the Guide at any time to replay the introduction and this tour.",
  },
];

type Rect = { top: number; left: number; width: number; height: number };

const PAD = 8; // spotlight padding around the target
const CARD_W = 340;
const GAP = 14;

function findTarget(name: string): HTMLElement | null {
  const els = Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`));
  // pick the first one that's actually laid out (hidden md:flex elements have no box)
  return els.find((el) => el.getClientRects().length > 0 && el.offsetWidth > 0) ?? null;
}

type Props = {
  onFinish: () => void;
};

export function GuidedTour({ onFinish }: Props) {
  // drop steps whose target isn't on screen at this viewport size (e.g. progress on mobile)
  const [steps] = useState(() => TOUR_STEPS.filter((s) => findTarget(s.target)));
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardH, setCardH] = useState(180);

  const step = steps[index];
  const last = index === steps.length - 1;

  const measure = useCallback(() => {
    if (!step) return;
    const el = findTarget(step.target);
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [step]);

  // bring the target into view when the step changes, then measure
  useEffect(() => {
    if (!step) return;
    const el = findTarget(step.target);
    el?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
    measure();
    const t = window.setTimeout(measure, 350);
    return () => window.clearTimeout(t);
  }, [step, measure]);

  useEffect(() => {
    let raf = 0;
    const onChange = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };
    window.addEventListener("resize", onChange);
    window.addEventListener("scroll", onChange, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onChange);
      window.removeEventListener("scroll", onChange, true);
    };
  }, [measure]);

  useLayoutEffect(() => {
    if (cardRef.current) setCardH(cardRef.current.offsetHeight);
  }, [index, rect]);

  const next = useCallback(() => (last ? onFinish() : setIndex((i) => i + 1)), [last, onFinish]);
  const back = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFinish();
      else if (e.key === "ArrowRight" || e.key === "Enter") next();
      else if (e.key === "ArrowLeft") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, back, onFinish]);

  useEffect(() => {
    if (steps.length === 0) onFinish();
  }, [steps.length, onFinish]);

  if (!step) return null;

  // ---- card placement: below → above → right → left → centred ----
  const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const cardW = Math.min(CARD_W, vw - 32);
  let cardTop = vh / 2 - cardH / 2;
  let cardLeft = vw / 2 - cardW / 2;

  if (rect) {
    const s = {
      top: rect.top - PAD,
      left: rect.left - PAD,
      right: rect.left + rect.width + PAD,
      bottom: rect.top + rect.height + PAD,
    };
    const centredX = rect.left + rect.width / 2 - cardW / 2;
    const centredY = rect.top + rect.height / 2 - cardH / 2;
    if (vh - s.bottom >= cardH + GAP) {
      cardTop = s.bottom + GAP;
      cardLeft = centredX;
    } else if (s.top >= cardH + GAP) {
      cardTop = s.top - GAP - cardH;
      cardLeft = centredX;
    } else if (vw - s.right >= cardW + GAP) {
      cardLeft = s.right + GAP;
      cardTop = centredY;
    } else if (s.left >= cardW + GAP) {
      cardLeft = s.left - GAP - cardW;
      cardTop = centredY;
    } else {
      // target fills the screen: float the card inside it, near the bottom
      cardTop = Math.min(s.bottom, vh) - cardH - 24;
      cardLeft = centredX;
    }
    cardLeft = Math.max(16, Math.min(cardLeft, vw - cardW - 16));
    cardTop = Math.max(16, Math.min(cardTop, vh - cardH - 16));
  }

  return (
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      {/* click-blocker so the app can't be used mid-tour */}
      <div className="absolute inset-0" onClick={(e) => e.stopPropagation()} />

      {/* spotlight */}
      {rect ? (
        <div
          aria-hidden
          className="pointer-events-none absolute rounded-2xl ring-2 ring-primary transition-all duration-300 ease-out"
          style={{
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            boxShadow: "0 0 0 9999px rgba(15, 17, 20, 0.62), 0 0 32px rgba(237, 28, 36, 0.45)",
          }}
        />
      ) : (
        <div aria-hidden className="absolute inset-0 bg-black/60" />
      )}

      {/* step card */}
      <div
        ref={cardRef}
        key={index}
        className="animate-fade-up absolute rounded-2xl bg-card p-5 shadow-2xl transition-[top,left] duration-300 ease-out"
        style={{ top: cardTop, left: cardLeft, width: cardW }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.2em] text-primary">
            Step {index + 1} of {steps.length}
          </div>
          <button
            onClick={onFinish}
            aria-label="Skip tour"
            className="-mr-1 -mt-1 flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <h3 id="tour-title" className="mt-1.5 text-base font-semibold text-foreground">
          {step.title}
        </h3>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{step.body}</p>
        {step.hint && (
          <p className="mt-2.5 rounded-lg bg-primary/8 px-3 py-2 text-[12px] font-medium text-primary">
            {step.hint}
          </p>
        )}

        <div className="mt-4 flex items-center justify-between">
          <div className="flex gap-1.5" aria-hidden>
            {steps.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === index ? "w-5 bg-primary" : i < index ? "w-1.5 bg-primary/40" : "w-1.5 bg-border-strong"
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            {index > 0 && (
              <button
                onClick={back}
                aria-label="Previous step"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-foreground/70 transition-colors hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              onClick={next}
              autoFocus
              className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-[13px] font-semibold text-primary-foreground shadow-glow focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              {last ? (
                <>
                  Start exploring <Check className="h-3.5 w-3.5" />
                </>
              ) : (
                <>
                  Next <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
