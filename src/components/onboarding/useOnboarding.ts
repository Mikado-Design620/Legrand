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
 * Drives the first-run flow: splash → intro → guided tour → app.
 * Returning users only see a short splash. The phase always starts at
 * "splash" so server and client render the same markup (no hydration flash).
 */
export function useOnboarding() {
  const [phase, setPhase] = useState<OnboardingPhase>("splash");
  const [firstVisit, setFirstVisit] = useState(true);

  useEffect(() => {
    setFirstVisit(!readSeen());
  }, []);

  const finishSplash = useCallback(() => {
    setPhase(readSeen() ? "done" : "intro");
  }, []);

  const startTour = useCallback(() => setPhase("tour"), []);

  const complete = useCallback(() => {
    writeSeen();
    setPhase("done");
  }, []);

  /** Re-open the introduction from the header Guide button. */
  const replay = useCallback(() => setPhase("intro"), []);

  return { phase, firstVisit, finishSplash, startTour, complete, replay };
}
