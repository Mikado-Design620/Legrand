import { useCallback, useEffect, useRef, useState } from "react";
import {
  buildTimeline,
  chunkForSpeech,
  MS_PER_CHAR_SILENT,
  MS_PER_CHAR_VOICE,
  pickVoice,
  toSpeechText,
  VISEME_SHAPE,
  type Viseme,
} from "@/lib/lipsync";

const VOICE_PREF_KEY = "legrand-trainer-voice";

/** Written every frame, read by the avatar's own rAF loop — never via state. */
export type LipSyncFrame = { viseme: Viseme; level: number };

/** Give up on a voice that has not started after this long and fall back to the silent clock. */
const START_TIMEOUT_MS = 2500;

type Run = {
  raf: number;
  keepAlive: ReturnType<typeof setInterval> | null;
  usesTts: boolean;
  timeline: Viseme[];
  length: number;
  /**
   * The mouth/transcript position is `anchorChar + elapsed / rate`, re-anchored
   * whenever the voice tells us where it really is (utterance start, word
   * boundary, utterance end). Unlike a single fixed clock this survives voices
   * that are slower/faster than assumed, that start late, or that send no
   * word events at all.
   */
  anchorChar: number;
  anchorTime: number;
  /** Learned ms-per-character for this voice; refined after each sentence. */
  msPerChar: number;
  /** The text never runs ahead of the audio past the end of the sentence being spoken. */
  limitChar: number;
  chunkStart: number;
  lastEvent: number;
  started: boolean;
  begunAt: number;
  ttsFinished: boolean;
  resolve: () => void;
};

const clamp = (n: number, lo: number, hi: number) => (n < lo ? lo : n > hi ? hi : n);

