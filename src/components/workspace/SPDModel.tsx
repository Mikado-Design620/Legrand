import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Html, Line, RoundedBox } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import {
  CanvasTexture,
  DoubleSide,
  ExtrudeGeometry,
  MathUtils,
  NormalBlending,
  Shape,
  ShapeGeometry,
  SRGBColorSpace,
  type Group,
  type InterleavedBufferAttribute,
  type Mesh,
  type MeshBasicMaterial,
  type PointLight,
} from "three";
import type { Line2 } from "three-stdlib";
import { BRAND } from "@/lib/brand";
import { HOTSPOTS, type HotspotId } from "./spdData";

/**
 * Legrand 4 122 44 — Type 2 plug-in SPD, Imax 40 kA, 1P+N (neutral on the
 * left), 2 modules. Dimensions follow datasheet F02060EN: 35.4 mm wide, 83 mm
 * body with a 5.3 mm rail latch below, terminal shoulders 50.2 mm from the rail
 * and the 45 mm nose 63.3 mm, with the cartridge handles reaching 69.5 mm.
 * Body and cartridges are RAL 7035; each cartridge has a dark-grey handle cap.
 * Everything below is laid out in millimetres and scaled by `mm`.
 */

/** Scene units per millimetre. */
const mm = (v: number) => v * 0.03;

const W = 35.4;
const H = 83;
const NOSE_H = 45;
const Z_REAR = -33; // centres the module front-to-back
const Z_SHOULDER = Z_REAR + 50.2;
const Z_FACE = Z_REAR + 63.3;
const Z_CAP = Z_REAR + 69.5;
const Y_TERMINAL = 32; // screw centres on the shoulders
const Y_WINDOW = -3.3; // status window, just below where the handle "ears" end
const Y_CAP = 8.6; // bottom edge of the handle cap on the cartridge face
const Y_FLOOR = -49;
const RAIL_L = 120;

const CART_W = 17.0; // light-grey cartridge body
const CAP_W = 17.7; // dark handle cap, full module width

const POLES = [
  { pole: "N", x: -8.9, ref: "4 123 00" },
  { pole: "L", x: 8.9, ref: "4 122 99" },
] as const;
type Pole = (typeof POLES)[number]["pole"];
const X_N = POLES[0].x;
const X_L = POLES[1].x;

const COLOR = {
  body: "#cdd0cc", // RAL 7035
  cap: "#4a4e52",
  inset: "#dfe2df",
  ink: "#383b3e",
  taupe: "#958e84",
  recess: "#aeb2ae",
  hole: "#1a1a1a",
  zinc: "#c9ccd0",
  brass: "#c7a04c",
  rail: "#c4c7cc",
  flag: "#1fae4b",
  bolt: "#ffa400", // amber: additive yellow vanished against the pale background
};

const HOTSPOT = Object.fromEntries(HOTSPOTS.map((h) => [h.id, h])) as Record<
  HotspotId,
  (typeof HOTSPOTS)[number]
>;

type Props = {
  activeHotspot: HotspotId | null;
  onHotspot: (id: HotspotId) => void;
  exploded: boolean;
  surging: boolean;
};

/**
 * A click on a part asks about it; a drag that starts on the model is the user
 * rotating it. (Reacting on pointer-down made every rotation start a lecture.)
 */
const pick = (id: HotspotId, onHotspot: (id: HotspotId) => void) => (e: ThreeEvent<MouseEvent>) => {
  e.stopPropagation();
  if (e.delta > 4) return;
  onHotspot(id);
};

/** For effect-only objects that must never intercept a click. */
const noRaycast = () => null;

/** The selected part glows Legrand red rather than being repainted, so it still looks like the product. */
const glow = (on: boolean) => ({
  emissive: on ? BRAND.red : "#000000",
  emissiveIntensity: on ? 0.35 : 0,
});

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

/** Extrude a side profile drawn in (depth z, height y) millimetres across `width` mm of X, centred. */
function extrudeAcrossX(shape: Shape, width: number, bevel = 0) {
  const depth = width - 2 * bevel;
  const g = new ExtrudeGeometry(shape, {
    depth: mm(depth),
    bevelEnabled: bevel > 0,
    bevelSize: mm(bevel),
    bevelThickness: mm(bevel),
    bevelSegments: 2,
    curveSegments: 16,
  });
  g.rotateY(-Math.PI / 2);
  g.translate(mm(depth / 2), 0, 0);
  return g;
}

function polygon(points: [number, number][]) {
  const s = new Shape();
  points.forEach(([a, b], i) => (i === 0 ? s.moveTo(mm(a), mm(b)) : s.lineTo(mm(a), mm(b))));
  s.closePath();
  return s;
}

