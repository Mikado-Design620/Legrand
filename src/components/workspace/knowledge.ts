// Legrand SPD knowledge base — sourced strictly from the uploaded
// "PPT-SPD.pdf" (Legrand SPD Presentation). The trainer answers only from
// these entries; anything not matched returns a safe fallback.

export type KBSource = {
  document: string;
  type:
    | "Catalogue"
    | "Technical Specification"
    | "Installation Guide"
    | "Product Manual"
    | "Training Material"
    | "FAQ"
    | "Maintenance Guide";
  section: string;
  page?: string;
};

export type KBEntry = {
  id: string;
  topic: string;
  keywords: string[];
  answer: string;
  source: KBSource;
};

const DOC = "Legrand SPD Presentation (PPT-SPD.pdf)";

export {
  SUGGESTED_TOPICS,
  OUT_OF_SCOPE_MESSAGE,
  NO_ANSWER_MESSAGE,
} from "@/lib/spd-context";

export const KB: KBEntry[] = [
  {
    id: "kb-spd-definition",
    topic: "What is an SPD",
    keywords: [
      "what is an spd", "what is a spd", "what is spd", "what are spds", "what are spd",
      "spd do", "spd definition", "surge protection device", "purpose of an spd", "purpose of spd",
    ],
    answer:
      "An SPD (Surge Protection Device) protects an installation and the equipment connected to it from surges — short-term, high-intensity transient overvoltages. When a surge arrives, the MOV inside the SPD clamps the over-voltage and diverts the surge current straight to earth, so downstream equipment stays within its withstand level. SPDs are classified as Type I, Type II and Type III.",
    source: { document: "Legrand Surge Protection Training", type: "Training Material", section: "Module 2 — How an SPD operates", page: "slide 14" },
  },
  {
    id: "kb-lead-length",
    topic: "50 cm Lead-Length Rule",
    keywords: ["50 cm", "50cm", "lead length", "lead-length", "cable length", "short leads", "shortest conductor", "conductor length", "wiring length"],
    answer:
      "Keep the total lead length of the SPD connection within 50 cm. On the line side, use the shortest possible conductor and tighten the terminals to the specified torque — short leads keep the let-through voltage low. On the earth side, the PE conductor must be straight and short, with no loops or sharp bends, and at least equal in cross-section to the line conductors.",
    source: { document: "Legrand SPD Product Manual", type: "Product Manual", section: "Line-Side Terminals and Earth (PE) Terminal" },
  },
  {
    id: "kb-status-meaning",
    topic: "Status Indicator",
    keywords: ["indicator", "green", "red", "end-of-life", "end of life", "flag"],
    answer:
      "The status indicator is a mechanical flag on the front face of the SPD, visible without opening the enclosure. Green means the SPD module is operational. Red means the internal MOV has reached end-of-life and the plug-in module must be replaced.",
    source: { document: "Legrand SPD Product Manual", type: "Product Manual", section: "Status Indicator Window" },
  },
  {
    id: "kb-surge-definition",
    topic: "Understanding Surge",
    keywords: ["surge", "surges", "electrical surge", "transient", "definition"],
    answer:
      "A surge is a transient wave of current, voltage or power in an electric circuit. Surges are events that are short-term and high-intensity.",
    source: { document: DOC, type: "Training Material", section: "Understanding Surge — What are electrical surges" },
  },
  {
    id: "kb-origin",
    topic: "Origin of Surges",
    keywords: ["origin", "origins", "cause", "causes", "lightning", "switching", "engine", "motor", "on/off"],
    answer:
      "Per the Legrand presentation, the origin of surges breaks down as: 80% from on/off switching of engines (motors and heavy inductive loads), 15% from lightning, and 5% from switching on the electrical network.",
    source: { document: DOC, type: "Training Material", section: "Understanding Surge — Origin of Surges" },
  },
  {
    id: "kb-why-protect",
    topic: "Why Protection",
    keywords: ["protect", "protection", "risk", "damage", "failure", "6 kv"],
    answer:
      "Lightning risk is real — in seconds a surge can destroy what took years to build. Key facts from the deck: 70% of electrical equipment failures are due to transient surges, surge spikes can reach as high as 6 kV in urban networks, and they are common in rural solar-connected areas. Frequent on/off cycling of motors and inductive loads also raises internal surges and insulation stress.",
    source: { document: DOC, type: "Training Material", section: "Why Protection Against Surge" },
  },
  {
    id: "kb-benefits",
    topic: "Why SPD Matters",
    keywords: ["benefit", "payback", "security", "comfort", "durability", "saving", "convenience"],
    answer:
      "Legrand lists five reasons surge protection matters: Payback (guaranteed quick payback on the investment), Security (system operates fully independent of weather), Comfort & convenience (protection guarantee from the SPD family), Durability (longer component life and reduced maintenance time), and Saving (prevents loss from replacing equipment damaged by lightning and electrical surges).",
    source: { document: DOC, type: "Training Material", section: "Why Surge Protection Matters More" },
  },
  {
    id: "kb-waveforms",
    topic: "Current Waveforms",
    keywords: ["waveform", "10/350", "8/20", "current", "wave", "ipeak", "tfront", "ttail"],
    answer:
      "Two reference current waveforms are used: 10/350 µs for Type I tests and 8/20 µs for Type II tests. The main parameters of a surge waveform are the peak value (Ipeak), the front-of-wave time (Tfront), and the time to half value (Ttail).",
    source: { document: DOC, type: "Technical Specification", section: "SPD Technical Overview — Current Waveforms" },
  },
  {
    id: "kb-type1",
    topic: "SPD Classification",
    keywords: ["type 1", "type i", "lps", "direct", "lightning protection system"],
    answer:
      "Type I SPD protects against overvoltage caused by conducted electrical surges from direct lightning strikes on or near the building. It is generally recommended for sites with a high exposure level and/or buildings equipped with a Lightning Protection System (LPS). Type I is tested with a 10/350 µs waveform.",
    source: { document: DOC, type: "Technical Specification", section: "SPD Classification — Type I" },
  },
  {
    id: "kb-type2",
    topic: "SPD Classification",
    keywords: ["type 2", "type ii", "induced", "indirect", "transmission"],
    answer:
      "Type II SPD protects against overvoltage caused by induced electrical surges from indirect lightning strikes close to the building or to the transmission lines (power or data). It is tested with an 8/20 µs waveform.",
    source: { document: DOC, type: "Technical Specification", section: "SPD Classification — Type II" },
  },
  {
    id: "kb-type3",
    topic: "SPD Classification",
    keywords: ["type 3", "type iii"],
    answer:
      "The Legrand presentation shows Type III SPD alongside Type I and Type II in the lightning and surge characteristics diagram. Type III is positioned downstream of Type I and Type II for fine protection close to sensitive loads.",
    source: { document: DOC, type: "Technical Specification", section: "SPD Classification — Lightning and Surge Characteristics" },
  },
  {
    id: "kb-features",
    topic: "Features",
    keywords: ["feature", "extensive", "marking", "ease of installation", "add on safety", "ease of maintenance"],
    answer:
      "The Legrand SPD range is built around five features: Extensive Range, Clear Marking, Ease of Installation, Add-on Safety, and Ease of Maintenance — enhanced protection with simplified installation and maintenance.",
    source: { document: DOC, type: "Training Material", section: "Smart Protection Starts Here — Features" },
  },
  {
    id: "kb-range",
    topic: "Extensive Range",
    keywords: ["range", "extensive", "1p", "2p", "3p", "4p", "1p+n", "3p+n", "version"],
    answer:
      "The range covers multiple pole configurations. Per the catalogue notes: some references are only available in 1P version, others only in 1P+N, 3P and 3P+N versions, with dedicated variants for 1P+N and 3P+N systems, and certain models only available in 1P, 2P, 3P and 4P versions.",
    source: { document: DOC, type: "Catalogue", section: "An Extensive Range" },
  },
  {
    id: "kb-marking",
    topic: "Clear Marking",
    keywords: ["marking", "label", "wiring", "side panel"],
    answer:
      "Clear, comprehensive markings are provided on the front and side panels of the SPD to make wiring easy and unambiguous.",
    source: { document: DOC, type: "Product Manual", section: "Clear Marking" },
  },
  {
    id: "kb-install",
    topic: "Ease of Installation",
    keywords: ["install", "installation", "bistable", "clip", "locking", "connection", "secure"],
    answer:
      "Installation is simplified by bistable locking clips and secure connections, which keep the SPD firmly on the DIN rail and ensure a reliable termination.",
    source: { document: DOC, type: "Installation Guide", section: "Ease of Installation" },
  },
  {
    id: "kb-safety",
    topic: "Add-on Safety",
    keywords: ["status indicator", "remote", "feedback", "fault signal", "safety", "contact"],
    answer:
      "Add-on safety features include a status indicator on the front face and a remote feedback (fault-signal) contact. The fault-signal contact terminal block is removable to make wiring easier.",
    source: { document: DOC, type: "Product Manual", section: "Add On Safety" },
  },
  {
    id: "kb-maintenance",
    topic: "Ease of Maintenance",
    keywords: ["maintenance", "maintain", "replace", "quick", "easy", "safe"],
    answer:
      "Maintenance is quick, easy and safe — the plug-in design lets the cartridge be replaced without disturbing the wired base.",
    source: { document: DOC, type: "Maintenance Guide", section: "Ease of Maintenance" },
  },
  {
    id: "kb-construction",
    topic: "Construction",
    keywords: ["construction", "base", "plug", "din rail", "assembly", "terminal", "parts"],
    answer:
      "The SPD construction consists of a Base, a Plug (the replaceable cartridge), a DIN rail assembly, the Status Indicator on the front, and the Terminals for line and earth connections.",
    source: { document: DOC, type: "Product Manual", section: "Construction" },
  },
  {
    id: "kb-parameters",
    topic: "Parameters",
    keywords: ["parameter", "parameters", "imax", "iimp", "uc", "t1", "t2", "spec", "nominal", "protection level", "operating voltage", "discharge current"],
    answer:
      "Key SPD parameters labelled in the Legrand presentation: In — nominal discharge current; Imax — maximum discharge current; Iimp — impulse discharge current; Uc — maximum continuous operating voltage; Up — voltage protection level; T1 — Type 1 SPD; T2 — Type 2 SPD; plus the Status indicator on the module.",
    source: { document: DOC, type: "Technical Specification", section: "Parameters" },
  },
];

