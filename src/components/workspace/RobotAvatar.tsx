import { useEffect, useRef, type RefObject } from "react";
import { VISEME_SHAPE } from "@/lib/lipsync";
import type { LipSyncFrame } from "@/hooks/useLipSync";

export type AvatarState = "idle" | "listening" | "thinking" | "speaking";

/**
 * Geometry of `public/avatar/robot-hero.webp`. The render ships with its eyes
 * and mouth painted out; they are drawn here as SVG so they can blink and speak.
 * The <img> and the <svg> share a box and the same fit rule (object-contain ==
 * preserveAspectRatio "xMidYMid meet"), so these coordinates stay aligned at
 * every size.
 */
const IMG_W = 928;
const IMG_H = 1198;
const EYE_L = { x: 402, y: 160 };
const EYE_R = { x: 519, y: 146 };
const MOUTH = { x: 469.5, y: 246 };
/** The head is tilted in the render; the mouth has to lie on the same axis. */
const HEAD_TILT = -6.82;
const MOUTH_RX = 26;
const MOUTH_RY = 30;
const EYE_RING_R = 20.5;

type Rgb = [number, number, number];

const EYE_COLOR: Record<AvatarState, Rgb> = {
  idle: [69, 200, 255],
  listening: [52, 211, 153],
  thinking: [246, 183, 60],
  speaking: [96, 214, 255],
};