function roundedRect(w: number, h: number, r: number) {
  const s = new Shape();
  const x = mm(-w / 2);
  const y = mm(-h / 2);
  const W_ = mm(w);
  const H_ = mm(h);
  const R = mm(r);
  s.moveTo(x + R, y);
  s.lineTo(x + W_ - R, y);
  s.quadraticCurveTo(x + W_, y, x + W_, y + R);
  s.lineTo(x + W_, y + H_ - R);
  s.quadraticCurveTo(x + W_, y + H_, x + W_ - R, y + H_);
  s.lineTo(x + R, y + H_);
  s.quadraticCurveTo(x, y + H_, x, y + H_ - R);
  s.lineTo(x, y + R);
  s.quadraticCurveTo(x, y, x + R, y);
  return s;
}

/** Geometry built once per mount and disposed with it. */
function useGeometry<T extends { dispose: () => void }>(make: () => T) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const g = useMemo(make, []);
  useEffect(() => () => g.dispose(), [g]);
  return g;
}

// Handle cap: flat on top, sloping down to the cartridge face.
const CAP_PROFILE: [number, number][] = [
  [Z_SHOULDER - 2, 22.3],
  [Z_CAP - 1.4, 22.3],
  [Z_CAP, 20.9],
  [Z_FACE + 0.15, Y_CAP],
  [Z_SHOULDER - 2, Y_CAP],
];
// Sloped grip face, for placing the raised dots on it.
const SLOPE_FROM = { z: Z_CAP, y: 20.9 };
const SLOPE_TO = { z: Z_FACE + 0.15, y: Y_CAP };

/** The cap's "ears" run down both sides of the cartridge to about mid-height, rounded at the front. */
function earShape() {
  const z0 = Z_SHOULDER - 2;
  const z1 = Z_FACE + 0.1;
  const r = 4;
  const s = new Shape();
  s.moveTo(mm(z0), mm(Y_CAP + 0.5));
  s.lineTo(mm(z1), mm(Y_CAP + 0.5));
  s.lineTo(mm(z1), mm(0.6 + r));
  s.quadraticCurveTo(mm(z1), mm(0.6), mm(z1 - r), mm(0.6));
  s.lineTo(mm(z0), mm(0.6));
  s.closePath();
  return s;
}

// ---------------------------------------------------------------------------
// Printed labels
// ---------------------------------------------------------------------------

type Draw = (
  ctx: CanvasRenderingContext2D,
  px: (mm: number) => number,
  logo: HTMLImageElement | null,
) => void;

const PX_PER_MM = 26;
const font = (weight: number, size: number) =>
  `${weight} ${size}px "Helvetica Neue", Helvetica, Arial, sans-serif`;

/** A printed label as a texture: drawn at once, then again with the Legrand wordmark once it has loaded. */
function useLabel(wMm: number, hMm: number, draw: Draw) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(wMm * PX_PER_MM);
    canvas.height = Math.round(hMm * PX_PER_MM);
    const t = new CanvasTexture(canvas);
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, [wMm, hMm]);

  useEffect(() => {
    const canvas = texture.image as HTMLCanvasElement;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const paint = (logo: HTMLImageElement | null) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      draw(ctx, (v) => v * PX_PER_MM, logo);
      texture.needsUpdate = true;
    };
    paint(null);
    const img = new Image();
    img.onload = () => paint(img);
    img.src = BRAND.logoDark;
    return () => {
      img.onload = null;
    };
  }, [texture, draw]);

  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

/** The bold "legrand" wordmark — the brand image without its L mark and ®. */
function wordmark(
  ctx: CanvasRenderingContext2D,
  logo: HTMLImageElement,
  cx: number,
  cy: number,
  w: number,
) {
  const sx = logo.width * 0.213;
  const sw = logo.width * 0.742;
  const h = (w * logo.height) / sw;
  ctx.drawImage(logo, sx, 0, sw, logo.height, cx - w / 2, cy - h / 2, w, h);
}

/** "I" with a subscript "max", as ratings are printed on the device. */
function symbol(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  main: string,
  sub: string,
  size: number,
) {
  ctx.textAlign = "left";
  ctx.font = font(600, size);
  ctx.fillText(main, x, y);
  const w = ctx.measureText(main).width;
  ctx.font = font(600, size * 0.68);
  ctx.fillText(sub, x + w + size * 0.04, y + size * 0.32);
}

function verticalText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  weight = 500,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = font(weight, size);
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

/** Surge pictogram: a storm cloud with lightning above and below it. */
function stormCloud(
  ctx: CanvasRenderingContext2D,
  px: (v: number) => number,
  cx: number,
  cy: number,
) {
  ctx.fillStyle = COLOR.cap;
  ctx.beginPath();
  ctx.arc(cx - px(1.9), cy + px(0.3), px(1.3), 0, Math.PI * 2);
  ctx.arc(cx - px(0.4), cy - px(0.5), px(1.8), 0, Math.PI * 2);
  ctx.arc(cx + px(1.6), cy + px(0.1), px(1.45), 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(cx - px(1.9), cy + px(0.2), px(3.5), px(1.4));
  const zigzag = (x: number, y: number, s: number) => {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - px(0.9 * s), y + px(1.5 * s));
    ctx.lineTo(x - px(0.1 * s), y + px(1.4 * s));
    ctx.lineTo(x - px(0.7 * s), y + px(2.7 * s));
    ctx.lineTo(x + px(0.8 * s), y + px(1.0 * s));
    ctx.lineTo(x + px(0.0 * s), y + px(1.1 * s));
    ctx.lineTo(x + px(0.5 * s), y);
    ctx.closePath();
    ctx.fill();
  };
  zigzag(cx - px(0.6), cy + px(1.7), 0.95);
  zigzag(cx + px(1.5), cy + px(1.6), 0.8);
  zigzag(cx + px(3.1), cy - px(3.1), 0.6);
}

