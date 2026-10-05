import type { ChatMessage, RichBlock, Citation, ScenarioKind } from "./types";
import spdMarkingsAsset from "@/assets/spd-markings.png.asset.json";

const SPD_MARKINGS_IMG = spdMarkingsAsset.url;

/**
 * All scenario answers below are grounded in the two source documents
 * provided by Legrand:
 *  - "Legrand Web POC" (training program scope)
 *  - "PPT-SPD" (Surge Protection Device technical deck)
 * Citations point back to the specific page/slide in those documents.
 */

const OFF_TOPIC = [
  "cricket","football","movie","movies","joke","jokes","politics","weather",
  "stock","crypto","recipe","recipes","song","songs","celebrity","celebrities","game","gaming",
  "news","sports","ipl","world cup","olympics","basketball","tennis","golf",
  "iphone","android","apple","samsung","tesla","car","cars","bike","travel",
  "restaurant","hotel","flight","booking","amazon","flipkart","shopping",
  "math","calculate","convert","currency","dollar","euro","rupee","usd",
  "hello how are you","how are you","what's up","whats up","who are you",
  "what can you do","what do you know","tell me about yourself",
  "match","won","win","winner","score","team","player","players","goal","match",
];

const TECH_KEYWORDS = [
  "imax","in","up","uc","iimp","ka","spd","surge","type 1","type 2","type 3",
  "lightning","earthing","grounding","mcb","rcbo","din","class","varistor",
  "spark gap","gdt","waveform","8/20","10/350","photovoltaic","pv",
  "marking","markings","label","labels","construction","parameter","parameters",
];

const COMPARE_RE = /(difference|compare|vs\b|versus|better)/i;
const INSTALL_RE = /(install|mount|wire|wiring|connect|where.*place|placement)/i;
const LEARN_RE   = /(teach|learn|basics|introduce|tutorial|guide me|explain.*basics)/i;
const ORIGIN_RE  = /(origin|cause|source).*surge|why.*surge|where.*surge.*from/i;
const WHY_RE     = /(why.*protect|why.*spd|why.*matter|benefit|payback)/i;
const TECH_OVERVIEW_RE = /(technology|spark gap|gdt|gas discharge|varistor|avalanche|silicon)/i;
const PV_RE      = /(photovoltaic|solar|pv\b|dc spd)/i;
const FOLLOWUP_PRONOUNS = /\b(it|this|that|they|them|its)\b/i;

export function classify(input: string, history: ChatMessage[]): ScenarioKind {
  const q = input.trim().toLowerCase();
  if (!q) return "general";
  if (/^(hi|hello|hey|namaste|good (morning|evening))\b/.test(q)) return "greeting";
  if (q.length < 5 && !/spd|imax/.test(q)) return "clarify";
  if (OFF_TOPIC.some((w) => q.includes(w))) return "off-topic";
  if (/^(spd|what|explain|huh)\??$/i.test(q.trim())) return "clarify";

  if (/obscure|legacy|discontinued|2003 catalogue/i.test(q)) return "no-answer";
  if (/exact price|stock|availability today|moq/i.test(q)) return "low-confidence";

  if (LEARN_RE.test(q)) return "learning";
  if (COMPARE_RE.test(q)) return "compare";
  if (INSTALL_RE.test(q)) return "install";

  const lastAssistant = [...history].reverse().find((m) => m.role === "assistant");
  if (lastAssistant && FOLLOWUP_PRONOUNS.test(q) && q.split(" ").length < 10) {
    return "followup";
  }

  if (ORIGIN_RE.test(q) || WHY_RE.test(q) || TECH_OVERVIEW_RE.test(q) || PV_RE.test(q)) return "technical";
  if (TECH_KEYWORDS.some((k) => q.includes(k))) return "technical";
  return "general";
}

export type ScenarioResponse = {
  text?: string;
  blocks?: RichBlock[];
  citations?: Citation[];
  suggestions?: string[];
  showSearching?: boolean;
};

