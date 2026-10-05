import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows, Lightformer } from "@react-three/drei";
import { Suspense, useEffect, useRef, type RefObject } from "react";
import { MathUtils, Vector3 } from "three";
import { type HotspotId } from "./spdData";
import { SPDModel, SPD_FLOOR_Y } from "./SPDModel";
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

const CAMERA_FOV = 35;
const MAX_DISTANCE = 12;
const VIEW_DIR = new Vector3(3, 1.5, 4.5).normalize();
/** A little in front of the module, so pulled-out cartridges stay in frame too. */
const VIEW_TARGET = new Vector3(0, -0.05, 0.2);

/**
 * Pull the camera back until the whole module fits this panel. The viewer runs
 * from a narrow column on laptops to a wide one on big screens, and a fixed
 * distance cropped the module in the narrow case. Recenter returns here.
 *
 * The camera is placed once; a later resize only moves the Recenter pose, so it
 * never throws away the view the user has orbited to.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function FrameModel({ controlsRef }: { controlsRef: RefObject<any> }) {
  const camera = useThree((s) => s.camera);
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);
  const placed = useRef(false);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!width || !height || !controls) return;
    const tanHalf = Math.tan(MathUtils.degToRad(CAMERA_FOV / 2));
    const fitHeight = 1.8 / tanHalf;
    // wide enough for the cartridges once they are pulled out (Explode)
    const fitWidth = 1.65 / (tanHalf * (width / height));
    const distance = Math.max(fitHeight, fitWidth);
    const home = VIEW_DIR.clone().multiplyScalar(distance).add(VIEW_TARGET);

    // A tall, narrow panel needs more than the default zoom-out limit to fit.
    controls.maxDistance = Math.max(MAX_DISTANCE, distance * 1.3);

    if (placed.current) {
      controls.position0.copy(home);
      controls.target0.copy(VIEW_TARGET);
      return;
    }
    camera.position.copy(home);
    camera.lookAt(VIEW_TARGET);
    controls.target.copy(VIEW_TARGET);
    controls.update();
    controls.saveState();
    placed.current = true;
  }, [camera, width, height, controlsRef]);

  return null;
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
        camera={{ position: [3, 1.5, 4.5], fov: CAMERA_FOV }}
        dpr={[1, 2]}
        className="!h-full !w-full"
      >
        <color attach="background" args={["#fafaf7"]} />
        <ambientLight intensity={0.45} />
        <directionalLight position={[5, 8, 5]} intensity={1.2} castShadow />
        <directionalLight position={[-4, 3, -2]} intensity={0.35} color="#ffd8d8" />
        {/* rim light so the grey housing separates from the pale background */}
        <directionalLight position={[0, 4, -6]} intensity={0.5} />
        <Suspense fallback={null}>
          <SPDModel
            activeHotspot={activeHotspot}
            onHotspot={onHotspot}
            exploded={exploded}
            surging={surging}
          />
          <ContactShadows
            position={[0, SPD_FLOOR_Y, 0]}
            opacity={0.4}
            scale={8}
            blur={2.2}
            far={3}
          />
        </Suspense>
        {/* Studio softboxes rendered into the environment map on the spot. The old preset fetched
            an HDR from a public CDN, so the module came out flat and dark until it arrived —
            or for good, offline or behind a corporate firewall. */}
        <Environment resolution={256}>
          <Lightformer intensity={4.5} position={[0, 4, 4]} scale={[8, 3, 1]} target={[0, 0, 0]} />
          <Lightformer intensity={2} position={[0, 6, 0]} scale={[8, 8, 1]} target={[0, 0, 0]} />
          <Lightformer
            intensity={2.5}
            position={[-5, 1.5, 2]}
            scale={[6, 2, 1]}
            target={[0, 0, 0]}
          />
          <Lightformer
            intensity={2.5}
            position={[5, 1.5, 2]}
            scale={[6, 2, 1]}
            target={[0, 0, 0]}
          />
          <Lightformer
            intensity={1.6}
            position={[0, 2, -6]}
            scale={[10, 4, 1]}
            target={[0, 0, 0]}
          />
          <Lightformer
            form="ring"
            intensity={1.6}
            position={[0, -4, 2]}
            scale={3}
            target={[0, 0, 0]}
          />
        </Environment>
        <OrbitControls
          ref={controlsRef}
          autoRotate={autoRotate}
          autoRotateSpeed={1.2}
          enablePan={true}
          minDistance={1.8}
          maxDistance={MAX_DISTANCE}
          target={VIEW_TARGET}
        />
        <FrameModel controlsRef={controlsRef} />
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