/** IEC varistor (L cartridge) or spark gap (N–PE cartridge) symbol. */
function componentSymbol(
  ctx: CanvasRenderingContext2D,
  px: (v: number) => number,
  pole: Pole,
  cx: number,
  cy: number,
) {
  ctx.lineWidth = px(0.22);
  ctx.beginPath();
  if (pole === "L") {
    ctx.moveTo(cx - px(2.3), cy);
    ctx.lineTo(cx - px(1.4), cy);
    ctx.moveTo(cx + px(1.4), cy);
    ctx.lineTo(cx + px(2.3), cy);
    ctx.rect(cx - px(1.4), cy - px(0.65), px(2.8), px(1.3));
    ctx.moveTo(cx - px(2.0), cy + px(1.2));
    ctx.lineTo(cx - px(1.4), cy + px(1.2));
    ctx.lineTo(cx + px(1.6), cy - px(1.2));
    ctx.stroke();
  } else {
    ctx.arc(cx, cy, px(1.5), 0, Math.PI * 2);
    ctx.moveTo(cx - px(2.4), cy);
    ctx.lineTo(cx - px(1.5), cy);
    ctx.moveTo(cx + px(1.5), cy);
    ctx.lineTo(cx + px(2.4), cy);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - px(1.2), cy - px(0.55));
    ctx.lineTo(cx - px(0.25), cy);
    ctx.lineTo(cx - px(1.2), cy + px(0.55));
    ctx.moveTo(cx + px(1.2), cy - px(0.55));
    ctx.lineTo(cx + px(0.25), cy);
    ctx.lineTo(cx + px(1.2), cy + px(0.55));
    ctx.fill();
  }
}

// Printable face of a cartridge, under the handle cap.
const CART_FACE = { w: 14.6, h: 30, top: 8.2 };

function cartridgeLabel(pole: Pole, ref: string): Draw {
  return (ctx, px, logo) => {
    const cx = px(CART_FACE.w / 2);
    ctx.textBaseline = "middle";

    // Lighter inset carrying the surge pictogram.
    ctx.fillStyle = COLOR.inset;
    ctx.strokeStyle = "rgba(0,0,0,0.12)";
    ctx.lineWidth = px(0.15);
    ctx.beginPath();
    ctx.roundRect(px(1.1), px(0.6), px(12.4), px(7.4), px(1.6));
    ctx.fill();
    ctx.stroke();
    stormCloud(ctx, px, cx - px(0.4), px(3.6));

    ctx.fillStyle = COLOR.ink;
    ctx.strokeStyle = COLOR.ink;

    // Imax rating.
    symbol(ctx, cx - px(2.6), px(15), "I", "max", px(1.5));
    ctx.textAlign = "center";
    ctx.font = font(800, px(3.1));
    ctx.fillText("40kA", cx - px(0.4), px(17.7));

    // Boxed T2 and the component symbol.
    ctx.lineWidth = px(0.3);
    ctx.beginPath();
    ctx.roundRect(px(2.1), px(19.5), px(5.2), px(3.5), px(0.5));
    ctx.stroke();
    ctx.font = font(800, px(2.4));
    ctx.fillText("T2", px(4.7), px(21.35));
    componentSymbol(ctx, px, pole, px(10.1), px(21.25));

    if (logo) wordmark(ctx, logo, cx - px(0.4), px(25.4), px(10));

    // Red L-shaped stripe down the left edge and under the wordmark, plus a short dash.
    ctx.fillStyle = BRAND.red;
    ctx.fillRect(px(0.4), px(13.4), px(0.7), px(14.6));
    ctx.fillRect(px(0.4), px(27.4), px(10.4), px(0.6));
    ctx.fillRect(px(11.7), px(27.4), px(1.6), px(0.6));

    // Cartridge reference beside a small bar.
    ctx.fillStyle = COLOR.ink;
    ctx.fillRect(px(13.4), px(13.4), px(0.45), px(9));
    verticalText(ctx, ref, px(12.6), px(17.9), px(0.95));
  };
}

const LABEL_BY_POLE: Record<Pole, Draw> = {
  N: cartridgeLabel("N", POLES[0].ref),
  L: cartridgeLabel("L", POLES[1].ref),
};

// Printable areas of the terminal shoulders (flat front, inside the rounded edges).
const SHOULDER_FACE = { w: 32, h: 17.2 };
const Y_SHOULDER_LABEL = 31.2;
const shoulderX = (x: number) => SHOULDER_FACE.w / 2 + x; // module x → label x (mm)

