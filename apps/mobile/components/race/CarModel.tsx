/**
 * Low-poly die-cast, assembled per `CarLook` from a few extruded side profiles, tapered
 * prisms and boxes. Nose toward −z, wheels resting on y = −0.35 (the caller lifts the
 * group onto the road). Started from velocity-rush's box racer (MIT) and grew from there.
 */
import type { ReactNode } from "react";
import * as THREE from "three";
import type { CarLook, CarTail } from "../../lib/race/carLooks";

const GLASS = "#101c2c";
const CHROME = "#cfd6de";
const TYRE = "#14141c";
const DARK = "#15181c";
const REDLINE = "#d92b2b";

type Vec3 = [number, number, number];
/** A point of the side view: [z, y]. */
type Pt = [number, number];
/** Wheel arch cut out of a profile: [z, y, radius]. */
type Arch = [number, number, number];
/** One end of a tapered prism: [front z, rear z, width]. */
type Rect = [number, number, number];

// ---------------------------------------------------------------------------------------
// Geometry. Everything is built once and shared by every car that asks for the same key.
// ---------------------------------------------------------------------------------------

const cache = new Map<string, THREE.BufferGeometry>();

function cached(key: string, build: () => THREE.BufferGeometry) {
  let geo = cache.get(key);
  if (!geo) {
    geo = build();
    cache.set(key, geo);
  }
  return geo;
}

/** Side-view polygon extruded across the car, centred on x. */
function slab(points: Pt[], width: number) {
  const shape = new THREE.Shape(points.map(([z, y]) => new THREE.Vector2(-z, y)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: false });
  geo.rotateY(Math.PI / 2);
  geo.translate(-width / 2, 0, 0);
  return geo;
}

/** Closes a nose-to-tail top line along the underside, notching out the wheel arches. */
function outline(top: Pt[], arches: Arch[] = [], floor = 0.1): Pt[] {
  const pts = [...top];
  for (const [zc, yc, r] of [...arches].sort((a, b) => b[0] - a[0])) {
    const a0 = Math.asin(Math.min(1, (floor - yc) / r));
    for (let i = 0; i <= 6; i++) {
      const a = a0 + ((Math.PI - 2 * a0) * i) / 6;
      pts.push([zc + r * Math.cos(a), yc + r * Math.sin(a)]);
    }
  }
  return pts;
}

/** The body below `limit`, a hair proud of it: lower two-tone paint. */
function lower(top: Pt[], arches: Arch[], limit: number, width: number) {
  const tight = arches.map(([z, y, r]): Arch => [z, y, r - 0.012]);
  const geo = slab(
    outline(top, tight, 0.088).map(([z, y]): Pt => [z, Math.min(y, limit)]),
    width,
  );
  geo.scale(1, 1, 1.004);
  return geo;
}

function heightAt(top: Pt[], z: number) {
  for (let i = 0; i < top.length - 1; i++) {
    const [z0, y0] = top[i];
    const [z1, y1] = top[i + 1];
    if (z1 > z0 && z >= z0 && z <= z1) return y0 + ((y1 - y0) * (z - z0)) / (z1 - z0);
  }
  return top[0][1];
}

/** A strip of the top line between z0 and z1, raised a hair: stripes and hood paint. */
function skin(top: Pt[], z0: number, z1: number, width: number, lift: number) {
  const pts: Pt[] = [
    [z0, heightAt(top, z0) + lift],
    ...top.filter(([z]) => z > z0 && z < z1).map(([z, y]): Pt => [z, y + lift]),
    [z1, heightAt(top, z1) + lift],
  ];
  const base = Math.min(...pts.map(([, y]) => y)) - 0.1;
  return slab([...pts, [z1, base], [z0, base]], width);
}

