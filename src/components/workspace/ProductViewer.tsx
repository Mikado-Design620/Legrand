import { Canvas, useFrame } from "@react-three/fiber";
import { Html, OrbitControls, Environment, ContactShadows } from "@react-three/drei";
import { Component, Suspense, useEffect, useRef, type ReactNode } from "react";
import { Group, MathUtils } from "three";
import { HOTSPOTS, type HotspotId } from "./spdData";
import { RotateCw, Maximize2, Layers, Zap } from "lucide-react";

type Props = {
  activeHotspot: HotspotId | null;
  onHotspot: (id: HotspotId) => void;
  exploded: boolean;
  autoRotate: boolean;
  surging: boolean;
  onExplode?: () => void;
  onSurge?: () => void;
};

/**
 * The studio lighting map is an HDR file fetched from a public CDN at runtime. If that
 * request fails (offline, or a corporate firewall blocks the CDN) the 3D scene must still
 * render with its plain lights instead of taking the whole page down.
 */
class LightingBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function SPDModel({ activeHotspot, onHotspot, exploded, surging }: Omit<Props, "autoRotate">) {
  const groupRef = useRef<Group>(null);
  const plugRef = useRef<Group>(null);
  const bodyRef = useRef<Group>(null);
  const dinRef = useRef<Group>(null);
  const surgeRef = useRef<Group>(null);

  useFrame((_, dt) => {
    if (plugRef.current) {
      const target = exploded ? 0.9 : 0;
      plugRef.current.position.y = MathUtils.damp(plugRef.current.position.y, 0.7 + target, 6, dt);
    }
    if (bodyRef.current) {
      const target = exploded ? 0.3 : 0;
      bodyRef.current.position.z = MathUtils.damp(bodyRef.current.position.z, target, 6, dt);
    }
    if (dinRef.current) {
      const target = exploded ? -0.6 : 0;
      dinRef.current.position.y = MathUtils.damp(dinRef.current.position.y, -1.65 + target, 6, dt);
    }
    if (surgeRef.current && surging) {
      surgeRef.current.position.y = ((Date.now() / 200) % 4) - 2;
    }
  });

  const accent = (id: HotspotId, base: string) =>
    activeHotspot === id ? "#ED1C24" : base;

