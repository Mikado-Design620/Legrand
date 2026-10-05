/**
 * Text-driven viseme timing for the robot trainer's mouth.
 *
 * The browser's SpeechSynthesis API exposes no phoneme stream, so the mouth is
 * driven from the text itself: every character maps to a viseme, laid out on a
 * linear clock. Word `boundary` events from the utterance nudge that clock back
 * onto the real voice (see useLipSync), which is what keeps the two in step.
 */

export type Viseme = "rest" | "mbp" | "s" | "fv" | "th" | "ee" | "eh" | "ah" | "aa" | "oh" | "oo";

/** Mouth ellipse radii, as a fraction of the widest shape. */
export const VISEME_SHAPE: Record<Viseme, { rx: number; ry: number }> = {
  rest: { rx: 0.66, ry: 0.16 },
  mbp: { rx: 0.62, ry: 0.08 },
  s: { rx: 0.6, ry: 0.18 },
  fv: { rx: 0.64, ry: 0.14 },
  th: { rx: 0.68, ry: 0.34 },
  ee: { rx: 0.96, ry: 0.26 },
  eh: { rx: 0.84, ry: 0.46 },
  ah: { rx: 0.74, ry: 0.72 },
  aa: { rx: 0.8, ry: 1.0 },
  oh: { rx: 0.7, ry: 0.86 },
  oo: { rx: 0.46, ry: 0.56 },
};

/** A voice reads roughly 16 characters per second at rate 1. */
export const MS_PER_CHAR_VOICE = 62;
/** Muted: the mouth still moves, but at reading speed rather than speaking speed. */
export const MS_PER_CHAR_SILENT = 22;

const CONSONANT: Record<string, Viseme> = {
  m: "mbp",
  b: "mbp",
  p: "mbp",
  f: "fv",
  v: "fv",
  w: "oo",
  q: "oo",
  s: "s",
  z: "s",
  c: "s",
  x: "s",
  j: "s",
  t: "th",
  d: "th",
  n: "th",
  l: "th",
  r: "eh",
  g: "eh",
  k: "eh",
  h: "ah",
  y: "ee",
};

const VOWEL: Record<string, Viseme> = {
  a: "aa",
  e: "eh",
  i: "ee",
  o: "oh",
  u: "oo",
};

/** Spell out terms a text-to-speech engine would mangle ("SPD" is not a word). */
const PRONUNCIATION: [RegExp, string][] = [
  [/\bSPDs\b/g, "S P Ds"],
  [/\bSPD\b/g, "S P D"],
  [/\bMOV\b/g, "M O V"],
  [/\bPE\b/g, "P E"],
  [/\bLPS\b/g, "L P S"],
  [/\bIimp\b/g, "I imp"],
  [/\bImax\b/g, "I max"],
  [/\bUc\b/g, "U c"],
  [/\bUp\b(?=\s*[—:-])/g, "U p"],
  [/\bT(1|2)\b/g, "Type $1"],
  [/(\d+)\s*kV\b/g, "$1 kilovolts"],
  [/(\d+)\s*kA\b/g, "$1 kiloamps"],
  [/(\d+(?:\.\d+)?)\s*mm²/g, "$1 square millimetres"],
  [/(\d+(?:\.\d+)?)\s*Nm\b/g, "$1 newton metres"],
  [/(\d+)\/(\d+)\s*µs/g, "$1 over $2 microseconds"],
  [/µs\b/g, "microseconds"],
  [/(\d+)\s*cm\b/g, "$1 centimetres"],
  [/(\d+)\s*mm\b/g, "$1 millimetres"],
  [/\bIEC\b/g, "I E C"],
  [/\bDIN\b/g, "Din"],
];

/** Strip chat formatting so the voice reads prose, not bullet glyphs. */
export function toSpeechText(display: string): string {
  let t = display
    .replace(/[•›]/g, "")
    .replace(/\s*\n\s*/g, ". ")
    .replace(/(\.\s*)+\./g, ".")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,;:])/g, "$1")
    .trim();
  for (const [re, to] of PRONUNCIATION) t = t.replace(re, to);
  return t;
}

/** One viseme per character of `text`, each occupying `msPerChar` on the clock. */
export function buildTimeline(text: string): Viseme[] {
  const lower = text.toLowerCase();
  const out: Viseme[] = new Array(lower.length);

  for (let i = 0; i < lower.length; i++) {
    const ch = lower[i];
    const next = lower[i + 1];

    if (!/[a-z]/.test(ch)) {
      out[i] = "rest";
      continue;
    }

    // Digraphs the single-character tables would get wrong.
    if (ch === "t" && next === "h") out[i] = "th";
    else if (ch === "s" && next === "h") out[i] = "oo";
    else if (ch === "c" && next === "h") out[i] = "oo";
    else if (ch === "p" && next === "h") out[i] = "fv";
    else if (ch === "o" && next === "o") out[i] = "oo";
    else if (ch === "e" && next === "e") out[i] = "ee";
    else if (ch === "o" && next === "u") out[i] = "oh";
    else if (VOWEL[ch]) out[i] = VOWEL[ch];
    else out[i] = CONSONANT[ch] ?? "eh";

    // A long run of the widest shape reads as a yawn, not speech.
    if (i > 0 && out[i] === "aa" && out[i - 1] === "aa") out[i] = "ah";
  }

  return out;
}

export function visemeAt(timeline: Viseme[], t: number, msPerChar: number): Viseme {
  if (timeline.length === 0) return "rest";
  const i = Math.floor(t / msPerChar);
  if (i < 0 || i >= timeline.length) return "rest";
  return timeline[i];
}

/**
 * Chrome stalls on utterances longer than ~15 seconds, so speak in sentence-
 * sized pieces. Each chunk carries its character offset into `text`, which the
 * boundary handler needs in order to place a word on the global clock.
 */
export function chunkForSpeech(text: string, maxLen = 180): { text: string; offset: number }[] {
  const chunks: { text: string; offset: number }[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  let cursor = 0;
  let buf = "";
  let bufOffset = 0;

  const flush = () => {
    if (buf.trim()) chunks.push({ text: buf.trim(), offset: bufOffset });
    buf = "";
  };

  for (const sentence of sentences) {
    const at = text.indexOf(sentence, cursor);
    cursor = at + sentence.length;

    if (sentence.length > maxLen) {
      flush();
      let piece = "";
      let pieceAt = at;
      for (const word of sentence.split(/(\s+)/)) {
        if (piece.length + word.length > maxLen && piece.trim()) {
          chunks.push({ text: piece.trim(), offset: pieceAt });
          pieceAt += piece.length;
          piece = "";
        }
        piece += word;
      }
      if (piece.trim()) chunks.push({ text: piece.trim(), offset: pieceAt });
      continue;
    }

    if (buf.length + sentence.length > maxLen) flush();
    if (!buf) bufOffset = at;
    buf += (buf ? " " : "") + sentence;
  }
  flush();

  return chunks;
}

/** Prefer a British male voice — closest to the character's brief. */
export function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null;
  const english = voices.filter((v) => v.lang.toLowerCase().startsWith("en"));
  if (english.length === 0) return voices[0];

  const named = (needle: string) => english.find((v) => v.name.toLowerCase().includes(needle));

  return (
    named("daniel") ??
    named("arthur") ??
    named("ryan") ??
    named("george") ??
    named("google uk english male") ??
    named("male") ??
    english.find((v) => v.lang.toLowerCase() === "en-gb") ??
    english[0]
  );
}
