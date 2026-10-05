import { useEffect, useState } from "react";
import { BRAND } from "@/lib/brand";

type Props = {
  /** Longer hold on a first visit so the brand moment registers; brief for returning users. */
  firstVisit: boolean;
  onDone: () => void;
};

export function SplashScreen({ firstVisit, onDone }: Props) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const hold = reduced ? 400 : firstVisit ? 2200 : 1000;
    const t1 = window.setTimeout(() => setLeaving(true), hold);
    const t2 = window.setTimeout(onDone, hold + 450);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [firstVisit, onDone]);

  return (
    <div
      role="status"
      aria-label="Loading Legrand SPD Training Workspace"
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-primary text-primary-foreground transition-opacity duration-[450ms] ${
        leaving ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      {/* subtle depth */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 40%, rgba(255,255,255,0.14), transparent 60%), radial-gradient(ellipse at 50% 120%, rgba(0,0,0,0.25), transparent 60%)",
        }}
      />

      <div className="splash-in relative flex flex-col items-center gap-8 px-6 text-center">
        <img src={BRAND.logoWhite} alt="Legrand" className="h-12 w-auto sm:h-16" />

        <div className="space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.32em] text-white/75">
            SPD Training Workspace
          </div>
          <div className="text-balance text-lg font-medium text-white sm:text-xl">
            Surge protection, learned hands-on.
          </div>
        </div>

        <div className="h-[3px] w-48 overflow-hidden rounded-full bg-white/25">
          <div
            className="splash-progress h-full rounded-full bg-white"
            style={{ animationDuration: firstVisit ? "2100ms" : "950ms" }}
          />
        </div>
      </div>

      <div className="absolute bottom-6 text-[10.5px] tracking-wide text-white/60">
        Interactive digital twin · AI trainer · Legrand documentation
      </div>
    </div>
  );
}