export function useLipSync() {
  const frame = useRef<LipSyncFrame>({ viseme: "rest", level: 0 });
  const runRef = useRef<Run | null>(null);
  const [speaking, setSpeaking] = useState(false);

  // Neither speech support nor the saved preference exists during SSR, so both
  // start at their server value and are adopted after mount. Reading them
  // eagerly would render a different tree on the client and break hydration.
  const [ttsSupported, setTtsSupported] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  useEffect(() => {
    if (typeof window.speechSynthesis === "undefined") return;
    setTtsSupported(true);
    try {
      setVoiceEnabled(window.localStorage.getItem(VOICE_PREF_KEY) !== "off");
    } catch {
      /* storage blocked: keep the default */
    }

    // Voices load asynchronously in Chrome; touching the list early warms it.
    const warm = () => window.speechSynthesis.getVoices();
    warm();
    window.speechSynthesis.addEventListener("voiceschanged", warm);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", warm);
  }, []);

  const stop = useCallback(() => {
    const run = runRef.current;
    if (!run) return;
    runRef.current = null;

    cancelAnimationFrame(run.raf);
    if (run.keepAlive) clearInterval(run.keepAlive);
    if (typeof window !== "undefined" && typeof window.speechSynthesis !== "undefined") {
      window.speechSynthesis.cancel();
    }

    frame.current = { viseme: "rest", level: 0 };
    setSpeaking(false);
    run.resolve();
  }, []);

  useEffect(() => stop, [stop]);

  const setVoice = useCallback(
    (on: boolean) => {
      try {
        window.localStorage.setItem(VOICE_PREF_KEY, on ? "on" : "off");
      } catch {
        /* storage blocked: preference lasts for this session only */
      }
      setVoiceEnabled(on);
      if (!on) stop();
    },
    [stop],
  );

  /**
   * Animate (and, when unmuted, speak) `display`. `onProgress` receives 0..1 and
   * lets the caller reveal the transcript in step with the mouth.
   * Resolves when the line finishes, or immediately if `stop()` interrupts it.
   */
  const speak = useCallback(
    (display: string, onProgress?: (progress: number) => void) => {
      stop();

      const speech = toSpeechText(display);
      const usesTts = voiceEnabled && ttsSupported && speech.length > 0;
      const timeline = buildTimeline(speech);
      const now0 = performance.now();

      return new Promise<void>((resolve) => {
        const run: Run = {
          raf: 0,
          keepAlive: null,
          usesTts,
          timeline,
          length: speech.length,
          anchorChar: 0,
          anchorTime: now0,
          msPerChar: usesTts ? MS_PER_CHAR_VOICE : MS_PER_CHAR_SILENT,
          limitChar: speech.length,
          chunkStart: now0,
          lastEvent: now0,
          started: !usesTts,
          begunAt: now0,
          ttsFinished: false,
          resolve,
        };
        runRef.current = run;
        setSpeaking(true);

        const finish = () => {
          if (runRef.current !== run) return;
          onProgress?.(1);
          stop();
        };

        /** Where the mouth/transcript is right now, in characters of `speech`. */
        const position = (now: number) => {
          if (!run.started) return 0;
          return Math.min(run.limitChar, run.anchorChar + (now - run.anchorTime) / run.msPerChar);
        };

        /** Abandon the voice but keep the mouth moving from where it got to. */
        const fallBackToSilent = () => {
          if (runRef.current !== run || !run.usesTts) return;
          const now = performance.now();
          const at = position(now);
          window.speechSynthesis.cancel();
          if (run.keepAlive) clearInterval(run.keepAlive);
          run.usesTts = false;
          run.started = true;
          run.anchorChar = at;
          run.anchorTime = now;
          run.limitChar = run.length;
          run.msPerChar = MS_PER_CHAR_SILENT;
        };

        if (usesTts) {
          const synth = window.speechSynthesis;
          const voice = pickVoice(synth.getVoices());
          const chunks = chunkForSpeech(speech);

          synth.cancel();
          chunks.forEach((chunk, i) => {
            const isLast = i === chunks.length - 1;
            const chunkEnd = chunk.offset + chunk.text.length;
            const utterance = new SpeechSynthesisUtterance(chunk.text);
            if (voice) utterance.voice = voice;
            utterance.rate = 1;
            utterance.pitch = 1.15; // a touch synthetic, to match the character
            utterance.volume = 1;

            // The voice has genuinely begun this sentence: pin the clock to it.
            utterance.onstart = () => {
              if (runRef.current !== run || !run.usesTts) return;
              const now = performance.now();
              run.started = true;
              run.anchorChar = chunk.offset;
              run.anchorTime = now;
              run.limitChar = chunkEnd;
              run.chunkStart = now;
              run.lastEvent = now;
            };

            // Word events (when the voice sends them) give word-level accuracy.
            utterance.onboundary = (event) => {
              if (runRef.current !== run || !run.usesTts || !run.started) return;
              const now = performance.now();
              run.anchorChar = clamp(chunk.offset + (event.charIndex ?? 0), run.anchorChar, chunkEnd);
              run.anchorTime = now;
              run.lastEvent = now;
            };

            // Sentence finished: snap to its end and learn how fast this voice really talks.
            utterance.onend = () => {
              if (runRef.current !== run || !run.usesTts) return;
              const now = performance.now();
              if (chunk.text.length >= 25 && run.started) {
                const observed = (now - run.chunkStart) / chunk.text.length;
                run.msPerChar = clamp(run.msPerChar * 0.4 + observed * 0.6, 30, 170);
              }
              run.anchorChar = chunkEnd;
              run.anchorTime = now;
              run.lastEvent = now;
              if (isLast) run.ttsFinished = true;
            };

            utterance.onerror = (event) => {
              // "interrupted"/"canceled" are our own stop(); anything else (autoplay
              // blocked, voice missing) means carry on silently rather than freeze.
              if (event.error === "interrupted" || event.error === "canceled") return;
              fallBackToSilent();
            };

            synth.speak(utterance);
          });

          // Chrome silently pauses long queues; nudge it back awake.
          run.keepAlive = setInterval(() => {
            if (runRef.current !== run) return;
            if (window.speechSynthesis.paused) window.speechSynthesis.resume();
          }, 6000);
        }

        const tick = () => {
          if (runRef.current !== run) return;
          const now = performance.now();

          // The voice never started (no voices installed, autoplay policy): don't leave the user waiting.
          if (run.usesTts && !run.started && now - run.begunAt > START_TIMEOUT_MS) fallBackToSilent();

          const pos = run.usesTts ? position(now) : Math.min(run.length, run.anchorChar + (now - run.anchorTime) / run.msPerChar);
          const viseme = run.timeline[Math.floor(pos)] ?? "rest";
          frame.current = { viseme: run.started ? viseme : "rest", level: VISEME_SHAPE[viseme].ry };
          onProgress?.(run.length === 0 ? 1 : clamp(pos / run.length, 0, 1));

          // Only a stalled engine (no events for a long time) is cut short — never a voice that is merely slow.
          const sentenceMs = Math.max(0, run.limitChar - run.anchorChar) * run.msPerChar;
          const stalled = run.usesTts && run.started && now - run.lastEvent > Math.max(8000, sentenceMs * 2 + 3000);

          if (run.ttsFinished || stalled || (!run.usesTts && pos >= run.length)) {
            finish();
            return;
          }
          run.raf = requestAnimationFrame(tick);
        };
        run.raf = requestAnimationFrame(tick);
      });
    },
    [stop, ttsSupported, voiceEnabled],
  );

  return { frame, speaking, speak, stop, voiceEnabled, setVoice, ttsSupported };
}
