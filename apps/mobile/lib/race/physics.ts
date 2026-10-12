/**
 * Arcade car physics + race rules as plain step functions, so they run the same in
 * the 3D scene and in vitest.
 *
 * The driving model (gears, brake-then-reverse, speed-sensitive steering, lip pushback)
 * is ported from velocity-rush's `useCarPhysics` (MIT). On top of it: airtime off the
 * jump ramps, rides round the loop-the-loops, and car-to-car hits that shove and flip.
 */
import {
  CHECKPOINT_S,
  FINISH_S,
  JUMP_HEIGHT,
  JUMP_LENGTH,
  LOOPS,
  LOOP_APPROACH,
  LOOP_LENGTH,
  LOOP_MIN_SPEED,
  LOOP_SHIFT,
  ROAD_HALF,
  TRACK_LENGTH,
  headingFor,
  lapDistance,
  locateOnTrack,
  loopPose,
  newTrackLocation,
  pointAtDistance,
  rampHeight,
  type LoopPose,
  type TrackLocation,
} from "./track";

export type CarSpec = {
  /** m/s */
  topSpeed: number;
  /** m/s² in first gear; higher gears pull less. */
  acceleration: number;
  braking: number;
  /** rad/s at low speed; halves by top speed. */
  handling: number;
  /** 0–1: how quickly the car's travel snaps to where it points (per 60 Hz frame). */
  grip: number;
};

export type DriveInput = {
  throttle: boolean;
  /** Brakes, then reverses once stopped. */
  reverse: boolean;
  /** −1 (left) … 1 (right). */
  steer: number;
};

/** Toy-car gravity: snappier than the real thing so jumps land before the next corner. */
const GRAVITY = 30;
const RAMP_PITCH = Math.atan2(JUMP_HEIGHT, JUMP_LENGTH);
/** Steering authority and line-holding while the wheels are off the ground. */
const AIR_STEER = 0.3;
const AIR_GRIP = 0.03;

/** What every car has in the vertical and when it is knocked over. */
type Tumbler = {
  /** Height above the flat road and vertical speed. */
  y: number;
  vy: number;
  airborne: boolean;
  /** Nose-up pitch round a loop — the camera follows this one. */
  pitch: number;
  /** Nose-up attitude on a ramp and through the air: up at take-off, dropping over the arc. */
  tilt: number;
  /**
   * Suspension, model only: the body leans out of corners, squats under power, dives
   * under brakes and bottoms out on landings, each on its own spring.
   */
  lean: number;
  leanRate: number;
  dive: number;
  diveRate: number;
  heave: number;
  heaveRate: number;
  /** Crash state: barrel roll and end-over-end spin applied to the model only. */
  tumbling: boolean;
  tumbleTime: number;
  roll: number;
  rollRate: number;
  flip: number;
  flipRate: number;
  /** Signed road speed, m/s. */
  speed: number;
};

const TUMBLER_START = {
  y: 0,
  vy: 0,
  airborne: false,
  pitch: 0,
  tilt: 0,
  lean: 0,
  leanRate: 0,
  dive: 0,
  diveRate: 0,
  heave: 0,
  heaveRate: 0,
  tumbling: false,
  tumbleTime: 0,
  roll: 0,
  rollRate: 0,
  flip: 0,
  flipRate: 0,
};

export type PlayerCar = Tumbler & {
  x: number;
  z: number;
  /** Heading; 0 faces −z, positive turns left (three.js Y rotation). */
  rotY: number;
  vx: number;
  vz: number;
  gear: number;
  gearTimer: number;
  /** Metres into a loop stunt (run-in, then the circle); −1 when driving freely. */
  loop: number;
  /** Foot of that loop on the centerline, the direction through it, and the lane the car arrived in. */
  loopX: number;
  loopZ: number;
  loopDx: number;
  loopDz: number;
  loopLane: number;
  /** Where the car is on the lap, refreshed every step. */
  loc: TrackLocation;
  /** Last on-road, right-way-round pose — the reset button returns here. */
  safeX: number;
  safeZ: number;
  safeRotY: number;
  safeTimer: number;
};

