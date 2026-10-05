import type { useOnboarding } from "./useOnboarding";
import { SplashScreen } from "./SplashScreen";
import { IntroScreen } from "./IntroScreen";
import { GuidedTour } from "./GuidedTour";

type Props = { flow: ReturnType<typeof useOnboarding> };

/** Renders whichever onboarding layer is active above the workspace. */
export function Onboarding({ flow }: Props) {
  const { phase, firstVisit, finishSplash, startTour, complete } = flow;

  if (phase === "splash") return <SplashScreen firstVisit={firstVisit} onDone={finishSplash} />;
  if (phase === "intro")
    return <IntroScreen firstVisit={firstVisit} onStartTour={startTour} onSkip={complete} />;
  if (phase === "tour") return <GuidedTour onFinish={complete} />;
  return null;
}
