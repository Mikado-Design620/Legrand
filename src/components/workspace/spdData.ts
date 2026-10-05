export type HotspotId =
  | "status"
  | "terminal-top"
  | "terminal-bottom"
  | "body"
  | "plug"
  | "din-rail";

export type Hotspot = {
  id: HotspotId;
  label: string;
  position: [number, number, number];
  title: string;
  summary: string;
  bullets: string[];
  spec: { label: string; value: string }[];
};

export const HOTSPOTS: Hotspot[] = [
  {
    id: "status",
    label: "Status Indicator",
    position: [0.55, 0.35, 0.41],
    title: "Status Indicator Window",
    summary:
      "Mechanical flag that turns from green to red when the internal MOV has reached end-of-life and the SPD module must be replaced.",
    bullets: [
      "Green: SPD module operational",
      "Red: Replace the plug-in module",
      "Visible without opening the enclosure",
    ],
    spec: [
      { label: "Type", value: "Mechanical flag" },
      { label: "Visibility", value: "Front face" },
      { label: "Remote contact", value: "Optional (auxiliary)" },
    ],
  },
  {
    id: "terminal-top",
    label: "Line Terminals (Top)",
    position: [-0.55, 1.45, 0.41],
    title: "Line-Side Terminals",
    summary:
      "Upstream connection to the incoming line. Tight torque and short leads are critical for low let-through voltage.",
    bullets: [
      "Connect upstream of the load",
      "Use the shortest possible conductor",
      "Respect the 50 cm total lead-length rule",
    ],
    spec: [
      { label: "Capacity", value: "Up to 35 mm²" },
      { label: "Torque", value: "3.5 Nm" },
      { label: "Conductor", value: "Cu, rigid or flexible" },
    ],
  },
  {
    id: "terminal-bottom",
    label: "Earth Terminal",
    position: [-0.55, -1.45, 0.41],
    title: "Earth (PE) Terminal",
    summary:
      "Discharges surge current to earth. The PE conductor must be straight, short, and at least equal in cross-section to the line conductors.",
    bullets: [
      "Connects directly to the main earth bar",
      "Minimum 16 mm² Cu for Type 1",
      "Avoid loops and sharp bends",
    ],
    spec: [
      { label: "Min. section (T1)", value: "16 mm² Cu" },
      { label: "Min. section (T2)", value: "6 mm² Cu" },
      { label: "Torque", value: "3.5 Nm" },
    ],
  },
  {
    id: "plug",
    label: "Plug-in Cartridge",
    position: [0.55, 1.1, 0.41],
    title: "Plug-in MOV Cartridge",
    summary:
      "Field-replaceable module containing the metal-oxide varistor. Replace when the status indicator turns red — no need to de-wire the base.",
    bullets: [
      "Hot-swappable cartridge",
      "Keyed to prevent mis-insertion",
      "Reduces downtime after a surge event",
    ],
    spec: [
      { label: "Replacement", value: "Tool-free" },
      { label: "Coding", value: "Per pole / voltage" },
      { label: "Indicator", value: "Integrated" },
    ],
  },
  {
    id: "body",
    label: "Module Body",
    position: [0, 0, 0.42],
    title: "SPD Module Body",
    summary:
      "Self-extinguishing thermoplastic enclosure housing the MOV, thermal disconnector, and internal fuse. Designed for DIN-rail mounting in distribution boards.",
    bullets: [
      "UL94 V-0 self-extinguishing housing",
      "Internal thermal disconnector",
      "9 mm modular widths per pole",
    ],
    spec: [
      { label: "Width", value: "1 module / pole" },
      { label: "Standard", value: "IEC 61643-11" },
      { label: "Mounting", value: "DIN 35 mm rail" },
    ],
  },
  {
    id: "din-rail",
    label: "DIN Rail Clip",
    position: [0, -1.8, 0.05],
    title: "DIN Rail Clip",
    summary:
      "Spring-loaded clip on the rear of the module that snaps onto a standard 35 mm DIN rail inside the distribution board.",
    bullets: [
      "Snap-on / snap-off mounting",
      "Compatible with EN 60715 rails",
      "Allows side-by-side coupling of poles",
    ],
    spec: [
      { label: "Rail", value: "35 mm symmetric" },
      { label: "Standard", value: "EN 60715" },
      { label: "Removal", value: "Flat screwdriver" },
    ],
  },
];

export const getHotspot = (id: HotspotId) =>
  HOTSPOTS.find((h) => h.id === id)!;
