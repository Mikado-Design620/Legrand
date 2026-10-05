import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "legrand-spd:onboarding:v1";

export type OnboardingPhase = "splash" | "intro" | "tour" | "done";

function readSeen(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "done";
  } catch {
    return false;
  }
}

function writeSeen() {
  try {
    window.localStorage.setItem(STORAGE_KEY, "done");
  } catch {
    /* private mode / storage blocked — onboarding will simply show again next time */
  }
}

/**
 * Drives the onboarding layers: a short splash, then straight into the app.
 * The intro and guided tour never open by themselves — only from the header
 * Guide button. The phase always starts at "splash" so server and client
 * render the same markup (no hydration flash).
 */
export function useOnboarding() {
  const [phase, setPhase] = useState<OnboardingPhase>("splash");
  const [firstVisit, setFirstVisit] = useState(true);

  useEffect(() => {
    setFirstVisit(!readSeen());
  }, []);

  const finishSplash = useCallback(() => setPhase("done"), []);

  const startTour = useCallback(() => setPhase("tour"), []);

  const complete = useCallback(() => {
    writeSeen();
    setPhase("done");
  }, []);

  /** Re-open the introduction from the header Guide button. */
  const replay = useCallback(() => setPhase("intro"), []);

  return { phase, firstVisit, finishSplash, startTour, complete, replay };
}
