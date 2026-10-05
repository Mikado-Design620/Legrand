import { useCallback, useState } from "react";
import { ProductViewer } from "./ProductViewer";
import { TrainerPanel } from "./TrainerPanel";
import { HOTSPOTS, type HotspotId } from "./spdData";
import { CircleHelp, RotateCcw } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { Onboarding } from "@/components/onboarding/Onboarding";
import { useOnboarding } from "@/components/onboarding/useOnboarding";

export function WorkspaceScreen() {
  const [activeHotspot, setActiveHotspot] = useState<HotspotId | null>(null);
  const [exploded, setExploded] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [surging, setSurging] = useState(false);
  const [visited, setVisited] = useState<HotspotId[]>([]);
  const [chatResetKey, setChatResetKey] = useState(0);
  const onboarding = useOnboarding();

  const markVisited = (id: HotspotId) =>
    setVisited((v) => (v.includes(id) ? v : [...v, id]));

  const handleHotspot = useCallback((id: HotspotId) => {
    setActiveHotspot(id);
    setAutoRotate(false);
    markVisited(id);
  }, []);

  const handleSimulate = useCallback(() => {
    setSurging((s) => !s);
  }, []);

  const handleExplode = useCallback(() => {
    setExploded((e) => !e);
  }, []);

  const handleReset = () => {
    setActiveHotspot(null);
    setExploded(false);
    setSurging(false);
    setAutoRotate(true);
    setVisited([]);
    setChatResetKey((k) => k + 1);
  };

  const completed = visited.length;
  const total = HOTSPOTS.length;

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background">
      {/* Top bar */}
      <header className="flex shrink-0 items-center justify-between border-b border-border bg-surface/70 px-5 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex h-10 items-center bg-primary px-3">
            <img src={BRAND.logoWhite} alt="Legrand" className="h-5 w-auto" />
          </div>
          <div className="border-l border-border pl-3">
            <div className="text-sm font-semibold text-foreground">SPD Training Workspace</div>
            <div className="text-[11px] text-muted-foreground">
              Interactive digital twin · Type 2 Surge Protection Device
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div
            data-tour="progress"
            className="hidden items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-[11px] text-muted-foreground md:flex"
          >
            <span className="font-semibold text-foreground">{completed}/{total}</span> components explored
            <div className="h-1 w-20 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-gradient-primary transition-all duration-500"
                style={{ width: `${(completed / total) * 100}%` }}
              />
            </div>
          </div>
          <button
            data-tour="help"
            onClick={onboarding.replay}
            title="Open the introduction and guided tour"
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground/80 transition-colors hover:border-brand-blue hover:text-brand-blue"
          >
            <CircleHelp className="h-3.5 w-3.5" /> Guide
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 rounded-lg bg-gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </button>
        </div>
      </header>

      {/* 3-column layout */}
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-3">
        <main className="relative min-h-0 p-4">
          <ProductViewer
            activeHotspot={activeHotspot}
            onHotspot={handleHotspot}
            exploded={exploded}
            autoRotate={autoRotate}
            surging={surging}
            onExplode={handleExplode}
            onSurge={handleSimulate}
          />
        </main>

        <TrainerPanel
          activeHotspot={activeHotspot}
          surging={surging}
          onSuggest={handleHotspot}
          onSimulate={handleSimulate}
          resetKey={chatResetKey}
        />
      </div>

      <Onboarding flow={onboarding} />
    </div>
  );
}