  return (
    <group ref={groupRef}>
      {/* Surge bolt animation */}
      {surging && (
        <group ref={surgeRef}>
          <mesh position={[-0.55, 0, 0.5]}>
            <boxGeometry args={[0.05, 0.4, 0.05]} />
            <meshStandardMaterial color="#FFD23F" emissive="#FFD23F" emissiveIntensity={2} />
          </mesh>
        </group>
      )}

      {/* Module body */}
      <group ref={bodyRef}>
        <mesh
          castShadow
          receiveShadow
          onPointerDown={(e) => {
            e.stopPropagation();
            onHotspot("body");
          }}
        >
          <boxGeometry args={[1.1, 2.6, 0.8]} />
          <meshStandardMaterial
            color={accent("body", "#F5F5F2")}
            roughness={0.55}
            metalness={0.05}
          />
        </mesh>

        {/* Front label inset */}
        <mesh position={[0, 0, 0.405]}>
          <planeGeometry args={[0.9, 1.4]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
        </mesh>

        {/* Status indicator window */}
        <mesh
          position={[0.3, 0.35, 0.41]}
          onPointerDown={(e) => {
            e.stopPropagation();
            onHotspot("status");
          }}
        >
          <boxGeometry args={[0.18, 0.18, 0.04]} />
          <meshStandardMaterial
            color={accent("status", "#2BD46B")}
            emissive={accent("status", "#2BD46B")}
            emissiveIntensity={activeHotspot === "status" ? 0.9 : 0.4}
          />
        </mesh>

        {/* Brand stripe */}
        <mesh position={[0, -0.95, 0.41]}>
          <planeGeometry args={[0.9, 0.16]} />
          <meshStandardMaterial color="#ED1C24" emissive="#ED1C24" emissiveIntensity={0.2} />
        </mesh>

        {/* Top terminal cavity */}
        <mesh
          position={[0, 1.45, 0.2]}
          onPointerDown={(e) => {
            e.stopPropagation();
            onHotspot("terminal-top");
          }}
        >
          <boxGeometry args={[0.9, 0.28, 0.4]} />
          <meshStandardMaterial color={accent("terminal-top", "#3a3a3a")} metalness={0.7} roughness={0.3} />
        </mesh>
        {/* Top terminal screws */}
        {[-0.3, 0.3].map((x) => (
          <mesh key={`tt${x}`} position={[x, 1.45, 0.45]}>
            <cylinderGeometry args={[0.08, 0.08, 0.05, 24]} />
            <meshStandardMaterial color="#c0c0c0" metalness={0.9} roughness={0.2} />
          </mesh>
        ))}

        {/* Bottom terminal */}
        <mesh
          position={[0, -1.45, 0.2]}
          onPointerDown={(e) => {
            e.stopPropagation();
            onHotspot("terminal-bottom");
          }}
        >
          <boxGeometry args={[0.9, 0.28, 0.4]} />
          <meshStandardMaterial color={accent("terminal-bottom", "#3a3a3a")} metalness={0.7} roughness={0.3} />
        </mesh>
        {[-0.3, 0.3].map((x) => (
          <mesh key={`bb${x}`} position={[x, -1.45, 0.45]}>
            <cylinderGeometry args={[0.08, 0.08, 0.05, 24]} />
            <meshStandardMaterial color="#c0c0c0" metalness={0.9} roughness={0.2} />
          </mesh>
        ))}
      </group>

      {/* Plug-in cartridge (slides up when exploded) */}
      <group ref={plugRef} position={[0, 0.7, 0]}>
        <mesh
          onPointerDown={(e) => {
            e.stopPropagation();
            onHotspot("plug");
          }}
          castShadow
        >
          <boxGeometry args={[0.95, 0.8, 0.7]} />
          <meshStandardMaterial
            color={accent("plug", "#E8E6E0")}
            roughness={0.5}
          />
        </mesh>
        {/* cartridge tab */}
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[0.3, 0.12, 0.5]} />
          <meshStandardMaterial color="#ED1C24" roughness={0.4} />
        </mesh>
      </group>

      {/* DIN rail */}
      <group ref={dinRef}>
        <mesh position={[0, -1.65, -0.3]} receiveShadow>
          <boxGeometry args={[3.2, 0.35, 0.08]} />
          <meshStandardMaterial color="#9ea2a8" metalness={0.85} roughness={0.35} />
        </mesh>
        <mesh
          position={[0, -1.65, -0.2]}
          onPointerDown={(e) => {
            e.stopPropagation();
            onHotspot("din-rail");
          }}
        >
          <boxGeometry args={[1.05, 0.18, 0.2]} />
          <meshStandardMaterial color={accent("din-rail", "#888c92")} metalness={0.7} roughness={0.4} />
        </mesh>
      </group>

      {/* Hotspot pins */}
      {HOTSPOTS.map((h) => (
        <Html
          key={h.id}
          position={h.position}
          center
          distanceFactor={6}
          zIndexRange={[10, 0]}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onHotspot(h.id);
            }}
            className={`group relative flex items-center justify-center rounded-full transition-all ${
              activeHotspot === h.id
                ? "h-5 w-5 bg-primary shadow-glow"
                : "h-3.5 w-3.5 bg-white border-2 border-primary"
            }`}
            aria-label={h.label}
          >
            <span
              className={`absolute inset-0 rounded-full bg-primary/40 ${
                activeHotspot === h.id ? "animate-ping" : ""
              }`}
            />
            {/* Hover tooltip — preview only, no AI call */}
            <span className="pointer-events-none absolute left-5 top-1/2 z-20 w-56 -translate-y-1/2 rounded-lg border border-border bg-card/95 px-3 py-2 text-left opacity-0 shadow-elegant backdrop-blur transition-opacity duration-150 group-hover:opacity-100">
              <span className="block text-[11px] font-semibold text-foreground">
                {h.label}
              </span>
              <span className="mt-1 block text-[10px] leading-snug text-muted-foreground">
                {h.summary}
              </span>
            </span>
          </button>
        </Html>
      ))}
    </group>
  );
}

