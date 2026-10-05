import { useEffect, useRef, useState } from "react";
import { Mic, Send, Sparkles, Square, ShieldCheck, Volume2, VolumeX } from "lucide-react";
import { getHotspot, type HotspotId } from "./spdData";
import { RobotAvatar, type AvatarState } from "./RobotAvatar";
import { useLipSync } from "@/hooks/useLipSync";
import {
  retrieve,
  SUGGESTED_TOPICS,
  OUT_OF_SCOPE_MESSAGE,
  NO_ANSWER_MESSAGE,
  type KBSource,
} from "./knowledge";

type Msg = {
  id: string;
  role: "user" | "assistant";
  text: string;
  source?: KBSource;
  topics?: string[];
};

type Props = {
  activeHotspot: HotspotId | null;
  surging: boolean;
  onSuggest: (id: HotspotId) => void;
  onSimulate: () => void;
  resetKey?: number;
};

/** The Web Speech recognition API isn't in TypeScript's DOM lib; only what we use is typed here. */
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const uid = () => Math.random().toString(36).slice(2, 9);
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const WELCOME: Msg = {
  id: "w",
  role: "assistant",
  text:
    "Welcome. I'm your Legrand SPD trainer. I only answer from approved Legrand documentation. Ask about SPD basics, installation, selection, or tap a red pin on the product.",
};