const topShoulderLabel: Draw = (ctx, px) => {
  // The neutral terminal sits on a darker taupe patch.
  ctx.fillStyle = COLOR.taupe;
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.moveTo(px(0.6), px(16.9));
  ctx.lineTo(px(11.4), px(16.9));
  ctx.lineTo(px(14.4), px(0.4));
  ctx.lineTo(px(3.6), px(0.4));
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.fillStyle = COLOR.ink;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = font(800, px(2.4));
  ctx.fillText("N", px(shoulderX(X_N)), px(2.1));
  ctx.fillText("L", px(shoulderX(X_L)), px(2.1));
};

const bottomShoulderLabel: Draw = (ctx, px) => {
  ctx.fillStyle = COLOR.ink;
  ctx.strokeStyle = COLOR.ink;

  // Earth symbol in a circle, above the PE screw.
  const ex = px(shoulderX(X_N));
  const ey = px(2.6);
  ctx.lineWidth = px(0.2);
  ctx.beginPath();
  ctx.arc(ex, ey, px(1.75), 0, Math.PI * 2);
  ctx.moveTo(ex, ey - px(1.1));
  ctx.lineTo(ex, ey + px(0.1));
  [1.0, 0.65, 0.3].forEach((half, i) => {
    const y = ey + px(0.1 + i * 0.45);
    ctx.moveTo(ex - px(half), y);
    ctx.lineTo(ex + px(half), y);
  });
  ctx.stroke();

  verticalText(ctx, "legrand", px(1.1), px(8.6), px(1.35), 800);
  verticalText(ctx, "4 122 44", px(13.1), px(8.8), px(1.1));
  verticalText(ctx, "Uc 320/255V~", px(18.9), px(8.8), px(1.05));
  verticalText(ctx, "Up ≤ 1,7kV", px(30.9), px(8.8), px(1.05));
};

const sideLabel: Draw = (ctx, px) => {
  ctx.fillStyle = COLOR.ink;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = font(700, px(4.2));
  ctx.fillText("CE", px(8), px(3.6));
  ctx.font = font(500, px(1.2));
  ctx.fillText("4 122 44  ·  IEC/EN 61643-11", px(8), px(7.6));
};

function Label({
  w,
  h,
  draw,
  position,
  rotation,
}: {
  w: number;
  h: number;
  draw: Draw;
  position: [number, number, number];
  rotation?: [number, number, number];
}) {
  const map = useLabel(w, h, draw);
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[mm(w), mm(h)]} />
      <meshStandardMaterial
        map={map}
        transparent
        roughness={0.6}
        polygonOffset
        polygonOffsetFactor={-2}
      />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// Parts
// ---------------------------------------------------------------------------

/** Combination slotted / Pozidriv terminal screw, zinc-plated, in its round well. */
function Screw({ x, y, active }: { x: number; y: number; active: boolean }) {
  return (
    <group position={[mm(x), mm(y), mm(Z_SHOULDER)]}>
      <mesh position={[0, 0, mm(0.06)]}>
        <circleGeometry args={[mm(4.4), 40]} />
        <meshStandardMaterial color={COLOR.hole} roughness={0.9} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, mm(0.6)]}>
        <cylinderGeometry args={[mm(3.4), mm(3.5), mm(1.1), 40]} />
        <meshStandardMaterial color={COLOR.zinc} metalness={1} roughness={0.3} {...glow(active)} />
      </mesh>
      <mesh position={[0, 0, mm(1.17)]}>
        <planeGeometry args={[mm(5.8), mm(0.8)]} />
        <meshStandardMaterial color="#4d4f52" metalness={0.8} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0, mm(1.17)]} rotation={[0, 0, Math.PI / 2]}>
        <planeGeometry args={[mm(3.2), mm(0.8)]} />
        <meshStandardMaterial color="#4d4f52" metalness={0.8} roughness={0.5} />
      </mesh>
    </group>
  );
}

/** Rounded-rectangle wire entry on the top (or bottom) face. */
function WireEntry({ x, top, geometry }: { x: number; top: boolean; geometry: ShapeGeometry }) {
  const y = top ? H / 2 + 0.05 : -H / 2 - 0.05;
  return (
    <mesh
      geometry={geometry}
      position={[mm(x), mm(y), mm(Z_SHOULDER - 6)]}
      rotation={[top ? -Math.PI / 2 : Math.PI / 2, 0, 0]}
    >
      <meshStandardMaterial color={COLOR.hole} roughness={1} side={DoubleSide} />
    </mesh>
  );
}