/** Six-sided prism between two rectangles: sloped glass, tumblehome and V shapes in one mesh. */
function taper(y0: number, y1: number, base: Rect, top: Rect) {
  const [bz0, bz1, bw] = base;
  const [tz0, tz1, tw] = top;
  const b = [
    [-bw / 2, y0, bz0],
    [bw / 2, y0, bz0],
    [bw / 2, y0, bz1],
    [-bw / 2, y0, bz1],
  ];
  const t = [
    [-tw / 2, y1, tz0],
    [tw / 2, y1, tz0],
    [tw / 2, y1, tz1],
    [-tw / 2, y1, tz1],
  ];
  // Quads wound counter-clockwise seen from outside.
  const quads = [
    [t[0], t[3], t[2], t[1]],
    [b[0], b[1], b[2], b[3]],
    [b[1], b[0], t[0], t[1]],
    [b[3], b[2], t[2], t[3]],
    [b[1], t[1], t[2], b[2]],
    [b[0], b[3], t[3], t[0]],
  ];
  const positions: number[] = [];
  for (const [p, q, r, s] of quads) positions.push(...p, ...q, ...r, ...p, ...r, ...s);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return geo;
}

/** Flame graphic as one side-view polygon: slanted leading edge, three licks trailing back. */
const FLAME: Pt[] = [
  [0.08, 0],
  [0, 0.5],
  [0.06, 1],
  [0.34, 0.98],
  [1, 0.8],
  [0.44, 0.72],
  [0.3, 0.62],
  [0.8, 0.5],
  [0.38, 0.43],
  [0.25, 0.33],
  [0.62, 0.16],
  [0.22, 0.12],
  [0.14, 0],
];

function flames(z0: number, length: number, y0: number, height: number, width: number) {
  return slab(
    FLAME.map(([u, v]): Pt => [z0 + u * length, y0 + v * height]),
    width,
  );
}

// ---------------------------------------------------------------------------------------
// Parts
// ---------------------------------------------------------------------------------------

function Paint({ color, shiny = true }: { color: string; shiny?: boolean }) {
  return shiny ? <meshPhongMaterial color={color} shininess={80} /> : <meshLambertMaterial color={color} />;
}

function Panel({ size, at, color, shiny = true }: { size: Vec3; at: Vec3; color: string; shiny?: boolean }) {
  return (
    <mesh position={at}>
      <boxGeometry args={size} />
      <Paint color={color} shiny={shiny} />
    </mesh>
  );
}

function Solid({ geo, color, shiny = true }: { geo: THREE.BufferGeometry; color: string; shiny?: boolean }) {
  return (
    <mesh geometry={geo}>
      <Paint color={color} shiny={shiny} />
    </mesh>
  );
}

/** Thin plate lying on the profile edge a→b: windshields on bodies that have no separate cabin. */
function Facing({ a, b, width, color, scale = 1, thick = 0.04 }: { a: Pt; b: Pt; width: number; color: string; scale?: number; thick?: number }) {
  const dz = b[0] - a[0];
  const dy = b[1] - a[1];
  return (
    <mesh position={[0, (a[1] + b[1]) / 2, (a[0] + b[0]) / 2]} rotation={[Math.atan2(dz, dy), 0, 0]}>
      <boxGeometry args={[width, Math.hypot(dz, dy) * scale, thick]} />
      <Paint color={color} />
    </mesh>
  );
}

type WheelSpec = { at: Vec3; radius: number; width: number };

function Wheel({ at, radius, width, rim, redline }: WheelSpec & { rim: string; redline?: boolean }) {
  return (
    <group position={at}>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[radius, radius, width, 14]} />
        <meshLambertMaterial color={TYRE} />
      </mesh>
      {redline ? (
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[radius * 0.72, radius * 0.72, width + 0.02, 14]} />
          <meshBasicMaterial color={REDLINE} />
        </mesh>
      ) : null}
      {/* Faceted so the spin catches the light. */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[radius * 0.58, radius * 0.58, width + 0.05, 7]} />
        <meshPhongMaterial color={rim} shininess={90} flatShading />
      </mesh>
    </group>
  );
}

/** Four wheels: `r`/`z` are [front, rear]. Centres sit at radius − 0.35 so the tyres touch the road. */
function wheelsAt(r: [number, number], z: [number, number], track: number, width: [number, number] = [0.28, 0.28]): WheelSpec[] {
  return [0, 1].flatMap((axle) =>
    [-track, track].map((x) => ({ at: [x, r[axle] - 0.35, z[axle]] as Vec3, radius: r[axle], width: width[axle] })),
  );
}