export function ProductViewer({
  activeHotspot,
  onHotspot,
  exploded,
  autoRotate,
  surging,
  onExplode,
  onSurge,
}: Props) {
  const controlsRef = useRef<any>(null);


  useEffect(() => {
    if (!controlsRef.current) return;
    if (activeHotspot) {
      controlsRef.current.autoRotate = false;
    } else {
      controlsRef.current.autoRotate = autoRotate;
    }
  }, [activeHotspot, autoRotate]);

  return (
    <div
      data-tour="viewer"
      className="relative h-full w-full overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-white to-secondary shadow-elegant"
    >
      <Canvas
        shadows
        camera={{ position: [3, 1.5, 4.5], fov: 35 }}
        dpr={[1, 2]}
        className="!h-full !w-full"
      >
        <color attach="background" args={["#fafaf7"]} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 8, 5]} intensity={1.1} castShadow />
        <directionalLight position={[-4, 3, -2]} intensity={0.35} color="#ffd8d8" />
        <Suspense fallback={null}>
          <SPDModel
            activeHotspot={activeHotspot}
            onHotspot={onHotspot}
            exploded={exploded}
            surging={surging}
          />
          <ContactShadows
            position={[0, -1.95, 0]}
            opacity={0.35}
            scale={8}
            blur={2.4}
            far={3}
          />
        </Suspense>
        {/* Own Suspense + boundary: the model shows at once; lighting joins when (and if) it loads. */}
        <LightingBoundary>
          <Suspense fallback={null}>
            <Environment preset="studio" />
          </Suspense>
        </LightingBoundary>
        <OrbitControls
          ref={controlsRef}
          autoRotate={autoRotate}
          autoRotateSpeed={1.2}
          enablePan={true}
          minDistance={3}
          maxDistance={9}
          target={[0, 0, 0]}
        />
      </Canvas>

      {/* Top-left chrome */}
      <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-2">
        <div className="glass rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-foreground/70">
          Legrand · SPD Digital Twin
        </div>
        {surging && (
          <div className="rounded-full bg-warning/15 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-warning">
            ⚡ Surge simulation
          </div>
        )}
      </div>

      {/* Right-side toolbar */}
      <div className="absolute right-4 top-4 flex flex-col gap-2">
        <ViewerBtn
          active={autoRotate}
          onClick={() => controlsRef.current && (controlsRef.current.autoRotate = !controlsRef.current.autoRotate)}
          label="Rotate"
        >
          <RotateCw className="h-4 w-4" />
        </ViewerBtn>
        <ViewerBtn onClick={() => controlsRef.current?.reset()} label="Recenter">
          <Maximize2 className="h-4 w-4" />
        </ViewerBtn>
      </div>

      {/* Bottom action bar — Explode + Surge sim */}
      <div className="absolute inset-x-0 bottom-4 flex flex-col items-center gap-2 px-4">
        <div data-tour="viewer-actions" className="flex items-center gap-2">
          <button
            onClick={onExplode}
            className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium backdrop-blur transition-all ${
              exploded
                ? "border-primary bg-primary/15 text-primary"
                : "border-border bg-card/80 text-foreground/80 hover:border-primary hover:text-primary"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            {exploded ? "Assemble" : "Explode"}
          </button>
          <button
            onClick={onSurge}
            className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium backdrop-blur transition-all ${
              surging
                ? "border-warning bg-warning/15 text-warning"
                : "border-border bg-card/80 text-foreground/80 hover:border-primary hover:text-primary"
            }`}
          >
            <Zap className="h-3.5 w-3.5" />
            {surging ? "Stop surge" : "Surge sim"}
          </button>
        </div>
        <div className="glass pointer-events-none rounded-full px-3 py-1 text-[10.5px] text-muted-foreground">
          Drag to rotate · Scroll to zoom · Click a red pin to inspect
        </div>
      </div>
    </div>
  );
}

function ViewerBtn({
  children,
  onClick,
  label,
  active,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  label: string;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`glass flex h-9 w-9 items-center justify-center rounded-xl transition-all hover:border-primary hover:text-primary disabled:opacity-40 ${
        active ? "border-primary text-primary" : "text-foreground/70"
      }`}
    >
      {children}
    </button>
  );
}
