import { Zap, GraduationCap, Wrench, ShieldCheck } from "lucide-react";
import { BRAND } from "@/lib/brand";

const QUICK = [
  { icon: Zap, label: "What is surge protection?" },
  { icon: ShieldCheck, label: "Difference between Type 1 and Type 2 SPD" },
  { icon: Wrench, label: "How do I install an SPD?" },
  { icon: GraduationCap, label: "Teach me SPD basics" },
];

export function WelcomeState({
  returning,
  onPrompt,
}: {
  returning: boolean;
  onPrompt: (s: string) => void;
}) {
  return (
    <div className="animate-fade-up mx-auto flex max-w-2xl flex-col items-center gap-8 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-primary shadow-glow">
        <img src={BRAND.mark} alt="Legrand" className="h-full w-full object-cover" />
      </div>

      <div className="space-y-3">
        <h1 className="text-balance text-3xl font-semibold tracking-tight text-foreground">
          {returning
            ? "Welcome back."
            : "Hello — I'm your Legrand SPD AI Trainer."}
        </h1>
        <p className="text-balance text-sm leading-relaxed text-muted-foreground">
          {returning
            ? "Would you like to continue learning about SPD installation, or start something new?"
            : "I can help with surge protection, SPD selection, installation, maintenance, and technical specifications — grounded in official Legrand documentation."}
        </p>
      </div>

      <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
        {QUICK.map(({ icon: Icon, label }) => (
          <button
            key={label}
            onClick={() => onPrompt(label)}
            className="group flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-left text-sm text-foreground transition hover:border-primary/50 hover:bg-primary/5"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition group-hover:bg-primary/20">
              <Icon className="h-4 w-4" />
            </span>
            <span className="font-medium">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