const GEARS = [
  { min: 0, max: 8, accelMult: 1.0 },
  { min: 8, max: 16, accelMult: 0.85 },
  { min: 16, max: 24, accelMult: 0.7 },
  { min: 24, max: 32, accelMult: 0.55 },
  { min: 32, max: 40, accelMult: 0.4 },
  { min: 40, max: Infinity, accelMult: 0.28 },
];

function gearFor(speed: number): number {
  const s = Math.abs(speed);
  for (let i = 0; i < GEARS.length; i++) {
    if (s >= GEARS[i].min && s < GEARS[i].max) return i;
  }
  return GEARS.length - 1;
}

export function newPlayerCar(x: number, z: number, rotY: number): PlayerCar {
  const car: PlayerCar = {
    ...TUMBLER_START,
    x,
    z,
    rotY,
    speed: 0,
    vx: 0,
    vz: 0,
    gear: 0,
    gearTimer: 0,
    loop: -1,
    loopX: 0,
    loopZ: 0,
    loopDx: 0,
    loopDz: 0,
    loopLane: 0,
    loc: newTrackLocation(),
    safeX: x,
    safeZ: z,
    safeRotY: rotY,
    safeTimer: 0,
  };
  locateOnTrack(x, z, car.loc);
  return car;
}

// ── Vertical motion and crashes (shared by the player and the rivals) ────────

/** Knocks a car into the air, spinning. `side` picks the roll direction, `power` is the closing speed. */
function startTumble(c: Tumbler, side: number, power: number): void {
  if (c.tumbling) return;
  c.tumbling = true;
  c.tumbleTime = 0;
  c.airborne = true;
  c.vy = Math.min(5 + power * 0.25, 13);
  c.rollRate = (side >= 0 ? 1 : -1) * Math.min(7 + power * 0.25, 16);
  c.flipRate = power > 24 ? 4 : 1.5;
}

/**
 * Follows the road up a ramp, flies off the end, falls and lands; spins while crashed.
 * `ground` is the road height under the car. Returns the landing speed (0 if none this step).
 */