const HALO_OPACITY: Record<AvatarState, number> = {
  idle: 0.5,
  listening: 0.85,
  thinking: 0.35,
  speaking: 0.7,
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function lerpRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

const rgb = (c: Rgb) => `rgb(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])})`;

type Props = {
  state: AvatarState;
  frame: RefObject<LipSyncFrame>;
};

export function RobotAvatar({ state, frame }: Props) {
  const stateRef = useRef<AvatarState>(state);
  stateRef.current = state;

  const figureRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);
  const mouthRef = useRef<SVGGElement>(null);
  const eyeLRef = useRef<SVGGElement>(null);
  const eyeRRef = useRef<SVGGElement>(null);
  const haloRefs = useRef<(SVGCircleElement | null)[]>([]);
  const ringRefs = useRef<(SVGCircleElement | null)[]>([]);
  const tickRefs = useRef<(SVGCircleElement | null)[]>([]);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Smoothed values, so a viseme change eases in over a few frames.
    let mouthX = VISEME_SHAPE.rest.rx;
    let mouthY = VISEME_SHAPE.rest.ry;
    let eyeColor: Rgb = EYE_COLOR.idle;
    let halo = HALO_OPACITY.idle;
    let blink = 1;

    let nextBlinkAt = performance.now() + 1500;
    let blinkStart = 0;
    let blinksLeft = 0;
    let last = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      const current = stateRef.current;

      // --- mouth ----------------------------------------------------------
      const target = VISEME_SHAPE[frame.current?.viseme ?? "rest"];
      const ease = 1 - Math.exp(-dt / 38);
      mouthX = lerp(mouthX, target.rx, ease);
      mouthY = lerp(mouthY, target.ry, ease);
      mouthRef.current?.setAttribute(
        "transform",
        `translate(${MOUTH.x} ${MOUTH.y}) rotate(${HEAD_TILT}) scale(${mouthX.toFixed(4)} ${mouthY.toFixed(4)})`,
      );

      // --- blink ----------------------------------------------------------
      if (blinksLeft === 0 && now >= nextBlinkAt) {
        blinksLeft = Math.random() < 0.25 ? 2 : 1; // the occasional double blink
        blinkStart = now;
      }
      if (blinksLeft > 0) {
        const BLINK_MS = 130;
        const p = (now - blinkStart) / BLINK_MS;
        if (p >= 1) {
          blinksLeft -= 1;
          blink = 1;
          if (blinksLeft > 0) blinkStart = now;
          else nextBlinkAt = now + 2600 + Math.random() * 4200;
        } else {
          // 0 -> shut -> open
          blink = Math.abs(Math.cos(p * Math.PI)) * 0.94 + 0.06;
        }
      }
      const eyeTransform = (eye: { x: number; y: number }) =>
        `translate(${eye.x} ${eye.y}) scale(1 ${blink.toFixed(4)})`;
      eyeLRef.current?.setAttribute("transform", eyeTransform(EYE_L));
      eyeRRef.current?.setAttribute("transform", eyeTransform(EYE_R));

      // --- eye colour + glow ----------------------------------------------
      const colorEase = 1 - Math.exp(-dt / 160);
      eyeColor = lerpRgb(eyeColor, EYE_COLOR[current], colorEase);
      const level = frame.current?.level ?? 0;
      const haloTarget =
        HALO_OPACITY[current] +
        (current === "speaking" ? level * 0.3 : 0) +
        (current === "thinking" ? Math.sin(now / 420) * 0.12 : 0);
      halo = lerp(halo, haloTarget, colorEase);

      const stroke = rgb(eyeColor);
      for (const ring of ringRefs.current) ring?.setAttribute("stroke", stroke);
      for (const t of tickRefs.current) t?.setAttribute("stroke", stroke);
      for (const h of haloRefs.current) h?.setAttribute("opacity", halo.toFixed(3));

      // Spin the ring segments while retrieving — the eyes become a spinner.
      if (current === "thinking") {
        const offset = ((now / 26) % 100).toFixed(2);
        for (const t of tickRefs.current) t?.setAttribute("stroke-dashoffset", offset);
      }

      // --- body -----------------------------------------------------------
      if (!reduceMotion && figureRef.current) {
        const breathe = Math.sin(now / 1400) * 5;
        const sway = Math.sin(now / 2600) * 0.7;
        const nod = current === "speaking" ? Math.sin(now / 180) * 1.4 * level : 0;
        const lean = current === "listening" ? 1.4 : 0;
        const bob = breathe + nod;
        figureRef.current.style.transform = `translateY(${bob.toFixed(2)}px) rotate(${(sway + lean).toFixed(3)}deg)`;
        if (shadowRef.current) {
          const squash = 1 - bob / 90;
          shadowRef.current.style.transform = `translateX(-50%) scaleX(${squash.toFixed(3)})`;
          shadowRef.current.style.opacity = (0.42 - bob / 120).toFixed(3);
        }
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [frame]);

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Stage: deep navy, keyed to the character's cape, with a Legrand-red key light */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(120% 90% at 50% 12%, #1b2a57 0%, #0d132a 45%, #05070f 100%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(circle at 50% 58%, rgba(237, 28, 36, 0.30), transparent 62%)",
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-2/5"
        style={{
          background: "linear-gradient(to top, rgba(237, 28, 36, 0.16), transparent 80%)",
        }}
      />

      <div className="absolute inset-0 flex items-end justify-center px-4 pb-5">
        <div className="relative h-full w-full">
          <div
            ref={shadowRef}
            className="absolute bottom-[3%] left-1/2 h-4 w-[38%] rounded-[100%] bg-black/45 blur-md"
          />
          <div
            ref={figureRef}
            className="absolute inset-0 will-change-transform"
            style={{ transformOrigin: "50% 92%" }}
          >
            <img
              src="/avatar/robot-hero.webp"
              alt="Legrand AI trainer, a red superhero robot"
              className="absolute inset-0 h-full w-full object-contain"
              draggable={false}
            />
            <svg
              viewBox={`0 0 ${IMG_W} ${IMG_H}`}
              preserveAspectRatio="xMidYMid meet"
              className="pointer-events-none absolute inset-0 h-full w-full"
              aria-hidden="true"
            >
              <defs>
                <radialGradient id="robot-eye-halo">
                  <stop offset="0%" stopColor="#bdf0ff" stopOpacity="0.75" />
                  <stop offset="42%" stopColor="#3fb6ff" stopOpacity="0.34" />
                  <stop offset="100%" stopColor="#3fb6ff" stopOpacity="0" />
                </radialGradient>
                <filter id="robot-eye-bloom" x="-150%" y="-150%" width="400%" height="400%">
                  <feGaussianBlur stdDeviation="5" />
                </filter>
                <filter id="robot-mouth-rim" x="-60%" y="-60%" width="220%" height="220%">
                  <feGaussianBlur stdDeviation="2.4" />
                </filter>
                <radialGradient id="robot-mouth-fill" cx="50%" cy="34%" r="78%">
                  <stop offset="0%" stopColor="#1a0509" />
                  <stop offset="100%" stopColor="#02030a" />
                </radialGradient>
              </defs>

              {[EYE_L, EYE_R].map((eye, i) => (
                <g key={i} ref={i === 0 ? eyeLRef : eyeRRef}>
                  <circle
                    ref={(el) => void (haloRefs.current[i] = el)}
                    r="46"
                    fill="url(#robot-eye-halo)"
                  />
                  <circle
                    r={EYE_RING_R}
                    fill="none"
                    stroke="#45c8ff"
                    strokeWidth="15"
                    opacity="0.5"
                    filter="url(#robot-eye-bloom)"
                    ref={(el) => void (ringRefs.current[i] = el)}
                  />
                  <circle r={EYE_RING_R} fill="none" stroke="#e8fbff" strokeWidth="11" />
                  <circle
                    ref={(el) => void (tickRefs.current[i] = el)}
                    r={EYE_RING_R}
                    fill="none"
                    stroke="#45c8ff"
                    strokeWidth="13"
                    strokeDasharray="2.6 5.4"
                    opacity="0.9"
                  />
                  <circle r="13.6" fill="#05203c" />
                </g>
              ))}

              <g ref={mouthRef}>
                <ellipse
                  rx={MOUTH_RX + 3}
                  ry={MOUTH_RY + 3}
                  fill="none"
                  stroke="#8d0c14"
                  strokeWidth="4"
                  opacity="0.55"
                  filter="url(#robot-mouth-rim)"
                />
                <ellipse rx={MOUTH_RX} ry={MOUTH_RY} fill="url(#robot-mouth-fill)" />
              </g>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