/** Arches matching `wheelsAt`, with `gap` of clearance around the tyre. */
function archesFor(r: [number, number], z: [number, number], gap = 0.09): Arch[] {
  return [0, 1].map((axle): Arch => [z[axle], r[axle] - 0.35, r[axle] + gap]);
}

function Lights({ front, rear, spread, round }: { front: Pt; rear: Pt; spread: number; round?: boolean }) {
  return (
    <>
      {[-spread, spread].map((x) => (
        <mesh key={`h${x}`} position={[x, front[1], front[0]]} rotation={[round ? Math.PI / 2 : 0, 0, 0]}>
          {round ? <cylinderGeometry args={[0.13, 0.13, 0.08, 10]} /> : <boxGeometry args={[0.34, 0.13, 0.08]} />}
          <meshBasicMaterial color="#fff3c4" />
        </mesh>
      ))}
      {[-spread, spread].map((x) => (
        <mesh key={`t${x}`} position={[x, rear[1], rear[0]]}>
          <boxGeometry args={[0.4, 0.12, 0.08]} />
          <meshBasicMaterial color="#ff2a2a" />
        </mesh>
      ))}
    </>
  );
}

/** Supercharger: chrome block with a scoop, sticking out of the hood. */
function Blower({ at, scale = 1 }: { at: Vec3; scale?: number }) {
  return (
    <group position={at} scale={scale}>
      <Panel size={[0.5, 0.34, 0.7]} at={[0, 0.17, 0]} color={CHROME} />
      <Panel size={[0.56, 0.16, 0.5]} at={[0, 0.42, -0.06]} color={CHROME} />
      <Panel size={[0.48, 0.1, 0.06]} at={[0, 0.42, -0.32]} color="#8f1420" shiny={false} />
    </group>
  );
}

function Wing({ y, z, color, span = 1.7 }: { y: number; z: number; color: string; span?: number }) {
  return (
    <>
      {[-0.6, 0.6].map((x) => (
        <Panel key={x} size={[0.08, 0.3, 0.12]} at={[x, y - 0.17, z]} color={DARK} shiny={false} />
      ))}
      <Panel size={[span, 0.06, 0.42]} at={[0, y, z]} color={color} />
    </>
  );
}

type CabinSpec = {
  y0: number;
  y1: number;
  base: Rect;
  top: Rect;
  /** z of a painted B-pillar. */
  pillar?: number;
  /** Paint the sides from this z back (sail panel / cab back), leaving the rear glass. */
  solid?: number;
};

