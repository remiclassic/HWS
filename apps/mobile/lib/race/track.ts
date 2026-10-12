/**
 * The circuit: one closed loop of waypoints drives everything — road mesh, side lips,
 * the rivals' line, lap progress and where the stunts stand. Units are metres on the
 * garage floor (x, z); a car's forward at heading 0 is −z.
 *
 * Grew out of velocity-rush's Desert Run (MIT, github.com/AnushAdk04/velocity-rush),
 * stretched into a longer lap with a chicane, three loop-the-loops and two jumps.
 */
export type GroundPoint = { x: number; z: number };

/** Painted road width; the side lip sits just outside it. */
export const ROAD_WIDTH = 24;
/** Distance from the centerline at which a car hits the lip. */
export const ROAD_HALF = 13;

/** Corner points, driven in order. Straights carry extra points so the spline stays straight. */
const CONTROL_POINTS: readonly GroundPoint[] = [
  // Start / finish straight (heading −z): grid, jump, loop
  { x: 0, z: 110 },
  { x: 0, z: 50 },
  { x: 0, z: -20 },
  { x: 0, z: -90 },
  { x: 0, z: -160 },
  { x: 0, z: -230 },
  // Turn 1 — right
  { x: 30, z: -292 },
  { x: 90, z: -310 },
  // Top straight (heading +x): loop
  { x: 150, z: -310 },
  { x: 220, z: -310 },
  { x: 290, z: -310 },
  { x: 340, z: -310 },
  // Turn 2 — right
  { x: 402, z: -292 },
  { x: 430, z: -235 },
  // Right straight (heading +z): jump
  { x: 430, z: -180 },
  { x: 430, z: -110 },
  { x: 430, z: -40 },
  // Chicane
  { x: 422, z: 40 },
  { x: 375, z: 95 },
  { x: 345, z: 150 },
  { x: 352, z: 215 },
  { x: 395, z: 265 },
  { x: 400, z: 320 },
  { x: 350, z: 356 },
  // Bottom straight (heading −x): loop
  { x: 290, z: 360 },
  { x: 220, z: 360 },
  { x: 150, z: 360 },
  { x: 100, z: 360 },
  // Sweep back onto the start straight
  { x: 35, z: 345 },
  { x: -30, z: 300 },
  { x: -50, z: 235 },
  { x: -22, z: 172 },
];

const SUBDIVISIONS = 6;

function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (3 * p1 - p0 - 3 * p2 + p3) * t3);
}

/** The corner polygon rounded off with a spline so corners (and the rivals' line) are smooth. */
function smoothLoop(control: readonly GroundPoint[]): GroundPoint[] {
  const n = control.length;
  const out: GroundPoint[] = [];
  for (let i = 0; i < n; i++) {
    const p0 = control[(i - 1 + n) % n];
    const p1 = control[i];
    const p2 = control[(i + 1) % n];
    const p3 = control[(i + 2) % n];
    for (let s = 0; s < SUBDIVISIONS; s++) {
      const t = s / SUBDIVISIONS;
      out.push({ x: catmullRom(p0.x, p1.x, p2.x, p3.x, t), z: catmullRom(p0.z, p1.z, p2.z, p3.z, t) });
    }
  }
  return out;
}

/** Dense centerline, closed: the last point connects back to the first. */
export const WAYPOINTS: readonly GroundPoint[] = smoothLoop(CONTROL_POINTS);
const N = WAYPOINTS.length;

const SEG_LEN: number[] = [];
/** Distance along the lap at the start of each segment. */
const SEG_START: number[] = [];
let total = 0;
for (let i = 0; i < N; i++) {
  const a = WAYPOINTS[i];
  const b = WAYPOINTS[(i + 1) % N];
  SEG_START.push(total);
  SEG_LEN.push(Math.hypot(b.x - a.x, b.z - a.z));
  total += SEG_LEN[i];
}
export const TRACK_LENGTH = total;

/** Middle of the circuit's bounding box — where the garage is centred. */
export const TRACK_CENTRE: GroundPoint = (() => {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const p of WAYPOINTS) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minZ = Math.min(minZ, p.z);
    maxZ = Math.max(maxZ, p.z);
  }
  return { x: (minX + maxX) / 2, z: (minZ + maxZ) / 2 };
})();

export type TrackLocation = {
  /** Distance along the lap of the closest centerline point, 0 ≤ s < TRACK_LENGTH. */
  s: number;
  /** Distance from the centerline. */
  dist: number;
  /** Closest centerline point. */
  cx: number;
  cz: number;
  /** Unit direction of travel there. */
  dx: number;
  dz: number;
};