function Pin({
  id,
  active,
  onHotspot,
}: {
  id: HotspotId;
  active: boolean;
  onHotspot: (id: HotspotId) => void;
}) {
  const h = HOTSPOT[id];
  return (
    <Html position={h.position} center distanceFactor={6} zIndexRange={[10, 0]}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onHotspot(id);
        }}
        className={`group relative flex items-center justify-center rounded-full transition-all ${
          active ? "h-5 w-5 bg-primary shadow-glow" : "h-3.5 w-3.5 border-2 border-primary bg-white"
        }`}
        aria-label={h.label}
      >
        <span
          className={`absolute inset-0 rounded-full bg-primary/40 ${active ? "animate-ping" : ""}`}
        />
        {/* Hover tooltip — preview only, no AI call */}
        <span className="pointer-events-none absolute left-5 top-1/2 z-20 w-56 -translate-y-1/2 rounded-lg border border-border bg-card/95 px-3 py-2 text-left opacity-0 shadow-elegant backdrop-blur transition-opacity duration-150 group-hover:opacity-100">
          <span className="block text-[11px] font-semibold text-foreground">{h.label}</span>
          <span className="mt-1 block text-[10px] leading-snug text-muted-foreground">
            {h.summary}
          </span>
        </span>
      </button>
    </Html>
  );
}