const C = {
  ppt: (slide: string, title: string): Citation => ({
    title, source: "PPT-SPD", page: `Slide ${slide}`,
  }),
  poc: (page: string, title: string): Citation => ({
    title, source: "Legrand Web POC", page: `p. ${page}`,
  }),
};

export function buildResponse(kind: ScenarioKind, input: string): ScenarioResponse {
  const q = input.toLowerCase();

  switch (kind) {
    case "off-topic":
      return {
        text: "Sorry, I can only answer questions related to Legrand SPD products and electrical surge protection training. I can't help with general topics outside my scope.",
        blocks: [{ kind: "off-topic" }],
        suggestions: [
          "What is an electrical surge?",
          "Difference between Type 1 and Type 2 SPD",
          "What causes 80% of surges?",
          "Teach me SPD basics",
        ],
      };

    case "clarify":
      return {
        blocks: [{
          kind: "clarify",
          prompt: "Could you clarify your question? Are you asking about:",
          options: ["SPD types & classification", "Installation", "Technical parameters", "Why surge protection matters"],
        }],
      };

    case "no-answer":
      return {
        blocks: [{ kind: "no-answer" }],
        suggestions: [
          "Browse current SPD range",
          "Ask about Type 1 + Type 2 combined SPDs",
          "PV / photovoltaic SPDs",
        ],
      };

    case "low-confidence":
      return {
        text: "I couldn't find a confirmed answer in the Legrand source documents for pricing or live stock. The PPT-SPD deck and Web POC brief cover product specifications, classification, and installation — not commercial data. Please contact your Legrand partner for current pricing and availability.",
        blocks: [{ kind: "low-confidence", note: "No commercial data in the provided knowledge base." }],
        citations: [C.poc("6", "Legrand Web POC — Program scope")],
        showSearching: true,
      };

    case "compare":
      return {
        text: "Per the Legrand SPD classification deck, Type 1 and Type 2 SPDs protect against different surge origins and are tested with different waveforms:",
        blocks: [{
          kind: "compare",
          title: "Type 1 vs Type 2 SPD",
          columns: ["Parameter", "Type 1", "Type 2"],
          rows: [
            ["Protects against", "Direct lightning strikes on/near the building", "Indirect lightning & induced surges on power/data lines"],
            ["Test waveform", "10/350 µs (Iimp)", "8/20 µs (In, Imax)"],
            ["Recommended for", "High-exposure sites with LPS (Lightning Protection System)", "Standard distribution boards downstream"],
            ["Install location", "Main LV panel / service entrance", "Sub-distribution boards"],
            ["Key current rating", "Iimp (impulse discharge current)", "In / Imax (discharge currents)"],
          ],
        }, {
          kind: "spec",
          title: "Type 3 — for context",
          rows: [
            { label: "Purpose", value: "Final protection close to sensitive equipment" },
            { label: "When used", value: "As a complement, or in low-exposure locations" },
          ],
        }],
        citations: [
          C.ppt("11", "SPD Classification — Type I vs Type II"),
          C.ppt("12", "SPD Classification — Type I / II / III"),
          C.ppt("10", "Current Waveforms — 10/350 & 8/20"),
        ],
        suggestions: [
          "What is Iimp?",
          "When do I need Type 1 + Type 2 combined?",
          "Where should Type 1 be installed?",
        ],
        showSearching: true,
      };

    case "install":
      return {
        text: "Installation guidance from the Legrand SPD technical deck (TN-C / TN-S system reference):",
        blocks: [{
          kind: "spec",
          title: "SPD Installation Essentials",
          rows: [
            { label: "Location", value: "Main LV panel for Type 1; sub-distribution boards for Type 2" },
            { label: "Mounting", value: "DIN rail with bistable locking clips", note: "Slide 22 — Ease of installation" },
            { label: "Terminals", value: "Clearly marked N and L to prevent wiring errors", note: "Slide 21 — Clear marking" },
            { label: "Status indicator", value: "Green window = healthy; visual fault indication on front face", note: "Slide 23 — Add-on safety" },
            { label: "Remote feedback", value: "Removable fault-signal contact terminal block for easy wiring" },
            { label: "Maintenance", value: "Plug-in modules with foolproofing pins — quick, safe module replacement", note: "Slide 24" },
          ],
        }],
        citations: [
          C.ppt("13", "SPD Installation — TN-C/TN-S diagram"),
          C.ppt("21", "Clear Marking for Easy Wiring"),
          C.ppt("22", "Ease of Installation — Bistable Locking Clips"),
          C.ppt("24", "Ease of Maintenance — Plug-in Modules"),
        ],
        suggestions: [
          "What does the status indicator show?",
          "How does plug-in module replacement work?",
          "Show SPD parameters (Uc, In, Imax, Up)",
        ],
        showSearching: true,
      };

    case "technical": {
      // Specific intents within technical
      if (ORIGIN_RE.test(q) || /(80|15|5).*%/.test(q) || /origin/.test(q)) {
        return {
          text: "According to the Legrand SPD deck, surges come from three main origins:",
          blocks: [{
            kind: "spec",
            title: "Origin of Surges",
            rows: [
              { label: "On/Off of engines", value: "80%", note: "Switching of inductive loads — by far the largest cause" },
              { label: "Lightning", value: "15%", note: "Direct and indirect atmospheric discharges" },
              { label: "Switching electrical network", value: "5%", note: "Utility-side switching transients" },
            ],
          }],
          citations: [C.ppt("4", "What are the Origin of Surges")],
          suggestions: ["Why does surge protection matter?", "Type 1 vs Type 2 SPD", "Show SPD technologies"],
          showSearching: true,
        };
      }

      if (WHY_RE.test(q)) {
        return {
          text: "Legrand highlights five reasons surge protection matters:",
          blocks: [{
            kind: "spec",
            title: "Why Surge Protection Matters",
            rows: [
              { label: "Payback", value: "The investment has a guaranteed quick payback time" },
              { label: "Security", value: "Operates independently in all weather conditions" },
              { label: "Comfort", value: "Continuous protection across the SPD family" },
              { label: "Durability", value: "Longer component life, reduced maintenance time" },
              { label: "Saving", value: "Prevents losses from equipment damaged by lightning & surges" },
            ],
          }],
          citations: [C.ppt("14", "Why Surge Protection Matters More")],
          suggestions: ["Origin of surges?", "Type 1 vs Type 2", "Installation essentials"],
          showSearching: true,
        };
      }

      if (TECH_OVERVIEW_RE.test(q)) {
        return {
          text: "SPDs use two families of internal technologies, per Legrand's technical overview:",
          blocks: [{
            kind: "spec",
            title: "SPD Internal Technologies",
            rows: [
              { label: "Voltage switching", value: "Spark gap · 2-pole GDT · 3-pole Gas Discharge Tube", note: "Short-circuit the surge to earth" },
              { label: "Voltage limiting", value: "Varistor (MOV) · Silicon Avalanche Diode", note: "Clamp voltage to a safe level" },
            ],
          }],
          citations: [C.ppt("9", "SPD Technology")],
          suggestions: ["What is Up?", "Type 1 vs Type 2 waveforms", "Current waveform explanation"],
          showSearching: true,
        };
      }

      if (PV_RE.test(q)) {
        return {
          text: "For photovoltaic installations, Legrand offers dedicated DC SPDs:",
          blocks: [{
            kind: "spec",
            title: "SPD for Photovoltaic — Type 2 DC",
            rows: [
              { label: "Type", value: "Type 2 (T2) — DC" },
              { label: "Poles", value: "2P" },
              { label: "In", value: "18 kA (8/20 µs)" },
              { label: "Imax", value: "40 kA (8/20 µs)" },
              { label: "Uc", value: "1500 V= / 1040 V=" },
            ],
          }],
          citations: [C.ppt("20", "Extensive Range — PV Installations")],
          suggestions: ["Show AC SPD range", "Type 1 + Type 2 combined", "What is Uc?"],
          showSearching: true,
        };
      }

      // Default technical parameters card — include annotated SPD image
      return {
        text: "Key Legrand SPD parameters (from the construction & parameters reference). Each label on the SPD body maps to one of these values:",
        blocks: [{
          kind: "image",
          src: SPD_MARKINGS_IMG,
          alt: "Annotated Legrand SPD showing In, Imax, Up, Uc, Iimp, Type 1, Type 2 and status indicator markings",
          title: "Legrand SPD — Markings on the device",
          caption: "Source: PPT-SPD — SPD Construction & Markings",
        }, {
          kind: "spec",
          title: "SPD Parameters",
          rows: [
            { label: "Uc", value: "Max continuous operating voltage", note: "e.g. 320 V~ on plug-in modules" },
            { label: "In", value: "Nominal discharge current (8/20 µs)", note: "e.g. 20 kA — Type 2" },
            { label: "Imax", value: "Maximum discharge current (8/20 µs)", note: "e.g. 50 kA — Type 2" },
            { label: "Iimp", value: "Impulse discharge current (10/350 µs)", note: "Type 1 only — e.g. 8 kA" },
            { label: "Up", value: "Voltage protection level", note: "e.g. 1.7 kV — let-through voltage" },
            { label: "Status indicator", value: "Green/red window on front face" },
          ],
        }],
        citations: [
          C.ppt("26", "SPD Parameters"),
          C.ppt("25", "SPD Construction & Markings"),
          C.ppt("24", "Plug-in module markings"),
        ],
        suggestions: ["Type 1 vs Type 2 SPD", "What is the 10/350 waveform?", "Installation essentials"],
        showSearching: true,
      };
    }

    case "learning":
      return {
        text: "Let's start with the structured SPD curriculum, built from Legrand's training deck.",
        blocks: [{
          kind: "lesson",
          title: "SPD Fundamentals — Lesson 1 of 5",
          steps: [
            "What is an electrical surge? (transient wave of current/voltage)",
            "Where do surges come from? — 80% switching, 15% lightning, 5% network",
            "Why protection matters: payback, security, durability, saving",
            "SPD classification: Type 1 / Type 2 / Type 3",
            "Key parameters: Uc, In, Imax, Iimp, Up",
          ],
          progress: 1,
        }],
        citations: [
          C.ppt("3", "What are Electrical Surges"),
          C.ppt("4", "Origin of Surges"),
          C.ppt("14", "Why Surge Protection Matters"),
        ],
        suggestions: ["Continue lesson", "Jump to Type comparison", "Show me parameters"],
        showSearching: true,
      };

    case "followup":
      return {
        text: "Continuing from the previous topic — for a Type 1 SPD installed at the main LV panel, ensure DIN-rail mounting with bistable locking clips, properly identified N and L terminals, and a healthy green status indicator before energising. The plug-in module design lets you replace cartridges safely without rewiring the base.",
        citations: [
          C.ppt("13", "SPD Installation"),
          C.ppt("22", "Bistable Locking Clips"),
          C.ppt("24", "Plug-in Maintenance"),
        ],
        suggestions: ["What about Type 2 placement?", "Status indicator details", "Show the parameters again"],
      };

    case "greeting":
      return {
        text: "Hello — I'm your Legrand SPD AI Trainer. My answers are grounded in Legrand's official SPD technical deck and training program. Ask me about surge origins, SPD types, installation, parameters, or the product range.",
        suggestions: [
          "What is an electrical surge?",
          "What causes 80% of surges?",
          "Difference between Type 1 and Type 2 SPD",
          "Teach me SPD basics",
        ],
      };

    case "general":
    default:
      return {
        text: `Based on Legrand's SPD documentation: a surge is a transient wave of current, voltage or power in an electric circuit — short in duration but very high in intensity. SPDs (Surge Protection Devices) divert that energy safely to earth, protecting downstream equipment. Selection depends on exposure level (direct vs indirect lightning), installation point, and the protected equipment's withstand voltage.`,
        citations: [
          C.ppt("3", "What are Electrical Surges"),
          C.ppt("11", "SPD Classification"),
        ],
        suggestions: [
          "Origin of surges?",
          "Which SPD do I need?",
          "Why does surge protection matter?",
        ],
        showSearching: true,
      };
  }
}