export function newTrackLocation(): TrackLocation {
  return { s: 0, dist: 0, cx: 0, cz: 0, dx: 0, dz: -1 };
}

/** Projects a ground position onto the lap. Writes into `out` (runs every frame — no garbage). */
export function locateOnTrack(x: number, z: number, out: TrackLocation): TrackLocation {
  let best = Infinity;
  for (let i = 0; i < N; i++) {
    const a = WAYPOINTS[i];
    const b = WAYPOINTS[(i + 1) % N];
    const abx = b.x - a.x;
    const abz = b.z - a.z;
    const len = SEG_LEN[i];
    if (len === 0) continue;
    const t = Math.max(0, Math.min(1, ((x - a.x) * abx + (z - a.z) * abz) / (len * len)));
    const px = a.x + abx * t;
    const pz = a.z + abz * t;
    const d2 = (x - px) * (x - px) + (z - pz) * (z - pz);
    if (d2 < best) {
      best = d2;
      out.s = SEG_START[i] + len * t;
      out.cx = px;
      out.cz = pz;
      out.dx = abx / len;
      out.dz = abz / len;
    }
  }
  out.dist = Math.sqrt(best);
  return out;
}

/** Centerline point + direction at distance `s` along the lap (wraps). */
export function pointAtDistance(s: number, out: TrackLocation): TrackLocation {
  const wrapped = ((s % TRACK_LENGTH) + TRACK_LENGTH) % TRACK_LENGTH;
  let lo = 0;
  let hi = N - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (SEG_START[mid] <= wrapped) lo = mid;
    else hi = mid - 1;
  }
  const a = WAYPOINTS[lo];
  const b = WAYPOINTS[(lo + 1) % N];
  const len = SEG_LEN[lo] || 1;
  const t = (wrapped - SEG_START[lo]) / len;
  out.s = wrapped;
  out.dist = 0;
  out.cx = a.x + (b.x - a.x) * t;
  out.cz = a.z + (b.z - a.z) * t;
  out.dx = (b.x - a.x) / len;
  out.dz = (b.z - a.z) / len;
  return out;
}

const scratch = newTrackLocation();
const lapDistanceOf = (p: GroundPoint) => locateOnTrack(p.x, p.z, scratch).s;

/** Start/finish line, on the main straight. */
export const FINISH_POINT: GroundPoint = { x: 0, z: 40 };
export const FINISH_S = lapDistanceOf(FINISH_POINT);

/** Metres travelled since the finish line this lap, 0 ≤ result < TRACK_LENGTH. */
export function lapDistance(s: number): number {
  return (((s - FINISH_S) % TRACK_LENGTH) + TRACK_LENGTH) % TRACK_LENGTH;
}

/** Timing lines that must be crossed in order for a lap to count, evenly spread round the lap. */
const CHECKPOINTS = 8;
export const CHECKPOINT_S: readonly number[] = Array.from(
  { length: CHECKPOINTS },
  (_, i) => (FINISH_S + ((i + 1) * TRACK_LENGTH) / (CHECKPOINTS + 1)) % TRACK_LENGTH,
);

// ── Loop-the-loops ───────────────────────────────────────────────────────────

/**
 * Built like the toy: one lane of track bent into a circle and offset sideways as it
 * goes round, so the exit lands beside the entry. A booster strip on the run-in gathers
 * every car into the entry lane and makes sure it has the speed to get over the top.
 */
export const LOOP_RADIUS = 16;
/** Width of the loop's single lane. */
export const LOOP_WIDTH = 7;
/** Sideways travel over one full turn: a lane plus a small gap between entry and exit. */
export const LOOP_SHIFT = LOOP_WIDTH + 0.8;
/** m/s the booster guarantees through the loop. */
export const LOOP_MIN_SPEED = 22;
/** Cars sit this far inside the loop's surface (their origin is at axle height). */
export const LOOP_RIDE_RADIUS = LOOP_RADIUS - 0.4;
/** Run-in before the foot of the loop; the exit ramp comes down beside the entry over this stretch. */
export const LOOP_APPROACH = 36;
/** Metres on rails: run-in plus one full turn. */
export const LOOP_LENGTH = LOOP_APPROACH + Math.PI * 2 * LOOP_RIDE_RADIUS;