// Domain vocabulary that marks a question as in-scope for the uploaded deck.
// Matched as whole words/phrases, so "in" or "up" inside another word can never trigger a hit.
const IN_SCOPE_TERMS = [
  "spd", "spds", "surge", "surges", "legrand", "lightning", "transient", "overvoltage", "over-voltage", "over voltage",
  "type 1", "type i", "type 2", "type ii", "type 3", "type iii", "t1", "t2",
  "10/350", "8/20", "ipeak", "tfront", "ttail", "imax", "iimp", "uc",
  "din", "rail", "terminal", "terminals", "plug", "base", "cartridge", "status indicator", "indicator",
  "marking", "markings", "label", "installation", "install", "maintenance", "maintain", "replace",
  "feature", "features", "range", "fault signal", "remote feedback", "bistable", "locking clip",
  "motor", "engine", "switching", "lps", "lightning protection system",
  "waveform", "discharge current", "protection level", "operating voltage", "nominal",
  "surge protection", "protection", "protect", "benefit", "benefits", "payback", "origin", "origins", "cause", "causes",
  "50 cm", "50cm", "lead length", "lead-length", "cable length", "conductor", "conductors", "wiring", "earth", "earthing", "pe", "mov", "varistor",
  "pole", "poles", "1p", "2p", "3p", "4p", "construction", "parameter", "parameters", "withstand",
];