function stepVertical(c: Tumbler, ground: number, dt: number): number {
  let landed = 0;
  if (!c.airborne) {
    if (ground < c.y - 0.3) {
      // The road dropped away (end of a ramp): keep the climb rate and fly.
      c.airborne = true;
    } else {
      c.vy = (ground - c.y) / dt;
      c.y = ground;
    }
  }
  if (c.airborne) {
    c.vy -= GRAVITY * dt;
    c.y += c.vy * dt;
    if (c.y <= ground) {
      landed = -c.vy;
      c.y = ground;
      c.vy = 0;
      c.airborne = false;
    }
  }

  if (c.tumbling) {
    c.tumbleTime += dt;
    c.speed *= Math.max(0, 1 - 1.3 * dt);
    // Once it is down, keep rolling just until the wheels come round again.
    if (!c.airborne && Math.abs(c.rollRate) < 6) c.rollRate = c.rollRate >= 0 ? 6 : -6;
    c.roll += c.rollRate * dt;
    c.flip += c.flipRate * dt;
    const turn = ((c.roll % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    if (!c.airborne && c.tumbleTime > 0.7 && (turn < 0.35 || turn > Math.PI * 2 - 0.35)) {
      c.tumbling = false;
      c.roll = 0;
      c.flip = 0;
      c.rollRate = 0;
      c.flipRate = 0;
      c.speed = Math.min(c.speed, 14);
    }
  } else {
    // Nose follows the ramp on the way up; in the air it swings over with the arc —
    // exaggerated and a beat late, the way a nose-heavy toy car flies.
    if (c.airborne) {
      const arc = Math.max(-0.75, Math.min(0.6, Math.atan2(c.vy, Math.abs(c.speed) * 0.6 + 4) * 1.6));
      c.tilt += (arc - c.tilt) * Math.min(1, dt * 5);
    } else {
      c.tilt += ((ground > 0.01 ? RAMP_PITCH : 0) - c.tilt) * Math.min(1, dt * 12);
    }
  }
  return landed;
}

const SPRING = 110;
const DAMPING = 9;

/** One lightly damped spring: overshoots a little and settles, like real suspension. */
function spring(value: number, rate: number, target: number, dt: number): number {
  return rate + (SPRING * (target - value) - DAMPING * rate) * dt;
}

/**
 * Body motion on the springs. `yawRate` (rad/s, positive turning left) and `accel`
 * (m/s²) come from what the car just did; `landed` is the landing speed this step;
 * `airRoll` (−1…1) lets the driver bank the car in the air.
 */
function stepSuspension(c: Tumbler, yawRate: number, accel: number, landed: number, airRoll: number, dt: number): void {
  if (c.tumbling) {
    c.lean = c.dive = c.heave = 0;
    c.leanRate = c.diveRate = c.heaveRate = 0;
    return;
  }
  // Cornering force = speed × yaw rate; the body rolls away from the turn (negative z-roll for a left turn).
  const cornering = Math.max(-30, Math.min(30, yawRate * c.speed));
  const leanTarget = c.airborne ? -airRoll * 0.3 : -cornering * 0.0075;
  // Squat under power, dive under brakes; clamped so a lip strike does not stand it on its nose.
  const diveTarget = c.airborne ? 0 : Math.max(-0.12, Math.min(0.07, accel * 0.006));
  c.leanRate = spring(c.lean, c.leanRate, leanTarget, dt);
  c.diveRate = spring(c.dive, c.diveRate, diveTarget, dt);
  c.heaveRate = spring(c.heave, c.heaveRate, 0, dt);
  // A landing punches the body down onto the bump stops and pitches the nose in.
  if (landed > 2) {
    c.heaveRate -= Math.min(landed * 0.22, 3.2);
    c.diveRate -= Math.min(landed * 0.05, 0.9);
  }
  c.lean += c.leanRate * dt;
  c.dive += c.diveRate * dt;
  c.heave = Math.max(-0.22, c.heave + c.heaveRate * dt);
}

// ── Player ───────────────────────────────────────────────────────────────────

const poseScratch: LoopPose = { along: 0, y: 0, pitch: 0, lane: 0 };

/** On rails through the run-in and round the loop; back on the road in the exit lane. */
function rideLoop(car: PlayerCar, dt: number): void {
  // Booster: it cannot stall at the top.
  car.speed = Math.max(car.speed, LOOP_MIN_SPEED);
  car.loop = Math.min(car.loop + car.speed * dt, LOOP_LENGTH);
  const done = car.loop >= LOOP_LENGTH;
  const pose = loopPose(car.loop, car.loopLane, poseScratch);
  // Set down just past the foot so the next step does not re-trigger anything.
  const along = done ? 0.6 : pose.along;
  car.x = car.loopX - car.loopDz * pose.lane + car.loopDx * along;
  car.z = car.loopZ + car.loopDx * pose.lane + car.loopDz * along;
  car.y = done ? 0 : pose.y;
  car.pitch = done ? 0 : pose.pitch;
  // Pressed into the track all the way round: no body roll, a little squat.
  car.tilt = 0;
  stepSuspension(car, 0, 0, 0, 0, dt);
  if (done) {
    car.loop = -1;
    car.vx = car.loopDx * car.speed;
    car.vz = car.loopDz * car.speed;
  }
  locateOnTrack(car.x, car.z, car.loc);
}

/**
 * Advances the player's car by `dt` seconds. Returns how hard it hit something this
 * step (lip or landing, 0–1) so the caller can shake the camera.
 */
export function stepPlayerCar(car: PlayerCar, input: DriveInput, spec: CarSpec, dt: number): number {
  if (car.loop >= 0) {
    rideLoop(car, dt);
    return 0;
  }
  const prevS = car.loc.s;
  const prevSpeed = car.speed;
  const prevRotY = car.rotY;
  const driving = !car.airborne && !car.tumbling;

  // Gearbox: a short lockout so the gear readout does not flicker at a boundary.
  const gear = gearFor(car.speed);
  car.gearTimer -= dt;
  if (gear !== car.gear && car.gearTimer <= 0) {
    car.gear = gear;
    car.gearTimer = 0.3;
  }

  // Engine — only with the wheels on the road.
  if (driving) {
    if (input.reverse) {
      car.speed =
        car.speed > 0.5
          ? Math.max(car.speed - spec.braking * dt, 0)
          : Math.max(car.speed - spec.acceleration * 0.5 * dt, -spec.topSpeed * 0.35);
    } else if (input.throttle) {
      car.speed = Math.min(car.speed + spec.acceleration * GEARS[car.gear].accelMult * dt, spec.topSpeed);
    } else {
      car.speed *= 1 - 1.8 * dt;
      if (Math.abs(car.speed) < 0.05) car.speed = 0;
    }
  }

  // Steering — lighter at speed, a nudge in the air, none when parked or crashed.
  if (!car.tumbling && Math.abs(car.speed) > 0.5) {
    const speedRatio = Math.min(Math.abs(car.speed) / spec.topSpeed, 1);
    const direction = car.speed > 0 ? 1 : -1;
    const authority = car.airborne ? AIR_STEER : 1;
    car.rotY -= input.steer * spec.handling * authority * (1 - speedRatio * 0.5) * dt * direction;
  }

  // Travel eases toward where the car points; the lag is the slide. A crashed car just skids.
  if (car.tumbling) {
    const drag = Math.max(0, 1 - 1.3 * dt);
    car.vx *= drag;
    car.vz *= drag;
  } else {
    const blend = 1 - Math.pow(1 - (car.airborne ? AIR_GRIP : spec.grip), dt * 60);
    car.vx += (-Math.sin(car.rotY) * car.speed - car.vx) * blend;
    car.vz += (-Math.cos(car.rotY) * car.speed - car.vz) * blend;
  }
  car.x += car.vx * dt;
  car.z += car.vz * dt;

  // Side lip: shove back onto the road and scrub speed.
  let impact = 0;
  const loc = locateOnTrack(car.x, car.z, car.loc);
  if (loc.dist > ROAD_HALF) {
    const overshoot = loc.dist - ROAD_HALF;
    const nx = (loc.cx - car.x) / loc.dist;
    const nz = (loc.cz - car.z) / loc.dist;
    car.x += nx * overshoot;
    car.z += nz * overshoot;
    impact = Math.min(overshoot / 2, 1);
    const keep = 1 - impact * 0.65;
    const hitSpeed = Math.abs(car.speed);
    car.speed *= keep;
    car.vx *= keep;
    car.vz *= keep;
    loc.dist = ROAD_HALF;
    // Flat out into the lip sends it over.
    if (impact > 0.85 && hitSpeed > 38) startTumble(car, nx * Math.cos(car.rotY) - nz * Math.sin(car.rotY), hitSpeed * 0.4);
  }

  const wasTumbling = car.tumbling;
  const landing = stepVertical(car, rampHeight(loc.s), dt);
  if (landing > 6) impact = Math.max(impact, Math.min(landing / 22, 1));
  stepSuspension(car, (car.rotY - prevRotY) / dt, (car.speed - prevSpeed) / dt, landing, input.steer, dt);
  if (wasTumbling && !car.tumbling) {
    // Back on its wheels: point it down the road so the driver can get going.
    car.rotY = headingFor(loc.dx, loc.dz);
    car.vx = loc.dx * car.speed;
    car.vz = loc.dz * car.speed;
  }

  if (!car.airborne && !car.tumbling) {
    // Rolling forward onto a run-in: the booster grabs the car and feeds it into the loop.
    if (car.speed > 3 && headingAlignment(car) > 0.7) {
      for (const stunt of LOOPS) {
        if (!crossed(prevS, loc.s, stunt.entryS)) continue;
        car.loop = 0;
        car.loopX = stunt.cx;
        car.loopZ = stunt.cz;
        car.loopDx = stunt.dx;
        car.loopDz = stunt.dz;
        car.loopLane = Math.max(-ROAD_HALF, Math.min(ROAD_HALF, (car.x - loc.cx) * -loc.dz + (car.z - loc.cz) * loc.dx));
        car.rotY = headingFor(stunt.dx, stunt.dz);
        return impact;
      }
    }

    // Remember a good pose for the reset button.
    car.safeTimer -= dt;
    if (car.safeTimer <= 0 && car.y < 0.05 && loc.dist < ROAD_HALF - 1 && headingAlignment(car) > 0.2) {
      car.safeX = car.x;
      car.safeZ = car.z;
      car.safeRotY = car.rotY;
      car.safeTimer = 0.5;
    }
  }

  return impact;
}

/** 1 = pointing along the track, −1 = pointing straight back down it. */
export function headingAlignment(car: PlayerCar): number {
  return -Math.sin(car.rotY) * car.loc.dx + -Math.cos(car.rotY) * car.loc.dz;
}

export function isWrongWay(car: PlayerCar): boolean {
  return !car.tumbling && headingAlignment(car) < -0.5 && Math.abs(car.speed) > 8;
}

export function resetToSafePose(car: PlayerCar): void {
  Object.assign(car, TUMBLER_START);
  car.x = car.safeX;
  car.z = car.safeZ;
  car.rotY = car.safeRotY;
  car.speed = 0;
  car.vx = 0;
  car.vz = 0;
  car.loop = -1;
  locateOnTrack(car.x, car.z, car.loc);
}

// ── Laps ─────────────────────────────────────────────────────────────────────

export type LapState = {
  /** 1-based lap being driven. */
  lap: number;
  /** Index of the next timing line; `CHECKPOINT_S.length` means "head for the finish". */
  nextCheckpoint: number;
  lapStart: number;
  /** Seconds; 0 if no lap completed. */
  bestLap: number;
  /** Race clock at the flag; 0 while racing. */
  finishTime: number;
};

export function newLapState(): LapState {
  return { lap: 1, nextCheckpoint: 0, lapStart: 0, bestLap: 0, finishTime: 0 };
}

/** A car cannot legitimately cover more than this in one tick; bigger jumps are not "passing". */
const MAX_STEP = 30;

/** True when moving forward from `prevS` to `s` crossed the lap distance `target`. */
function crossed(prevS: number, s: number, target: number): boolean {
  const moved = (((s - prevS) % TRACK_LENGTH) + TRACK_LENGTH) % TRACK_LENGTH;
  if (moved === 0 || moved > MAX_STEP) return false;
  const toTarget = (((target - prevS) % TRACK_LENGTH) + TRACK_LENGTH) % TRACK_LENGTH;
  return toTarget > 0 && toTarget <= moved;
}

/** Timing lines must be taken in order, then the finish. Mutates `state`. */
export function updateLap(state: LapState, prevS: number, s: number, raceTime: number, totalLaps: number): void {
  if (state.finishTime > 0) return;
  if (state.nextCheckpoint < CHECKPOINT_S.length) {
    if (crossed(prevS, s, CHECKPOINT_S[state.nextCheckpoint])) state.nextCheckpoint += 1;
    return;
  }
  if (!crossed(prevS, s, FINISH_S)) return;
  const lapTime = raceTime - state.lapStart;
  if (state.bestLap === 0 || lapTime < state.bestLap) state.bestLap = lapTime;
  state.lapStart = raceTime;
  state.nextCheckpoint = 0;
  if (state.lap >= totalLaps) state.finishTime = raceTime;
  else state.lap += 1;
}

/** Total metres raced by the player — comparable with `Rival.travelled`. */
export function playerTravelled(state: LapState, s: number): number {
  const within = lapDistance(s);
  // Just past the line but the lap has not ticked over yet (or sitting on the grid).
  const gatesDone = state.nextCheckpoint >= CHECKPOINT_S.length;
  const wrapped = !gatesDone && state.nextCheckpoint === 0 && within > TRACK_LENGTH / 2;
  const laps = state.finishTime > 0 ? state.lap : state.lap - 1;
  return laps * TRACK_LENGTH + (wrapped ? within - TRACK_LENGTH : state.finishTime > 0 ? 0 : within);
}

// ── Rivals ───────────────────────────────────────────────────────────────────

/**
 * Rivals run the centerline on rails (velocity-rush's "ghost" cars) — but they can be
 * shoved sideways off their lane, slowed, launched off ramps and flipped like anyone else.
 */
export type Rival = Tumbler & {
  /** Metres from the finish line; negative on the grid. */
  travelled: number;
  /** Preferred sideways offset from the centerline (m). */
  lane: number;
  /** Where it actually is: loops drop it in the exit lane and it drifts back. */
  laneNow: number;
  /** Extra sideways displacement from being hit, and how fast that is changing. */
  side: number;
  sideSpeed: number;
  /** Cruise speed, m/s. */
  pace: number;
  x: number;
  z: number;
  rotY: number;
  /** Direction of travel where it is. */
  dx: number;
  dz: number;
  /** Metres into a loop stunt; −1 when on the road. */
  loop: number;
  loopIndex: number;
  finishTime: number;
};

const rivalScratch = newTrackLocation();
/** Metres from the finish line to the start of each loop's run-in. */
const LOOP_ENTRY_FROM_LINE = LOOPS.map((stunt) => lapDistance(stunt.entryS));

/** Puts the rival on the road at its lap distance and lane; returns that lap distance. */
function placeRival(r: Rival): number {
  const p = pointAtDistance(FINISH_S + r.travelled, rivalScratch);
  const reach = ROAD_HALF - 1;
  const lane = Math.max(-reach, Math.min(reach, r.laneNow + r.side));
  r.side = lane - r.laneNow;
  r.dx = p.dx;
  r.dz = p.dz;
  r.x = p.cx - p.dz * lane;
  r.z = p.cz + p.dx * lane;
  return p.s;
}

export function newRival(gridS: number, lane: number, pace: number): Rival {
  const r: Rival = {
    ...TUMBLER_START,
    travelled: gridS - FINISH_S,
    lane,
    laneNow: lane,
    side: 0,
    sideSpeed: 0,
    pace,
    speed: 0,
    x: 0,
    z: 0,
    rotY: 0,
    dx: 0,
    dz: -1,
    loop: -1,
    loopIndex: 0,
    finishTime: 0,
  };
  if (r.travelled > 0) r.travelled -= TRACK_LENGTH;
  placeRival(r);
  r.rotY = headingFor(r.dx, r.dz);
  return r;
}

export function stepRival(r: Rival, dt: number, raceTime: number, totalLaps: number): void {
  if (r.loop >= 0) {
    const stunt = LOOPS[r.loopIndex];
    r.speed = Math.max(r.speed, LOOP_MIN_SPEED);
    r.loop = Math.min(r.loop + r.speed * dt, LOOP_LENGTH);
    const done = r.loop >= LOOP_LENGTH;
    const pose = loopPose(r.loop, r.lane, poseScratch);
    r.x = stunt.cx - stunt.dz * pose.lane + stunt.dx * pose.along;
    r.z = stunt.cz + stunt.dx * pose.lane + stunt.dz * pose.along;
    r.y = done ? 0 : pose.y;
    r.pitch = done ? 0 : pose.pitch;
    r.dx = stunt.dx;
    r.dz = stunt.dz;
    r.rotY = headingFor(stunt.dx, stunt.dz);
    r.tilt = 0;
    stepSuspension(r, 0, 0, 0, 0, dt);
    if (done) {
      // Back on the road at the foot, in the exit lane.
      r.loop = -1;
      r.travelled += LOOP_APPROACH;
      r.laneNow = LOOP_SHIFT / 2;
      r.side = 0;
      r.sideSpeed = 0;
    }
    return;
  }

  const before = r.travelled;
  const prevSpeed = r.speed;
  if (!r.airborne && !r.tumbling) {
    // Look ahead: the sharper the bend, the lower the target speed.
    const ahead = pointAtDistance(FINISH_S + r.travelled + 28, rivalScratch);
    const straightness = Math.max(0, r.dx * ahead.dx + r.dz * ahead.dz);
    const target = r.pace * (0.62 + 0.38 * straightness);
    r.speed += Math.max(-26 * dt, Math.min(9 * dt, target - r.speed));
  }
  r.travelled += Math.max(0, r.speed) * dt;

  // A shove sideways springs back to the racing line.
  r.sideSpeed += (-5 * r.side - 4 * r.sideSpeed) * dt;
  r.side += r.sideSpeed * dt;
  r.laneNow += Math.max(-4 * dt, Math.min(4 * dt, r.lane - r.laneNow));

  if (!r.airborne && !r.tumbling && r.speed > 1) {
    for (let i = 0; i < LOOPS.length; i++) {
      const from = LOOP_ENTRY_FROM_LINE[i];
      const lapsPast = Math.floor((r.travelled - from) / TRACK_LENGTH);
      if (lapsPast <= Math.floor((before - from) / TRACK_LENGTH)) continue;
      r.travelled = lapsPast * TRACK_LENGTH + from;
      r.loop = 0;
      r.loopIndex = i;
      break;
    }
  }

  const s = placeRival(r);
  const landing = stepVertical(r, rampHeight(s), dt);

  const want = headingFor(r.dx, r.dz);
  let turn = want - r.rotY;
  while (turn > Math.PI) turn -= Math.PI * 2;
  while (turn < -Math.PI) turn += Math.PI * 2;
  const yaw = turn * Math.min(1, dt * 8);
  r.rotY += yaw;
  stepSuspension(r, yaw / dt, (r.speed - prevSpeed) / dt, landing, 0, dt);

  if (r.finishTime === 0 && r.travelled >= totalLaps * TRACK_LENGTH) r.finishTime = raceTime;
}

/** 1-based place of the player among the rivals. */
export function playerPlace(state: LapState, s: number, rivals: readonly Rival[]): number {
  let place = 1;
  if (state.finishTime > 0) {
    for (const r of rivals) if (r.finishTime > 0 && r.finishTime < state.finishTime) place++;
    return place;
  }
  const mine = playerTravelled(state, s);
  // A rival's odometer waits at the run-in while it is on a loop; count the run-in it has covered.
  for (const r of rivals) {
    const covered = r.travelled + (r.loop >= 0 ? Math.min(r.loop, LOOP_APPROACH) : 0);
    if (r.finishTime > 0 || covered > mine) place++;
  }
  return place;
}

// ── Car-to-car contact ───────────────────────────────────────────────────────

/** Each car is two bumper-to-bumper circles, so side-by-side and nose-to-tail both fit. */
const BODY_RADIUS = 1.0;
const BODY_REACH = 1.0;
const BOUNCE = 0.3;
/** Closing speeds (m/s) above which the slower car, then both cars, are flipped. */
const FLIP_ONE = 12;
const FLIP_BOTH = 24;

type Contact = { nx: number; nz: number; depth: number };
const contact: Contact = { nx: 0, nz: 0, depth: 0 };

/** Deepest overlap between two cars' circles; normal points from A to B. */
function findContact(ax: number, az: number, afx: number, afz: number, bx: number, bz: number, bfx: number, bfz: number): boolean {
  contact.depth = 0;
  for (let i = -1; i <= 1; i += 2) {
    for (let j = -1; j <= 1; j += 2) {
      const dx = bx + bfx * BODY_REACH * j - (ax + afx * BODY_REACH * i);
      const dz = bz + bfz * BODY_REACH * j - (az + afz * BODY_REACH * i);
      const d = Math.hypot(dx, dz);
      const depth = BODY_RADIUS * 2 - d;
      if (depth > contact.depth && d > 1e-4) {
        contact.depth = depth;
        contact.nx = dx / d;
        contact.nz = dz / d;
      }
    }
  }
  return contact.depth > 0;
}

function pushRival(r: Rival, px: number, pz: number): void {
  r.side += px * -r.dz + pz * r.dx;
  r.travelled += px * r.dx + pz * r.dz;
}

function kickRival(r: Rival, jx: number, jz: number): void {
  r.sideSpeed += jx * -r.dz + jz * r.dx;
  r.speed = Math.max(0, r.speed + jx * r.dx + jz * r.dz);
}

/** Which way a hit along (nx, nz) rolls a car heading (fx, fz). */
function rollSide(nx: number, nz: number, fx: number, fz: number): number {
  return nx * fz - nz * fx;
}

/**
 * Resolves contact between every pair of cars: they are pushed apart, trade momentum,
 * and a hard enough hit flips the slower one (or both). Returns how hard the player
 * was hit (0–1) for the camera shake. Cars on a loop's rails or passing overhead are skipped.
 */
export function collideCars(car: PlayerCar, rivals: Rival[]): number {
  let felt = 0;
  const pfx = -Math.sin(car.rotY);
  const pfz = -Math.cos(car.rotY);

  if (car.loop < 0) {
    for (const r of rivals) {
      if (r.loop >= 0 || Math.abs(car.y - r.y) > 1.6) continue;
      if (!findContact(car.x, car.z, pfx, pfz, r.x, r.z, r.dx, r.dz)) continue;
      const { nx, nz, depth } = contact;
      car.x -= nx * depth * 0.5;
      car.z -= nz * depth * 0.5;
      pushRival(r, nx * depth * 0.5, nz * depth * 0.5);

      const rvx = r.dx * r.speed - r.dz * r.sideSpeed;
      const rvz = r.dz * r.speed + r.dx * r.sideSpeed;
      const closing = (car.vx - rvx) * nx + (car.vz - rvz) * nz;
      if (closing <= 0) continue;
      // Decided on the speeds going in: the hit itself evens them out.
      const playerSlower = Math.abs(car.speed) < r.speed;
      const j = ((1 + BOUNCE) * closing) / 2;
      car.vx -= j * nx;
      car.vz -= j * nz;
      car.speed -= j * (nx * pfx + nz * pfz);
      kickRival(r, j * nx, j * nz);
      felt = Math.max(felt, Math.min(closing / 30, 1));

      if (closing > FLIP_ONE) {
        const both = closing > FLIP_BOTH;
        if (both || playerSlower) startTumble(car, rollSide(-nx, -nz, pfx, pfz), closing);
        if (both || !playerSlower) startTumble(r, rollSide(nx, nz, r.dx, r.dz), closing);
      }
    }
  }

  for (let a = 0; a < rivals.length; a++) {
    for (let b = a + 1; b < rivals.length; b++) {
      const ra = rivals[a];
      const rb = rivals[b];
      if (ra.loop >= 0 || rb.loop >= 0 || Math.abs(ra.y - rb.y) > 1.6) continue;
      if (!findContact(ra.x, ra.z, ra.dx, ra.dz, rb.x, rb.z, rb.dx, rb.dz)) continue;
      const { nx, nz, depth } = contact;
      pushRival(ra, -nx * depth * 0.5, -nz * depth * 0.5);
      pushRival(rb, nx * depth * 0.5, nz * depth * 0.5);
      const closing =
        (ra.dx * ra.speed - ra.dz * ra.sideSpeed - (rb.dx * rb.speed - rb.dz * rb.sideSpeed)) * nx +
        (ra.dz * ra.speed + ra.dx * ra.sideSpeed - (rb.dz * rb.speed + rb.dx * rb.sideSpeed)) * nz;
      if (closing <= 0) continue;
      const slower = ra.speed < rb.speed ? ra : rb;
      const j = ((1 + BOUNCE) * closing) / 2;
      kickRival(ra, -j * nx, -j * nz);
      kickRival(rb, j * nx, j * nz);
      if (closing > FLIP_ONE) startTumble(slower, rollSide(nx, nz, slower.dx, slower.dz), closing);
    }
  }
  return felt;
}