function Cartridge({
  pole,
  x,
  groupRef,
  glowRef,
  capGeometry,
  earGeometry,
  activeHotspot,
  onHotspot,
}: {
  pole: Pole;
  x: number;
  groupRef: React.RefObject<Group | null>;
  glowRef: React.RefObject<MeshBasicMaterial | null>;
  capGeometry: ExtrudeGeometry;
  earGeometry: ExtrudeGeometry;
  activeHotspot: HotspotId | null;
  onHotspot: (id: HotspotId) => void;
}) {
  const depth = Z_FACE - (Z_SHOULDER - 2); // seats 2 mm into the base
  const zCentre = Z_SHOULDER - 2 + depth / 2;
  const plugActive = activeHotspot === "plug";
  const statusActive = activeHotspot === "status";

  // Raised grip dots on the sloped face of the handle.
  const dots = useMemo(() => {
    const dz = SLOPE_TO.z - SLOPE_FROM.z;
    const dy = SLOPE_TO.y - SLOPE_FROM.y;
    const len = Math.hypot(dz, dy);
    const [nz, ny] = [-dy / len, dz / len]; // outward normal (forward and down)
    const out: [number, number, number][] = [];
    [0.28, 0.5, 0.72].forEach((s) =>
      [-5.4, -1.8, 1.8, 5.4].forEach((dx) =>
        out.push([
          mm(x + dx),
          mm(SLOPE_FROM.y + dy * s + ny * 0.55),
          mm(SLOPE_FROM.z + dz * s + nz * 0.55),
        ]),
      ),
    );
    return out;
  }, [x]);

  return (
    <group ref={groupRef} onClick={pick("plug", onHotspot)}>
      <RoundedBox
        args={[mm(CART_W), mm(NOSE_H - 0.6), mm(depth)]}
        radius={mm(1.2)}
        smoothness={4}
        position={[mm(x), 0, mm(zCentre)]}
        castShadow
      >
        <meshPhysicalMaterial
          color={COLOR.body}
          roughness={0.48}
          clearcoat={0.15}
          clearcoatRoughness={0.6}
          {...glow(plugActive)}
        />
      </RoundedBox>

      {/* Dark-grey handle cap with its ears down both sides. */}
      <mesh geometry={capGeometry} position={[mm(x), 0, 0]} castShadow>
        <meshPhysicalMaterial
          color={COLOR.cap}
          roughness={0.5}
          clearcoat={0.1}
          {...glow(plugActive)}
        />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          geometry={earGeometry}
          position={[mm(x + side * (CART_W / 2 + 0.05)), 0, 0]}
        >
          <meshPhysicalMaterial color={COLOR.cap} roughness={0.5} {...glow(plugActive)} />
        </mesh>
      ))}
      {dots.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[mm(0.55), 12, 8]} />
          <meshStandardMaterial color={COLOR.cap} roughness={0.55} />
        </mesh>
      ))}

      <Label
        w={CART_FACE.w}
        h={CART_FACE.h}
        draw={LABEL_BY_POLE[pole]}
        position={[mm(x), mm(CART_FACE.top - CART_FACE.h / 2), mm(Z_FACE + 0.03)]}
      />

      {/* Status window (varistor cartridge only): green when healthy, turns red/orange at end of life. */}
      {pole === "L" && (
        <group position={[mm(x), mm(Y_WINDOW), mm(Z_FACE)]} onClick={pick("status", onHotspot)}>
          <mesh position={[0, 0, mm(0.08)]}>
            <planeGeometry args={[mm(13), mm(4)]} />
            <meshStandardMaterial color="#1e1e1e" roughness={0.35} {...glow(statusActive)} />
          </mesh>
          <mesh position={[0, 0, mm(0.12)]}>
            <planeGeometry args={[mm(11.6), mm(2.8)]} />
            <meshStandardMaterial
              color={COLOR.flag}
              emissive={COLOR.flag}
              emissiveIntensity={statusActive ? 0.8 : 0.22}
              roughness={0.5}
            />
          </mesh>
          <mesh position={[0, 0, mm(0.45)]}>
            <boxGeometry args={[mm(13), mm(4), mm(0.6)]} />
            <meshPhysicalMaterial
              color="#ffffff"
              transparent
              opacity={0.2}
              roughness={0.05}
              clearcoat={1}
            />
          </mesh>
        </group>
      )}

      {/* Energy glow during the surge simulation. It wraps the whole cartridge, so it must not
          take clicks: it swallowed the status window's, which then read as the cartridge. */}
      <mesh position={[mm(x), 0, mm((Z_SHOULDER - 2 + Z_CAP) / 2)]} raycast={noRaycast}>
        <boxGeometry args={[mm(CAP_W + 0.8), mm(NOSE_H + 0.8), mm(Z_CAP - Z_SHOULDER + 2.8)]} />
        <meshBasicMaterial
          ref={glowRef}
          color="#ffb020"
          transparent
          opacity={0}
          blending={NormalBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {pole === "L" && <Pin id="status" active={statusActive} onHotspot={onHotspot} />}
      {pole === "N" && <Pin id="plug" active={plugActive} onHotspot={onHotspot} />}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Surge effect
// ---------------------------------------------------------------------------

const SURGE_CYCLE = 1.6; // s

type Vec3 = [number, number, number];
type BoltSpec = { from: Vec3; to: Vec3; segments: number; jitter: number };

// The strike comes in on the L terminal from above and leaves the PE terminal for the floor (mm).
const BOLT_IN: BoltSpec = {
  from: [X_L, 118, 6],
  to: [X_L, H / 2 + 0.5, Z_SHOULDER - 6],
  segments: 10,
  jitter: 2.6,
};
const BOLT_OUT: BoltSpec = {
  from: [X_N, -H / 2 - 0.5, Z_SHOULDER - 6],
  to: [X_N, Y_FLOOR, 6],
  segments: 6,
  jitter: 2,
};

/** Point `i` of a bolt in scene units; the inner points are pushed sideways by up to `jitter` mm. */
function boltPoint(b: BoltSpec, i: number, jitter: number): Vec3 {
  const f = i / b.segments;
  const j = i === 0 || i === b.segments ? 0 : jitter;
  return [
    mm(b.from[0] + (b.to[0] - b.from[0]) * f + (Math.random() - 0.5) * 2 * j),
    mm(b.from[1] + (b.to[1] - b.from[1]) * f),
    mm(b.from[2] + (b.to[2] - b.from[2]) * f + (Math.random() - 0.5) * 2 * j),
  ];
}

/**
 * The straight line each bolt starts as. three.js sizes an instanced line's
 * buffers from its first geometry, so the seed must have every point the bolt
 * will ever have — a two-point seed drew one segment — and the bolt is then
 * rewritten in place (`jag`) rather than given fresh positions every frame.
 */
const seed = (b: BoltSpec) => Array.from({ length: b.segments + 1 }, (_, i) => boltPoint(b, i, 0));
const BOLT_IN_SEED = seed(BOLT_IN);
const BOLT_OUT_SEED = seed(BOLT_OUT);

/** Re-jag a bolt by overwriting its segment buffer (start and end point per segment). */
function jag(line: Line2, b: BoltSpec) {
  const attr = line.geometry.getAttribute("instanceStart") as InterleavedBufferAttribute;
  const arr = attr.data.array as Float32Array;
  let prev = boltPoint(b, 0, b.jitter);
  for (let i = 1; i <= b.segments; i++) {
    const next = boltPoint(b, i, b.jitter);
    arr.set(prev, (i - 1) * 6);
    arr.set(next, (i - 1) * 6 + 3);
    prev = next;
  }
  attr.data.needsUpdate = true;
}

const pulse = (t: number, at: number, width: number) => Math.max(0, 1 - Math.abs(t - at) / width);

// ---------------------------------------------------------------------------
// The model
// ---------------------------------------------------------------------------

export function SPDModel({ activeHotspot, onHotspot, exploded, surging }: Props) {
  const cartN = useRef<Group>(null);
  const cartL = useRef<Group>(null);
  const rail = useRef<Group>(null);
  const glowN = useRef<MeshBasicMaterial>(null);
  const glowL = useRef<MeshBasicMaterial>(null);
  const inBolt = useRef<Line2>(null);
  const outBolt = useRef<Line2>(null);
  const ring = useRef<Mesh>(null);
  const ringMat = useRef<MeshBasicMaterial>(null);
  const flash = useRef<PointLight>(null);

  const capGeometry = useGeometry(() => extrudeAcrossX(polygon(CAP_PROFILE), CAP_W, 0.5));
  const earGeometry = useGeometry(() => extrudeAcrossX(earShape(), 0.6));
  const entryGeometry = useGeometry(() => new ShapeGeometry(roundedRect(7.5, 5, 1.5)));
  const recessGeometry = useGeometry(() => {
    const s = new Shape();
    s.absarc(0, 0, mm(4.4), Math.PI, 0, true);
    s.closePath();
    return new ShapeGeometry(s, 24);
  });
  const railGeometry = useGeometry(() => {
    // 35 × 7.5 mm top-hat rail (EN 60715), 1 mm steel; the flanges touch the back of the module.
    const zf = Z_REAR - 0.05;
    const zb = zf - 7.5;
    return extrudeAcrossX(
      polygon([
        [zf, 17.5],
        [zf - 1, 17.5],
        [zf - 1, 13.5],
        [zb, 13.5],
        [zb, -13.5],
        [zf - 1, -13.5],
        [zf - 1, -17.5],
        [zf, -17.5],
        [zf, -12.5],
        [zb + 1, -12.5],
        [zb + 1, 12.5],
        [zf, 12.5],
      ]),
      RAIL_L,
    );
  });

  useEffect(() => () => void (document.body.style.cursor = ""), []);

  useFrame((state, dt) => {
    // Explode: the cartridges pull straight out of the base; the rail drops back.
    const pull = exploded ? 26 : 0;
    const spread = exploded ? 4 : 0;
    if (cartN.current) {
      cartN.current.position.z = MathUtils.damp(cartN.current.position.z, mm(pull), 4.5, dt);
      cartN.current.position.x = MathUtils.damp(cartN.current.position.x, mm(-spread), 4.5, dt);
    }
    if (cartL.current) {
      cartL.current.position.z = MathUtils.damp(cartL.current.position.z, mm(pull), 6, dt);
      cartL.current.position.x = MathUtils.damp(cartL.current.position.x, mm(spread), 6, dt);
    }
    if (rail.current) {
      rail.current.position.z = MathUtils.damp(
        rail.current.position.z,
        mm(exploded ? -24 : 0),
        6,
        dt,
      );
    }

    // Surge: in on the line terminal, through the varistor and the N–PE spark gap, out to earth.
    const t = surging ? (state.clock.elapsedTime % SURGE_CYCLE) / SURGE_CYCLE : -1;
    const inOn = t >= 0 && t < 0.2;
    const outOn = t >= 0.32 && t < 0.52;
    const coreL = t >= 0 ? pulse(t, 0.25, 0.2) : 0;
    const coreN = t >= 0 ? pulse(t, 0.33, 0.18) : 0;
    const ringT = t >= 0.34 && t < 0.74 ? (t - 0.34) / 0.4 : -1;

    if (inBolt.current) {
      inBolt.current.visible = inOn;
      if (inOn) jag(inBolt.current, BOLT_IN);
    }
    if (outBolt.current) {
      outBolt.current.visible = outOn;
      if (outOn) jag(outBolt.current, BOLT_OUT);
    }
    if (glowL.current) glowL.current.opacity = coreL * 0.45;
    if (glowN.current) glowN.current.opacity = coreN * 0.35;
    if (flash.current) flash.current.intensity = Math.max(coreL, coreN) * 5;
    if (ring.current && ringMat.current) {
      ring.current.visible = ringT >= 0;
      if (ringT >= 0) {
        ring.current.scale.setScalar(mm(3 + ringT * 16));
        ringMat.current.opacity = (1 - ringT) * 0.85;
      }
    }
  });

  const terminalTop = activeHotspot === "terminal-top";
  const terminalBottom = activeHotspot === "terminal-bottom";
  const railActive = activeHotspot === "din-rail";

  return (
    <group
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "";
      }}
    >
      {/* ---------------- Base: terminals, socket, rail latch ---------------- */}
      <group onClick={pick("body", onHotspot)}>
        <RoundedBox
          args={[mm(W), mm(H), mm(Z_SHOULDER - Z_REAR)]}
          radius={mm(1.6)}
          smoothness={4}
          position={[0, 0, mm((Z_REAR + Z_SHOULDER) / 2)]}
          castShadow
          receiveShadow
        >
          <meshPhysicalMaterial
            color={COLOR.body}
            roughness={0.45}
            clearcoat={0.12}
            clearcoatRoughness={0.55}
            {...glow(activeHotspot === "body")}
          />
        </RoundedBox>

        {/* Socket the cartridges plug into, with its contact blades (seen when exploded). */}
        <mesh position={[0, 0, mm(Z_SHOULDER + 0.02)]}>
          <planeGeometry args={[mm(34), mm(NOSE_H - 1)]} />
          <meshStandardMaterial color={COLOR.recess} roughness={0.7} />
        </mesh>
        {POLES.flatMap(({ x }) =>
          [-3, 3].map((dx) => (
            <mesh key={`${x}${dx}`} position={[mm(x + dx), 0, mm(Z_SHOULDER + 4)]}>
              <boxGeometry args={[mm(0.8), mm(7), mm(8)]} />
              <meshStandardMaterial color={COLOR.brass} metalness={0.9} roughness={0.35} />
            </mesh>
          )),
        )}

        <Label
          w={SHOULDER_FACE.w}
          h={SHOULDER_FACE.h}
          draw={topShoulderLabel}
          position={[0, mm(Y_SHOULDER_LABEL), mm(Z_SHOULDER + 0.03)]}
        />
        <Label
          w={SHOULDER_FACE.w}
          h={SHOULDER_FACE.h}
          draw={bottomShoulderLabel}
          position={[0, -mm(Y_SHOULDER_LABEL), mm(Z_SHOULDER + 0.03)]}
        />
        <Label
          w={16}
          h={9.5}
          draw={sideLabel}
          position={[mm(W / 2 + 0.03), mm(-28), mm(-14)]}
          rotation={[0, Math.PI / 2, 0]}
        />

        <group onClick={pick("terminal-top", onHotspot)}>
          {POLES.map(({ x }) => (
            <Screw key={x} x={x} y={Y_TERMINAL} active={terminalTop} />
          ))}
          {POLES.map(({ x }) => (
            <WireEntry key={x} x={x} top geometry={entryGeometry} />
          ))}
        </group>
        <group onClick={pick("terminal-bottom", onHotspot)}>
          {/* One earth terminal, under the neutral pole. */}
          <Screw x={X_N} y={-Y_TERMINAL} active={terminalBottom} />
          <WireEntry x={X_N} top={false} geometry={entryGeometry} />
        </group>

        {/* Blank recess under the L pole (no terminal), and the rivet between the poles. */}
        <mesh
          geometry={recessGeometry}
          position={[mm(X_L), mm(-Y_TERMINAL), mm(Z_SHOULDER + 0.06)]}
        >
          <meshStandardMaterial color={COLOR.recess} roughness={0.8} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, mm(-Y_TERMINAL), mm(Z_SHOULDER + 0.25)]}>
          <cylinderGeometry args={[mm(1.5), mm(1.6), mm(0.5), 24]} />
          <meshStandardMaterial color={COLOR.zinc} metalness={1} roughness={0.35} />
        </mesh>

        {/* Rail latch: pulled down with a flat screwdriver to release the module. */}
        <group onClick={pick("din-rail", onHotspot)}>
          <RoundedBox
            args={[mm(10), mm(6), mm(13)]}
            radius={mm(0.8)}
            smoothness={3}
            position={[0, mm(-H / 2 - 2.3), mm(Z_REAR + 7)]}
          >
            <meshStandardMaterial color={COLOR.body} roughness={0.5} {...glow(railActive)} />
          </RoundedBox>
          <mesh position={[0, mm(-H / 2 - 5.35), mm(Z_REAR + 9)]} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[mm(5), mm(1.4)]} />
            <meshStandardMaterial color={COLOR.hole} roughness={1} />
          </mesh>
        </group>

        <Pin id="body" active={activeHotspot === "body"} onHotspot={onHotspot} />
        <Pin id="terminal-top" active={terminalTop} onHotspot={onHotspot} />
        <Pin id="terminal-bottom" active={terminalBottom} onHotspot={onHotspot} />
      </group>

      {/* ---------------- Plug-in cartridges ---------------- */}
      {POLES.map(({ pole, x }) => (
        <Cartridge
          key={pole}
          pole={pole}
          x={x}
          groupRef={pole === "L" ? cartL : cartN}
          glowRef={pole === "L" ? glowL : glowN}
          capGeometry={capGeometry}
          earGeometry={earGeometry}
          activeHotspot={activeHotspot}
          onHotspot={onHotspot}
        />
      ))}

      {/* ---------------- DIN rail ---------------- */}
      <group ref={rail} onClick={pick("din-rail", onHotspot)}>
        <mesh geometry={railGeometry} castShadow receiveShadow>
          <meshStandardMaterial
            color={COLOR.rail}
            metalness={0.55}
            roughness={0.42}
            {...glow(railActive)}
          />
        </mesh>
        {/* mounting slots in the web, either side of the module */}
        {[-52, -28, 28, 52].map((x) => (
          <mesh key={x} position={[mm(x), 0, mm(Z_REAR - 0.05 - 7.5 + 1.03)]}>
            <planeGeometry args={[mm(12), mm(5.2)]} />
            <meshStandardMaterial color="#2a2c30" roughness={0.9} />
          </mesh>
        ))}
        <Pin id="din-rail" active={railActive} onHotspot={onHotspot} />
      </group>

      {/* ---------------- Surge simulation ---------------- */}
      {/* No `visible` prop here: drei's Line also spreads it onto the material, which would hide it for good.
          The frame loop shows and hides the bolts. */}
      <Line
        ref={inBolt}
        raycast={noRaycast}
        points={BOLT_IN_SEED}
        color={COLOR.bolt}
        lineWidth={4}
        toneMapped={false}
      />
      <Line
        ref={outBolt}
        raycast={noRaycast}
        points={BOLT_OUT_SEED}
        color={COLOR.bolt}
        lineWidth={4}
        toneMapped={false}
      />
      <mesh
        ref={ring}
        raycast={noRaycast}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[mm(X_N), mm(Y_FLOOR) + 0.003, mm(6)]}
        visible={false}
      >
        <ringGeometry args={[0.75, 1, 48]} />
        <meshBasicMaterial
          ref={ringMat}
          color={COLOR.bolt}
          transparent
          opacity={0}
          blending={NormalBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <pointLight
        ref={flash}
        position={[mm(X_L), mm(28), mm(48)]}
        color="#ffd36b"
        intensity={0}
        distance={4}
        decay={2}
      />
    </group>
  );
}

/** Where the floor (contact shadow) sits under the module. */
export const SPD_FLOOR_Y = mm(Y_FLOOR);