/** Greenhouse: tapered glass under a painted roof, so the screens slope and the sides lean in. */
function Cabin({ id, spec, roof, stripes }: { id: string; spec: CabinSpec; roof: string; stripes?: string }) {
  const { y0, y1, base, top, pillar, solid } = spec;
  const roofZ = (top[0] + top[1]) / 2;
  const roofLen = top[1] - top[0] + 0.08;
  return (
    <>
      <Solid geo={cached(`${id}:glass`, () => taper(y0, y1, base, top))} color={GLASS} />
      <Panel size={[top[2] + 0.05, 0.07, roofLen]} at={[0, y1 + 0.015, roofZ]} color={roof} />
      {pillar !== undefined ? (
        <Solid
          geo={cached(`${id}:pillar`, () => taper(y0, y1, [pillar - 0.06, pillar + 0.06, base[2] + 0.03], [pillar - 0.06, pillar + 0.06, top[2] + 0.03]))}
          color={roof}
        />
      ) : null}
      {solid !== undefined ? (
        <Solid
          geo={cached(`${id}:solid`, () => taper(y0, y1, [solid, base[1] - 0.07, base[2] + 0.03], [solid, top[1] - 0.07, top[2] + 0.03]))}
          color={roof}
        />
      ) : null}
      {stripes ? (
        <>
          <Panel size={[0.56, 0.02, roofLen + 0.01]} at={[0, y1 + 0.05, roofZ]} color={stripes} shiny={false} />
          <Panel size={[0.1, 0.024, roofLen + 0.012]} at={[0, y1 + 0.05, roofZ]} color={roof} />
        </>
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------------------------------
// Body styles. Top lines run nose to tail; the cabin sits a little into the body.
// ---------------------------------------------------------------------------------------

type Shell = {
  width: number;
  top: Pt[];
  r: [number, number];
  z: [number, number];
  track: number;
  tyre?: [number, number];
  archGap?: number;
  /** Dark floor pan that closes the arch tunnels: [height, length, z]. */
  pan: Vec3;
  cabin: CabinSpec;
};

const COUPE_TOP: Pt[] = [
  [-2, 0.2],
  [-2, 0.42],
  [-1.86, 0.52],
  [-0.7, 0.64],
  [1.5, 0.68],
  [1.96, 0.62],
  [2, 0.5],
  [2, 0.22],
];

const MUSCLE_TOP: Pt[] = [
  [-2, 0.22],
  [-2, 0.52],
  [-1.9, 0.6],
  [-0.5, 0.65],
  [0.9, 0.65],
  [1.45, 0.71],
  [2, 0.66],
  [2, 0.26],
];

const COUPE_CABINS: Record<CarTail, CabinSpec> = {
  notch: { y0: 0.6, y1: 1, base: [-0.85, 1.3, 1.6], top: [-0.15, 0.9, 1.26], pillar: 0.3, solid: 0.7 },
  fastback: { y0: 0.6, y1: 1, base: [-0.85, 1.75, 1.6], top: [-0.15, 0.6, 1.26], solid: 0.4 },
  hatch: { y0: 0.6, y1: 1, base: [-0.85, 1.7, 1.6], top: [-0.2, 1.05, 1.28], pillar: 0.25, solid: 0.85 },
};

const MUSCLE_CABINS: Record<CarTail, CabinSpec> = {
  notch: { y0: 0.6, y1: 1.02, base: [-0.45, 1.35, 1.56], top: [0.1, 0.95, 1.22], pillar: 0.5, solid: 0.72 },
  fastback: { y0: 0.6, y1: 1.02, base: [-0.45, 1.8, 1.56], top: [0.1, 0.8, 1.22], solid: 0.55 },
  hatch: { y0: 0.6, y1: 1.02, base: [-0.45, 1.7, 1.56], top: [0.1, 1.1, 1.22], pillar: 0.5, solid: 0.9 },
};

// Countach: one line from the nose through the windshield, tall tail, small front wheels.
const WEDGE: Shell = {
  width: 1.94,
  top: [
    [-2, 0.14],
    [-2, 0.27],
    [-0.6, 0.54],
    [0.55, 0.6],
    [1.1, 0.72],
    [2, 0.7],
    [2, 0.3],
  ],
  r: [0.3, 0.36],
  z: [-1.3, 1.3],
  track: 0.88,
  archGap: 0.07,
  pan: [0.22, 3.1, 0.25],
  cabin: { y0: 0.5, y1: 0.9, base: [-0.75, 1.15, 1.62], top: [-0.05, 0.5, 1], solid: 0.25 },
};

// Twin Mill: low nose full of engine, bubble cockpit between fat rear tyres.
const TWIN: Shell = {
  width: 1.9,
  top: [
    [-2, 0.14],
    [-2, 0.3],
    [-1.5, 0.46],
    [0.2, 0.5],
    [1.2, 0.76],
    [2, 0.7],
    [2, 0.3],
  ],
  r: [0.32, 0.46],
  z: [-1.35, 1.3],
  track: 0.88,
  tyre: [0.24, 0.36],
  archGap: 0.08,
  pan: [0.24, 3.2, 0.2],
  cabin: { y0: 0.48, y1: 0.9, base: [0, 1.6, 1.1], top: [0.55, 1.15, 0.74] },
};

const PICKUP: Shell = {
  width: 1.9,
  top: [
    [-2, 0.22],
    [-2, 0.52],
    [-1.9, 0.6],
    [-0.75, 0.64],
    [0.5, 0.64],
    [0.5, 0.54],
    [1.9, 0.54],
    [1.9, 0.74],
    [2, 0.74],
    [2, 0.24],
  ],
  r: [0.36, 0.36],
  z: [-1.3, 1.3],
  track: 0.86,
  archGap: 0.08,
  pan: [0.32, 3.7, 0],
  cabin: { y0: 0.6, y1: 1.04, base: [-0.8, 0.45, 1.62], top: [-0.4, 0.38, 1.36], solid: 0.1 },
};

// Deora II: cab pushed right over the front axle, flat deck behind it.
const DEORA: Shell = {
  width: 1.9,
  top: [
    [-2, 0.2],
    [-2, 0.44],
    [-1.8, 0.6],
    [-0.4, 0.7],
    [0.3, 0.7],
    [0.55, 0.62],
    [1.9, 0.62],
    [2, 0.52],
    [2, 0.24],
  ],
  r: [0.36, 0.36],
  z: [-1.3, 1.3],
  track: 0.86,
  pan: [0.32, 3.7, 0],
  cabin: { y0: 0.6, y1: 1, base: [-1.75, 0.35, 1.64], top: [-0.85, -0.05, 1.2], solid: -0.4 },
};

const VAN_TOP: Pt[] = [
  [-2, 0.2],
  [-2, 0.78],
  [-1.7, 0.84],
  [-1.2, 1.46],
  [1.9, 1.5],
  [2, 1.4],
  [2, 0.2],
];

// VW T1: flat rounded face, wheels tucked under the cab.
const BUS_TOP: Pt[] = [
  [-1.96, 0.2],
  [-2, 0.5],
  [-1.98, 0.88],
  [-1.8, 1.42],
  [-1.5, 1.56],
  [1.7, 1.56],
  [1.95, 1.42],
  [2, 1],
  [2, 0.2],
];

const HOTROD_TUB: Pt[] = [
  [0, 0.24],
  [-0.05, 0.8],
  [0.3, 0.88],
  [1.5, 0.88],
  [1.85, 0.7],
  [1.9, 0.3],
];

const HOTROD_CAB: CabinSpec = { y0: 0.84, y1: 1.12, base: [0.25, 1.5, 1.26], top: [0.38, 1.45, 1.14], solid: 0.95 };

type Props = {
  look: CarLook;
  /** The wheels' parent, so the race loop can spin them. */
  wheels?: React.RefObject<THREE.Group | null>;
};

export function CarModel({ look, wheels }: Props) {
  const { paint, body } = look;
  const rim = look.rims ?? CHROME;
  const lifted = Boolean(look.lifted);
  // Body panels sit in a lifted group; wheels stay on the ground.
  let panels: ReactNode;
  let wheelSet: WheelSpec[];

  /** Painted shell, floor pan and greenhouse shared by every low-slung body. */
  const shell = (id: string, s: Shell, roofStripes?: string) => {
    const arches = archesFor(s.r, s.z, s.archGap);
    return (
      <>
        <Solid geo={cached(`${id}:body`, () => slab(outline(s.top, arches), s.width))} color={paint} />
        <Panel size={[s.track * 2 - 0.3, s.pan[0], s.pan[1]]} at={[0, 0.07 + s.pan[0] / 2, s.pan[2]]} color={DARK} shiny={false} />
        <Cabin id={id} spec={s.cabin} roof={paint} stripes={roofStripes} />
      </>
    );
  };

  const flash = (id: string, z0: number, length: number, y0: number, height: number, width: number) =>
    look.sideFlash ? (
      <Solid geo={cached(`${id}:flames`, () => flames(z0, length, y0, height, width + 0.04))} color={look.sideFlash} shiny={false} />
    ) : null;

  const bumpers = (y: number, width: number, front = -2.02, rear = 2.02) =>
    [front, rear].map((z) => <Panel key={z} size={[width, 0.1, 0.12]} at={[0, y, z]} color={CHROME} />);

  if (body === "van" || body === "bus") {
    const bus = body === "bus";
    const top = bus ? BUS_TOP : VAN_TOP;
    const r: [number, number] = [0.36, 0.36];
    const z: [number, number] = bus ? [-1.25, 1.3] : [-1.3, 1.3];
    const arches = archesFor(r, z);
    wheelSet = wheelsAt(r, z, 0.86);
    const second = look.trim ?? paint;
    panels = (
      <>
        <Solid geo={cached(`${body}:body`, () => slab(outline(top, arches), 1.9))} color={paint} />
        <Panel size={[1.42, 0.34, 3.7]} at={[0, 0.24, 0]} color={DARK} shiny={false} />
        {/* door glass + rear window */}
        <Panel size={[1.93, 0.36, 0.62]} at={[0, 1.16, bus ? -1.2 : -0.72]} color={GLASS} />
        <Panel size={[1.3, 0.36, 0.1]} at={[0, 1.16, 1.96]} color={GLASS} />
        {bus ? (
          <>
            {/* split screen, V-shaped two-tone face and badge */}
            <Facing a={top[2]} b={top[3]} width={1.6} scale={0.78} color={GLASS} />
            <Facing a={top[2]} b={top[3]} width={0.08} scale={0.9} thick={0.07} color={paint} />
            <Solid geo={cached("bus:v", () => taper(0.3, 0.9, [-2.03, -1.9, 0.14], [-2.02, -1.9, 1.74]))} color={second} />
            <mesh position={[0, 0.72, -2.03]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.15, 0.15, 0.05, 12]} />
              <Paint color={CHROME} />
            </mesh>
            {flash("bus", -1.7, 3.1, 0.5, 0.42, 1.9)}
            <Panel size={[1.98, 0.1, 0.12]} at={[0, 0.24, -2.05]} color={CHROME} />
            <Lights front={[-2.03, 0.55]} rear={[2.02, 0.6]} spread={0.64} round />
          </>
        ) : (
          <>
            <Facing a={top[2]} b={top[3]} width={1.66} scale={0.82} color={GLASS} />
            {look.trim ? <Solid geo={cached("van:lower", () => lower(top, arches, 0.52, 1.92))} color={look.trim} /> : null}
            {flash("van", -0.45, 1.9, 0.72, 0.5, 1.9)}
            {/* grille */}
            <Panel size={[1.2, 0.26, 0.06]} at={[0, 0.58, -2.01]} color={CHROME} />
            {bumpers(0.26, 1.96)}
            <Lights front={[-2.02, 0.58]} rear={[2.02, 0.6]} spread={0.78} />
          </>
        )}
        {look.sideStripe ? <Panel size={[1.93, 0.07, 3.9]} at={[0, 0.58, 0]} color={look.sideStripe} shiny={false} /> : null}
      </>
    );
  } else if (body === "pickup") {
    const forward = Boolean(look.cabForward);
    const s = forward ? DEORA : PICKUP;
    const id = forward ? "deora" : "pickup";
    wheelSet = wheelsAt(s.r, s.z, s.track, s.tyre);
    panels = (
      <>
        {shell(id, s, look.stripes)}
        {look.stripes ? (
          <>
            <Solid geo={cached(`${id}:stripe`, () => skin(s.top, -1.96, s.cabin.base[0] + 0.1, 0.56, 0.012))} color={look.stripes} shiny={false} />
            <Solid geo={cached(`${id}:gap`, () => skin(s.top, -1.97, s.cabin.base[0] + 0.1, 0.1, 0.018))} color={paint} />
          </>
        ) : null}
        {forward ? (
          <>
            {/* twin boards on the deck, as on the original casting */}
            {[-0.38, 0.38].map((x) => (
              <Panel key={x} size={[0.5, 0.06, 1.45]} at={[x, 0.65, 1.15]} color={look.trim ?? look.sideFlash ?? CHROME} />
            ))}
            <Panel size={[1.5, 0.2, 0.22]} at={[0, 0.72, 0.42]} color={paint} />
          </>
        ) : (
          <>
            {/* bed walls + liner; the tailgate is part of the profile */}
            {[-0.9, 0.9].map((x) => (
              <Panel key={x} size={[0.1, 0.22, 1.42]} at={[x, 0.63, 1.2]} color={paint} />
            ))}
            <Panel size={[1.7, 0.02, 1.4]} at={[0, 0.55, 1.2]} color="#1f232b" shiny={false} />
            {/* grille */}
            <Panel size={[1.5, 0.16, 0.06]} at={[0, 0.44, -2.01]} color={DARK} shiny={false} />
          </>
        )}
        {flash(id, -0.8, 1.65, 0.2, 0.38, s.width)}
        {look.sideStripe ? <Panel size={[s.width + 0.03, 0.07, 3.9]} at={[0, 0.5, 0]} color={look.sideStripe} shiny={false} /> : null}
        {look.roundel ? (
          <mesh position={[0, 0.33, -0.15]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.15, 0.15, s.width + 0.05, 12]} />
            <meshLambertMaterial color={look.roundel} />
          </mesh>
        ) : null}
        {look.chrome === false || forward ? null : bumpers(0.28, 1.96)}
        <Lights front={[-2.02, forward ? 0.36 : 0.44]} rear={[2.02, 0.42]} spread={0.68} />
      </>
    );
  } else if (body === "hotrod") {
    // Open-wheel: skinny fronts, fat rears, engine out in the wind, chopped cab at the back.
    wheelSet = wheelsAt([0.32, 0.48], [-1.45, 1.25], 0.9, [0.2, 0.4]);
    panels = (
      <>
        <Panel size={[0.9, 0.14, 3.5]} at={[0, 0.2, 0.05]} color={look.trim ?? "#1f232b"} />
        <Solid geo={cached("hotrod:tub", () => slab(HOTROD_TUB, 1.3))} color={paint} />
        <Cabin id="hotrod" spec={HOTROD_CAB} roof={paint} />
        {flash("hotrod", 0.05, 1, 0.36, 0.4, 1.3)}
        {/* engine, headers and front axle */}
        <Panel size={[0.56, 0.4, 1.1]} at={[0, 0.45, -0.75]} color="#3a3f48" />
        <Panel size={[0.96, 0.1, 0.8]} at={[0, 0.42, -0.7]} color={CHROME} />
        <Blower at={[0, 0.65, -0.75]} />
        <Panel size={[1.7, 0.06, 0.08]} at={[0, -0.03, -1.45]} color={CHROME} />
        {/* grille shell with the chrome skull: cranium, jaw and two sockets */}
        <Panel size={[0.72, 0.66, 0.16]} at={[0, 0.55, -1.48]} color={paint} />
        <Panel size={[0.54, 0.34, 0.06]} at={[0, 0.66, -1.58]} color={CHROME} />
        <Panel size={[0.34, 0.2, 0.06]} at={[0, 0.4, -1.58]} color={CHROME} />
        {[-0.13, 0.13].map((x) => (
          <Panel key={x} size={[0.15, 0.13, 0.03]} at={[x, 0.67, -1.615]} color={DARK} shiny={false} />
        ))}
        <Lights front={[-1.52, 0.62]} rear={[1.88, 0.6]} spread={0.52} round />
      </>
    );
  } else if (body === "wedge") {
    const twin = look.blowers === 2;
    const s = twin ? TWIN : WEDGE;
    const id = twin ? "twin" : "wedge";
    wheelSet = wheelsAt(s.r, s.z, s.track, s.tyre);
    panels = (
      <>
        {shell(id, s)}
        {twin ? (
          <>
            {/* two blown V8s side by side on a shared block, pipes out of each flank */}
            <Panel size={[1.4, 0.2, 0.95]} at={[0, 0.52, -0.85]} color="#3a3f48" />
            <Blower at={[-0.42, 0.58, -0.85]} scale={0.95} />
            <Blower at={[0.42, 0.58, -0.85]} scale={0.95} />
            <Panel size={[1.98, 0.08, 0.9]} at={[0, 0.13, -0.2]} color={CHROME} />
            {flash(id, -0.85, 1.5, 0.2, 0.26, s.width)}
          </>
        ) : (
          <>
            {/* side intakes and the shoulders either side of the engine cover */}
            <Panel size={[1.96, 0.2, 0.42]} at={[0, 0.47, 0.72]} color={DARK} shiny={false} />
            {[-0.74, 0.74].map((x) => (
              <Panel key={x} size={[0.4, 0.12, 0.7]} at={[x, 0.76, 1.3]} color={paint} />
            ))}
            {flash(id, -0.75, 1.4, 0.2, 0.26, s.width)}
            <Panel size={[1.5, 0.08, 0.06]} at={[0, 0.2, -2.01]} color={DARK} shiny={false} />
          </>
        )}
        {look.wing ? <Wing y={1.04} z={1.78} color={look.wingColor ?? paint} span={1.9} /> : null}
        <Lights front={[-1.96, 0.27]} rear={[2.02, 0.56]} spread={0.66} />
      </>
    );
  } else {
    const muscle = body === "muscle";
    const tail = look.tail ?? (muscle ? "notch" : "fastback");
    const top = muscle ? MUSCLE_TOP : COUPE_TOP;
    // Gassers run small fronts and big rears under a nose-high body.
    const s: Shell = {
      width: 1.9,
      top,
      r: lifted ? [0.38, 0.46] : [0.36, 0.36],
      z: [-1.3, 1.3],
      track: 0.86,
      archGap: lifted ? 0.15 : 0.09,
      pan: [0.34, 3.7, 0],
      cabin: (muscle ? MUSCLE_CABINS : COUPE_CABINS)[tail],
    };
    const id = `${body}:${tail}:${lifted ? "lifted" : "low"}`;
    const arches = archesFor(s.r, s.z, s.archGap);
    const chrome = look.chrome ?? muscle;
    wheelSet = wheelsAt(s.r, s.z, s.track, s.tyre);
    panels = (
      <>
        {shell(id, s, look.stripes)}
        {look.trim ? <Solid geo={cached(`${id}:lower`, () => lower(top, arches, 0.36, 1.92))} color={look.trim} /> : null}
        {look.hood ? <Solid geo={cached(`${body}:hood`, () => skin(top, -1.97, s.cabin.base[0] + 0.1, 1.74, 0.01))} color={look.hood} /> : null}
        {look.stripes ? (
          <>
            <Solid geo={cached(`${body}:stripe`, () => skin(top, -1.96, 1.96, 0.56, 0.014))} color={look.stripes} shiny={false} />
            <Solid geo={cached(`${body}:gap`, () => skin(top, -1.97, 1.97, 0.1, 0.02))} color={look.hood ?? paint} />
          </>
        ) : null}
        {flash(body, -0.8, 1.65, 0.2, 0.38, 1.9)}
        {look.sideStripe ? <Panel size={[1.93, 0.06, 3.9]} at={[0, 0.52, 0]} color={look.sideStripe} shiny={false} /> : null}
        {look.tailBand ? <Panel size={[1.93, 0.25, 0.24]} at={[0, 0.61, 1.6]} color={look.tailBand} shiny={false} /> : null}
        {look.blowers ? <Blower at={[0, 0.6, -1.05]} scale={1.15} /> : null}
        {look.wing ? <Wing y={muscle ? 0.98 : 1.02} z={1.76} color={look.wingColor ?? paint} /> : null}
        {/* grille / intake */}
        <Panel size={muscle ? [1.6, 0.2, 0.06] : [1.3, 0.13, 0.06]} at={[0, muscle ? 0.42 : 0.29, -2.01]} color={DARK} shiny={false} />
        {chrome ? bumpers(0.28, 1.96) : null}
        <Lights front={muscle ? [-2.03, 0.43] : [-1.95, 0.46]} rear={[2.02, muscle ? 0.5 : 0.4]} spread={0.64} />
      </>
    );
  }

  return (
    <group>
      <group position={[0, lifted ? 0.2 : 0, 0]} rotation={[lifted ? 0.06 : 0, 0, 0]}>
        {panels}
      </group>
      <group ref={wheels}>
        {wheelSet.map((w) => (
          <Wheel key={w.at.join()} {...w} rim={rim} redline={look.redline} />
        ))}
      </group>
    </group>
  );
}