const escapeRe = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Whole-word / whole-phrase match (an optional plural "s" is allowed). */
function hasTerm(q: string, term: string): boolean {
  return new RegExp(`(^|[^a-z0-9])${escapeRe(term)}s?([^a-z0-9]|$)`).test(q);
}

export function isInScope(query: string): boolean {
  const q = query.toLowerCase();
  return IN_SCOPE_TERMS.some((t) => hasTerm(q, t));
}

/** Words that appear in almost every SPD question — enough to stay in scope, too weak to pick a topic. */
const GENERIC_KEYWORDS = new Set(["surge", "surges", "spd", "spds", "protect", "protection", "legrand"]);

const COMPARE_CUES = ["vs", "versus", "difference", "different", "compare", "comparison", "between", "or"];

export type Retrieval =
  | { kind: "hit"; entry: KBEntry }
  | { kind: "out-of-scope" }
  | { kind: "no-answer" };

export function retrieve(query: string): Retrieval {
  const q = query.toLowerCase();

  // Scope gate first: "knowledge restricted" must hold even when a stray word matches an entry.
  if (!isInScope(query)) return { kind: "out-of-scope" };

  const scored: { entry: KBEntry; score: number }[] = [];
  for (const e of KB) {
    let score = 0;
    const matched = e.keywords.filter((kw) => hasTerm(q, kw));
    for (const kw of matched) {
      // "surge" + "surges" is one idea, not two; and words present in nearly every
      // question must not outweigh the specific word that actually picks the topic.
      if (matched.some((other) => other !== kw && other.startsWith(kw))) continue;
      score += GENERIC_KEYWORDS.has(kw) ? 2 : kw.length;
    }
    if (hasTerm(q, e.topic.toLowerCase())) score += 4;
    if (score > 0) scored.push({ entry: e, score });
  }
  if (scored.length === 0) return { kind: "no-answer" };
  scored.sort((a, b) => b.score - a.score);

  // "Type 1 vs Type 2": answer both sides instead of silently picking one.
  const compares = COMPARE_CUES.some((c) => hasTerm(q, c));
  const types = scored.filter((x) => x.entry.id === "kb-type1" || x.entry.id === "kb-type2");
  if (compares && types.length === 2) {
    const [t1, t2] = [types.find((x) => x.entry.id === "kb-type1")!.entry, types.find((x) => x.entry.id === "kb-type2")!.entry];
    return {
      kind: "hit",
      entry: {
        id: "kb-type1-vs-type2",
        topic: "SPD Classification",
        keywords: [],
        answer: `${t1.answer} ${t2.answer}`,
        source: { ...t1.source, section: "SPD Classification — Type I and Type II" },
      },
    };
  }

  return { kind: "hit", entry: scored[0].entry };
}