export function TrainerPanel({ activeHotspot, surging, onSuggest, onSimulate, resetKey }: Props) {
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [listening, setListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastHotspot = useRef<HotspotId | null>(null);
  /** Only the newest speak() call may clear `busy` — an interrupted one must not. */
  const speakSeq = useRef(0);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [sttSupported, setSttSupported] = useState(false);
  const [micNote, setMicNote] = useState<string | null>(null);

  const lip = useLipSync();
  const { speaking } = lip;

  const avatarState: AvatarState = speaking
    ? "speaking"
    : listening
      ? "listening"
      : thinking
        ? "thinking"
        : "idle";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Speech recognition only exists in the browser (Chrome, Edge, Safari) — adopt it after mount.
  useEffect(() => {
    setSttSupported(getSpeechRecognition() !== null);
    return () => recognitionRef.current?.abort();
  }, []);

  // Reset chat when parent triggers Reset
  useEffect(() => {
    if (resetKey === undefined || resetKey === 0) return;
    lip.stop();
    recognitionRef.current?.abort();
    setMicNote(null);
    setMessages([WELCOME]);
    setInput("");
    setBusy(false);
    setThinking(false);
    setListening(false);
    lastHotspot.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  useEffect(() => {
    if (!activeHotspot || activeHotspot === lastHotspot.current) return;
    lastHotspot.current = activeHotspot;
    const h = getHotspot(activeHotspot);

    // 1. Log the hotspot as a user turn in chat history
    setMessages((m) => [
      ...m,
      { id: uid(), role: "user", text: `Tell me about the ${h.label}.` },
    ]);

    // 2. Build a structured, hierarchical response from KB + product manual
    (async () => {
      setThinking(true);
      await wait(300);
      // Each pin explains itself from its own product data. (Borrowing a knowledge-base
      // answer by keyword gave the line- and earth-terminal pins an overview about
      // "bistable locking clips", which describes neither.)
      const overview = h.summary;
      const source: KBSource = {
        document: "Legrand SPD Product Manual",
        type: "Product Manual",
        section: h.title,
      };

      const bulletBlock = h.bullets.map((b) => `• ${b}`).join("\n");
      const specBlock = h.spec
        .map((s) => `• ${s.label}: ${s.value}`)
        .join("\n");

      // The card shows everything, but the trainer only *says* the title and overview
      // (~10 s). Reading every bullet and spec aloud took ~22 s and spoke the section
      // headings ("Key Points…") — the rest appears as soon as the voice finishes.
      const head = `${h.title}\n\nOverview\n${overview}`;
      const structured = `${head}\n\nKey Points\n${bulletBlock}\n\nSpecifications\n${specBlock}`;

      await speak(structured, source, undefined, {
        speech: `${h.title}. ${overview}`,
        spokenChars: head.length,
      });
    })();
  }, [activeHotspot]);

  useEffect(() => {
    if (surging) {
      speak(
        "Surge incoming. The MOV inside the SPD clamps the over-voltage and diverts the surge current straight to earth — your downstream equipment stays within its withstand level.",
        {
          document: "Legrand Surge Protection Training",
          type: "Training Material",
          section: "Module 2 — How an SPD operates",
          page: "slide 14",
        },
      );
    }
  }, [surging]);

  /**
   * The avatar's mouth and the transcript run off the same clock: `lip.speak`
   * reports progress every frame, and the message reveals to match. Stopping
   * early (or muting) just fast-forwards to the full text.
   */
  async function speak(
    text: string,
    source?: KBSource,
    topics?: string[],
    opts?: {
      /** What the voice says, when that is shorter than the text shown. */
      speech?: string;
      /** How many leading characters of `text` the voice covers (revealed in step with it). */
      spokenChars?: number;
    },
  ) {
    const seq = ++speakSeq.current;
    setThinking(false);
    setBusy(true);
    const id = uid();
    setMessages((m) => [...m, { id, role: "assistant", text: "" }]);

    const spokenChars = opts?.spokenChars ?? text.length;
    let revealed = -1;
    await lip.speak(opts?.speech ?? text, (progress) => {
      const chars = Math.round(progress * spokenChars);
      if (chars === revealed) return;
      revealed = chars;
      setMessages((m) =>
        m.map((msg) => (msg.id === id ? { ...msg, text: text.slice(0, chars) } : msg)),
      );
    });

    setMessages((m) => m.map((msg) => (msg.id === id ? { ...msg, text, source, topics } : msg)));
    // If a newer line interrupted this one, it owns `busy` now.
    if (seq === speakSeq.current) setBusy(false);
  }

  async function send(text: string) {
    if (!text.trim() || busy) return;
    setMessages((m) => [...m, { id: uid(), role: "user", text }]);
    setInput("");
    setThinking(true);
    await wait(350);

    const lower = text.toLowerCase();

    // Hotspot / simulation intents still drive the product
    if (lower.includes("surge") && (lower.includes("simulate") || lower.includes("run") || lower.includes("demo"))) {
      onSimulate();
    }
    const hotspotMap: Record<string, HotspotId> = {
      "status indicator": "status",
      "line terminal": "terminal-top",
      "earth": "terminal-bottom",
      "plug": "plug",
      "cartridge": "plug",
      "din": "din-rail",
      "body": "body",
    };
    for (const k of Object.keys(hotspotMap)) {
      if (lower.includes(k)) { onSuggest(hotspotMap[k]); break; }
    }

    // RAG retrieval
    const r = retrieve(text);
    if (r.kind === "hit") {
      await speak(r.entry.answer, r.entry.source);
    } else if (r.kind === "out-of-scope") {
      await speak(OUT_OF_SCOPE_MESSAGE, undefined, SUGGESTED_TOPICS);
    } else {
      await speak(NO_ANSWER_MESSAGE, undefined, SUGGESTED_TOPICS);
    }
  }

  function toggleVoice() {
    setMicNote(null);
    if (listening) {
      recognitionRef.current?.stop(); // onend sends what was heard
      return;
    }

    const SR = getSpeechRecognition();
    if (!SR) {
      setMicNote("Voice input isn't supported in this browser — try Chrome, Edge or Safari, or type your question.");
      return;
    }

    lip.stop(); // let the user interrupt the trainer rather than talk over it
    const rec = new SR();
    recognitionRef.current = rec;
    rec.lang = "en-IN";
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;

    let heard = "";
    rec.onresult = (e) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      heard = text.trim();
      setInput(heard); // live captions in the box while speaking
    };
    rec.onerror = (e) => {
      heard = "";
      setInput("");
      setMicNote(
        e.error === "not-allowed" || e.error === "service-not-allowed"
          ? "Microphone access is blocked. Allow it in your browser's site settings, or type instead."
          : e.error === "no-speech"
            ? "I didn't hear anything — tap the mic and try again."
            : e.error === "audio-capture"
              ? "No microphone was found."
              : e.error === "aborted"
                ? null
                : "Voice input stopped unexpectedly — please try again or type.",
      );
    };
    rec.onend = () => {
      setListening(false);
      if (recognitionRef.current === rec) recognitionRef.current = null;
      if (heard) send(heard);
    };

    try {
      rec.start();
      setListening(true);
    } catch {
      setMicNote("Couldn't start the microphone — please try again.");
    }
  }

  const suggestions = [
    "What is an SPD?",
    "Explain the 50 cm rule",
    "Type 1 vs Type 2 SPD",
    "Run a surge simulation",
  ];

  const stateLabel = speaking
    ? "Speaking"
    : listening
      ? "Listening"
      : thinking
        ? "Searching knowledge base…"
        : "Ready";

  const active = speaking || listening;

  return (
    <div className="contents">
      {/* COLUMN 2 — AI Avatar Trainer */}
      <aside data-tour="trainer" className="relative flex h-full w-full min-h-0 flex-col overflow-hidden border-l border-border bg-surface/60">
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-surface/70 px-4 py-2">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-foreground/80">
            Live AI Trainer
          </div>
          <div className="flex items-center gap-1.5">
            {lip.ttsSupported && (
              <button
                onClick={() => lip.setVoice(!lip.voiceEnabled)}
                title={lip.voiceEnabled ? "Mute trainer voice" : "Unmute trainer voice"}
                aria-pressed={lip.voiceEnabled}
                className={`flex h-6 w-6 items-center justify-center rounded-md border transition-colors ${
                  lip.voiceEnabled
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                {lip.voiceEnabled ? (
                  <Volume2 className="h-3.5 w-3.5" />
                ) : (
                  <VolumeX className="h-3.5 w-3.5" />
                )}
              </button>
            )}
            <div className="flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[9.5px] font-medium text-primary whitespace-nowrap">
              <ShieldCheck className="h-3 w-3" />
              Knowledge Restricted
            </div>
          </div>
        </div>

        <div className="relative min-h-0 flex-1">
          <RobotAvatar state={avatarState} frame={lip.frame} />

          {/* State chips over the stage */}
          <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 backdrop-blur">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                speaking
                  ? "bg-primary animate-pulse"
                  : listening
                    ? "bg-success animate-pulse"
                    : thinking
                      ? "bg-warning animate-pulse"
                      : "bg-white/40"
              }`}
            />
            <span className="text-[10px] font-medium uppercase tracking-wider text-white">
              {speaking ? "Speaking" : listening ? "Listening" : thinking ? "Thinking" : "Ready"}
            </span>
          </div>

          {speaking && (
            <button
              onClick={lip.stop}
              className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur transition-colors hover:bg-black/75"
            >
              <Square className="h-2.5 w-2.5 fill-current" />
              Stop
            </button>
          )}

          {/* Waveform overlay */}
          <div className="pointer-events-none absolute bottom-4 left-1/2 flex h-7 -translate-x-1/2 items-center justify-center gap-1 rounded-full bg-black/55 px-3 backdrop-blur">
            {Array.from({ length: 18 }).map((_, i) => (
              <span
                key={i}
                className={`w-0.5 rounded-full ${
                  active ? "bg-primary animate-wave" : "bg-white/30"
                }`}
                style={{
                  height: `${active ? 6 + ((i * 5) % 16) : 4}px`,
                  animationDelay: `${i * 55}ms`,
                }}
              />
            ))}
          </div>
        </div>

        {/* Status strip */}
        <div className="flex shrink-0 items-center gap-2 border-t border-border bg-surface/80 px-3 py-2 backdrop-blur">
          <div
            className={`relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#0d132a] shadow-glow ${
              speaking ? "animate-orb-speak" : listening ? "animate-orb-pulse" : ""
            }`}
          >
            <img src="/avatar/robot-head.webp" alt="" className="h-7 w-7 object-contain" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12px] font-semibold text-foreground">
              Legrand AI Trainer
            </div>
            <div className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  speaking
                    ? "bg-primary animate-pulse"
                    : listening
                      ? "bg-success animate-pulse"
                      : thinking
                        ? "bg-warning animate-pulse"
                        : "bg-muted-foreground"
                }`}
              />
              {stateLabel}
            </div>
          </div>
        </div>
      </aside>

      {/* COLUMN 3 — Conversation & Knowledge */}
      <aside data-tour="chat" className="flex h-full w-full min-h-0 flex-col overflow-hidden border-l border-border bg-surface/60">
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-surface/70 px-4 py-2">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-foreground/80">
            Conversation & Knowledge
          </div>
          <div className="text-[10px] text-muted-foreground">
            {messages.filter((m) => !(m.role === "assistant" && m.id === "w")).length} entries
          </div>
        </div>

        <div ref={scrollRef} className="scroll-area flex-1 overflow-y-auto px-4 py-4">
          <div className="space-y-3">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.role === "assistant" && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#0d132a] shadow-glow">
                    <img src="/avatar/robot-head.webp" alt="" className="h-6 w-6 object-contain" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                    m.role === "user"
                      ? "bg-gradient-primary text-primary-foreground"
                      : "bg-card text-foreground border border-border"
                  }`}
                >
                  <div>
                    {m.role === "assistant" ? (
                      <StructuredText text={m.text} />
                    ) : (
                      m.text
                    )}
                    {busy &&
                      m.id === messages[messages.length - 1]?.id &&
                      m.role === "assistant" && (
                        <span className="animate-cursor ml-0.5 inline-block h-3 w-0.5 bg-primary align-middle" />
                      )}
                  </div>

                  {m.role === "assistant" && m.topics && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {m.topics.map((t) => (
                        <button
                          key={t}
                          onClick={() => send(t)}
                          className="rounded-full border border-border bg-surface px-2 py-0.5 text-[10.5px] text-foreground/80 hover:border-primary hover:text-primary"
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {messages.length <= 2 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] text-foreground/80 transition-all hover:border-primary hover:text-primary"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-border bg-surface p-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            data-tour="composer"
            className="flex items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2 focus-within:border-primary"
          >
            <button
              type="button"
              onClick={toggleVoice}
              disabled={!sttSupported}
              aria-label={listening ? "Stop listening" : "Ask by voice"}
              title={
                !sttSupported
                  ? "Voice input isn't supported in this browser"
                  : listening
                    ? "Stop listening"
                    : "Ask by voice"
              }
              className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                listening
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-foreground/70 hover:text-primary"
              }`}
            >
              {listening ? (
                <Square className="h-3.5 w-3.5" />
              ) : (
                <Mic className="h-3.5 w-3.5" />
              )}
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={listening ? "Listening…" : "Ask about Legrand SPDs…"}
              className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
            />
            <button
              type="submit"
              disabled={!input.trim() || busy}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground shadow-glow disabled:opacity-40"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
          {micNote ? (
            <div role="status" className="mt-2 text-center text-[10.5px] text-warning">
              {micNote}
            </div>
          ) : (
            <div className="mt-2 flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
              <Sparkles className="h-3 w-3" />
              Answers grounded in Legrand technical documentation only.
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

function StructuredText({ text }: { text: string }) {
  if (!text) return null;
  const blocks = text.split(/\n\n+/);
  // First block with no inner newline → treat as title
  const first = blocks[0] ?? "";
  const isTitle = blocks.length > 1 && !first.includes("\n");
  return (
    <div className="space-y-2">
      {isTitle && (
        <div className="text-[13.5px] font-semibold text-foreground">
          {first}
        </div>
      )}
      {(isTitle ? blocks.slice(1) : blocks).map((block, i) => {
        const lines = block.split("\n");
        const heading = lines[0];
        const rest = lines.slice(1);
        const isSection =
          rest.length > 0 &&
          /^(Overview|Key Points|Specifications|Installation|Safety Notes|Best Practices|Troubleshooting)$/i.test(
            heading.trim(),
          );
        if (isSection) {
          const bullets = rest.filter((l) => l.trim().startsWith("•"));
          if (bullets.length === rest.length && bullets.length > 0) {
            return (
              <div key={i}>
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-primary/80">
                  {heading}
                </div>
                <ul className="space-y-0.5 pl-1">
                  {bullets.map((b, j) => (
                    <li key={j} className="text-[12.5px] text-foreground/90">
                      {b.replace(/^•\s*/, "› ")}
                    </li>
                  ))}
                </ul>
              </div>
            );
          }
          return (
            <div key={i}>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-primary/80">
                {heading}
              </div>
              <div className="whitespace-pre-line text-[12.5px] text-foreground/90">
                {rest.join("\n")}
              </div>
            </div>
          );
        }
        return (
          <div key={i} className="whitespace-pre-line">
            {block}
          </div>
        );
      })}
    </div>
  );
}