export type LoopStunt = {
  /** Lap distance of the foot of the loop and of the start of its run-in. */
  s: number;
  entryS: number;
  /** Foot of the loop on the centerline, and the direction through it. */
  cx: number;
  cz: number;
  dx: number;
  dz: number;
};

function makeLoop(at: GroundPoint): LoopStunt {
  const foot = locateOnTrack(at.x, at.z, newTrackLocation());
  return {
    s: foot.s,
    entryS: pointAtDistance(foot.s - LOOP_APPROACH, scratch).s,
    cx: foot.cx,
    cz: foot.cz,
    dx: foot.dx,
    dz: foot.dz,
  };
}

/** In lap order: start straight, top straight, bottom straight. */
export const LOOPS: readonly LoopStunt[] = [
  { x: 0, z: -170 },
  { x: 250, z: -310 },
  { x: 200, z: 360 },
].map(makeLoop);

export type LoopPose = {
  /** Metres past the foot of the loop along the road (negative on the run-in and the way back down). */
  along: number;
  /** Height above the road. */
  y: number;
  /** Nose-up pitch, radians. */
  pitch: number;
  /** Sideways offset from the road centerline; positive is right of travel. */
  lane: number;
};

/**
 * Where a car is after `progress` metres of the stunt, having arrived at lane `fromLane`:
 * first eased across into the entry lane, then round the corkscrew to the exit lane.
 */
export function loopPose(progress: number, fromLane: number, out: LoopPose): LoopPose {
  const entryLane = -LOOP_SHIFT / 2;
  if (progress < LOOP_APPROACH) {
    const t = Math.max(0, progress / LOOP_APPROACH);
    out.along = progress - LOOP_APPROACH;
    out.y = 0;
    out.pitch = 0;
    out.lane = fromLane + (entryLane - fromLane) * t * t * (3 - 2 * t);
    return out;
  }
  const angle = Math.min((progress - LOOP_APPROACH) / LOOP_RIDE_RADIUS, Math.PI * 2);
  out.along = LOOP_RIDE_RADIUS * Math.sin(angle);
  out.y = LOOP_RIDE_RADIUS * (1 - Math.cos(angle));
  out.pitch = angle;
  out.lane = entryLane + (LOOP_SHIFT * angle) / (Math.PI * 2);
  return out;
}

// ── Jumps ────────────────────────────────────────────────────────────────────

/** A full-width kicker ramp: the road climbs to `JUMP_HEIGHT` over `JUMP_LENGTH`, then stops. */
export const JUMP_LENGTH = 16;
export const JUMP_HEIGHT = 3.6;

export type JumpStunt = {
  /** Lap distance where the ramp starts. */
  s: number;
  cx: number;
  cz: number;
  dx: number;
  dz: number;
};

/** In lap order: start straight (before the first loop), right straight. */
export const JUMPS: readonly JumpStunt[] = [
  { x: 0, z: -20 },
  { x: 430, z: -170 },
].map((at) => {
  const p = locateOnTrack(at.x, at.z, newTrackLocation());
  return { s: p.s, cx: p.cx, cz: p.cz, dx: p.dx, dz: p.dz };
});

/** Height of the road surface at lap distance `s` (non-zero only on a ramp). */
export function rampHeight(s: number): number {
  for (const jump of JUMPS) {
    const d = (((s - jump.s) % TRACK_LENGTH) + TRACK_LENGTH) % TRACK_LENGTH;
    if (d < JUMP_LENGTH) return (JUMP_HEIGHT * d) / JUMP_LENGTH;
  }
  return 0;
}

// ── Grid ─────────────────────────────────────────────────────────────────────

/** Heading (three.js Y rotation) that faces along a direction of travel. */
export function headingFor(dx: number, dz: number): number {
  return Math.atan2(-dx, -dz);
}

/** Grid slots behind the line; slot 0 is pole. Two-wide, staggered. */
export function gridSlot(slot: number): { x: number; z: number; rotY: number; s: number; lane: number } {
  const p = pointAtDistance(FINISH_S - 8 - slot * 8, scratch);
  const lane = slot % 2 === 0 ? -5 : 5;
  return { x: p.cx - p.dz * lane, z: p.cz + p.dx * lane, rotY: headingFor(p.dx, p.dz), s: p.s, lane };
}

export const TRACK = {
  id: "garage-gp",
  name: "Garage Grand Prix",
  blurb: "Three loop-the-loops, two jumps and a chicane round the garage floor.",
} as const;
