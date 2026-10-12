import { describe, expect, it } from "vitest";
import { formatRaceTime, houseRival, ordinal, racerFromCar, rivalPace, statBars } from "./carStats";
import {
  collideCars,
  isWrongWay,
  newLapState,
  newPlayerCar,
  newRival,
  playerPlace,
  playerTravelled,
  resetToSafePose,
  stepPlayerCar,
  stepRival,
  updateLap,
  type DriveInput,
  type PlayerCar,
  type Rival,
} from "./physics";
import { mergeTrackRecord } from "./records";
import {
  CHECKPOINT_S,
  FINISH_S,
  JUMPS,
  JUMP_HEIGHT,
  JUMP_LENGTH,
  LOOPS,
  LOOP_APPROACH,
  LOOP_MIN_SPEED,
  LOOP_RADIUS,
  LOOP_SHIFT,
  ROAD_HALF,
  TRACK_LENGTH,
  WAYPOINTS,
  gridSlot,
  headingFor,
  lapDistance,
  locateOnTrack,
  loopPose,
  newTrackLocation,
  pointAtDistance,
  rampHeight,
} from "./track";

const DT = 1 / 60;
const LAPS = 3;
const SPEC = houseRival(0).spec;
const DRIVE: DriveInput = { throttle: true, reverse: false, steer: 0 };

function car(id: string, hunt: "None" | "TH" | "STH" = "None") {
  return racerFromCar({ id, casting_name: `Car ${id}`, treasure_hunt_type: hunt });
}

/** A car on the centerline at lap distance `s` (plus `lane` to the right), rolling at `speed`. */
function carAt(s: number, speed = 0, lane = 0): PlayerCar {
  const p = pointAtDistance(s, newTrackLocation());
  const c = newPlayerCar(p.cx - p.dz * lane, p.cz + p.dx * lane, headingFor(p.dx, p.dz));
  c.speed = speed;
  c.vx = p.dx * speed;
  c.vz = p.dz * speed;
  return c;
}

/** A plain stretch of the start straight, clear of the grid and the first jump. */
const OPEN_ROAD = FINISH_S + 6;

/** Stand-in for a player: steer at a point a little way down the centerline. */
function autopilot(c: PlayerCar): DriveInput {
  const aim = pointAtDistance(c.loc.s + 14 + Math.abs(c.speed) * 0.5, newTrackLocation());
  const want = Math.atan2(-(aim.cx - c.x), -(aim.cz - c.z));
  let turn = want - c.rotY;
  while (turn > Math.PI) turn -= Math.PI * 2;
  while (turn < -Math.PI) turn += Math.PI * 2;
  // Digital thumbs, like the touch controls.
  return { throttle: true, reverse: false, steer: turn > 0.06 ? -1 : turn < -0.06 ? 1 : 0 };
}

describe("track", () => {
  it("is a long closed loop with timing lines in driving order", () => {
    expect(WAYPOINTS.length).toBeGreaterThan(150);
    expect(TRACK_LENGTH).toBeGreaterThan(1800);
    const order = CHECKPOINT_S.map(lapDistance);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it("round-trips distance ↔ position", () => {
    const out = newTrackLocation();
    for (const s of [0, 123.4, TRACK_LENGTH / 2, TRACK_LENGTH - 1]) {
      const p = pointAtDistance(s, newTrackLocation());
      const back = locateOnTrack(p.cx, p.cz, out);
      expect(back.dist).toBeLessThan(0.01);
      expect(Math.abs(back.s - s)).toBeLessThan(0.05);
    }
  });

  it("puts the grid on the road, behind the line", () => {
    for (let slot = 0; slot < 4; slot++) {
      const g = gridSlot(slot);
      expect(locateOnTrack(g.x, g.z, newTrackLocation()).dist).toBeLessThan(ROAD_HALF - 3);
      expect(lapDistance(g.s)).toBeGreaterThan(TRACK_LENGTH - 60);
    }
  });

  it("stands every stunt on a straight, clear of the others", () => {
    const from = newTrackLocation();
    const to = newTrackLocation();
    const straight = (a: number, b: number) => {
      pointAtDistance(a, from);
      pointAtDistance(b, to);
      return from.dx * to.dx + from.dz * to.dz;
    };
    expect(LOOPS).toHaveLength(3);
    expect(JUMPS).toHaveLength(2);
    // Run-in to the far side of the circle, and ramp to a generous landing zone.
    for (const loop of LOOPS) expect(straight(loop.entryS, loop.s + LOOP_RADIUS)).toBeGreaterThan(0.995);
    for (const jump of JUMPS) expect(straight(jump.s, jump.s + JUMP_LENGTH + 70)).toBeGreaterThan(0.995);
    for (const jump of JUMPS) {
      for (const loop of LOOPS) {
        const gap = lapDistance(loop.entryS) - lapDistance(jump.s);
        expect(gap < 0 || gap > JUMP_LENGTH + 70).toBe(true);
      }
    }
  });
});

describe("car physics", () => {
  it("accelerates through the gears toward top speed", () => {
    const c = carAt(OPEN_ROAD);
    const start = lapDistance(c.loc.s);
    for (let i = 0; i < 60 * 2; i++) stepPlayerCar(c, DRIVE, SPEC, DT);
    expect(c.speed).toBeGreaterThan(15);
    expect(c.speed).toBeLessThanOrEqual(SPEC.topSpeed);
    expect(lapDistance(c.loc.s)).toBeGreaterThan(start + 15);
    expect(c.gear).toBeGreaterThan(0);
  });

  it("flags driving against the flow", () => {
    const c = carAt(OPEN_ROAD);
    c.rotY += Math.PI;
    for (let i = 0; i < 90; i++) stepPlayerCar(c, DRIVE, SPEC, DT);
    expect(isWrongWay(c)).toBe(true);
    expect(isWrongWay(carAt(OPEN_ROAD))).toBe(false);
  });

  it("brakes to a stop, then reverses", () => {
    const c = carAt(OPEN_ROAD);
    for (let i = 0; i < 60; i++) stepPlayerCar(c, DRIVE, SPEC, DT);
    for (let i = 0; i < 150; i++) stepPlayerCar(c, { throttle: false, reverse: true, steer: 0 }, SPEC, DT);
    expect(c.speed).toBeLessThan(0);
  });

  it("is held on the road by the side lip, which costs speed", () => {
    const c = carAt(OPEN_ROAD);
    let hit = 0;
    for (let i = 0; i < 60 * 4; i++) {
      hit = Math.max(hit, stepPlayerCar(c, { throttle: true, reverse: false, steer: 1 }, SPEC, DT));
      expect(c.loc.dist).toBeLessThanOrEqual(ROAD_HALF + 0.001);
    }
    expect(hit).toBeGreaterThan(0);
    resetToSafePose(c);
    expect(c).toMatchObject({ speed: 0, y: 0, tumbling: false, loop: -1 });
    expect(c.loc.dist).toBeLessThan(ROAD_HALF - 1);
  });
});

describe("suspension", () => {
  it("leans out of a corner and settles level on the straight", () => {
    const c = carAt(OPEN_ROAD, 30);
    for (let i = 0; i < 30; i++) stepPlayerCar(c, { throttle: true, reverse: false, steer: -1 }, SPEC, DT);
    // Turning left: the body rolls to the right (negative roll about the nose).
    expect(c.lean).toBeLessThan(-0.05);
    for (let i = 0; i < 120; i++) stepPlayerCar(c, DRIVE, SPEC, DT);
    expect(Math.abs(c.lean)).toBeLessThan(0.01);
  });

  it("squats under power and dives under brakes", () => {
    const c = carAt(OPEN_ROAD, 5);
    let squat = 0;
    for (let i = 0; i < 30; i++) {
      stepPlayerCar(c, DRIVE, SPEC, DT);
      squat = Math.max(squat, c.dive);
    }
    expect(squat).toBeGreaterThan(0.03);
    let dive = 0;
    for (let i = 0; i < 30; i++) {
      stepPlayerCar(c, { throttle: false, reverse: true, steer: 0 }, SPEC, DT);
      dive = Math.min(dive, c.dive);
    }
    expect(dive).toBeLessThan(-0.06);
  });

  it("flies nose-up off the ramp, noses over the arc and bottoms out on landing", () => {
    const c = carAt(JUMPS[0].s - 4, 45);
    let noseUp = 0;
    let noseDown = 0;
    let bottomed = 0;
    for (let i = 0; i < 60 * 1.9; i++) {
      stepPlayerCar(c, DRIVE, SPEC, DT);
      if (c.airborne) {
        noseUp = Math.max(noseUp, c.tilt);
        noseDown = Math.min(noseDown, c.tilt);
      }
      bottomed = Math.min(bottomed, c.heave);
    }
    expect(noseUp).toBeGreaterThan(0.15);
    expect(noseDown).toBeLessThan(-0.15);
    expect(bottomed).toBeLessThan(-0.08);
    // The loop pitch — what the camera follows — never moved.
    expect(c.pitch).toBe(0);
  });
});

describe("jumps", () => {
  it("has a ramp that climbs and then stops dead", () => {
    const { s } = JUMPS[0];
    expect(rampHeight(s - 1)).toBe(0);
    expect(rampHeight(s + JUMP_LENGTH / 2)).toBeCloseTo(JUMP_HEIGHT / 2, 5);
    expect(rampHeight(s + JUMP_LENGTH + 0.1)).toBe(0);
  });

  it("launches a fast car, which flies further than a slow one and lands back on its wheels", () => {
    const flight = (speed: number) => {
      const c = carAt(JUMPS[0].s - 4, speed);
      let peak = 0;
      let airTicks = 0;
      let landedHard = 0;
      // Short enough that the fast car has not reached the next loop's run-in.
      for (let i = 0; i < 60 * 1.9; i++) {
        landedHard = Math.max(landedHard, stepPlayerCar(c, DRIVE, SPEC, DT));
        peak = Math.max(peak, c.y);
        if (c.airborne) airTicks++;
      }
      expect(c).toMatchObject({ y: 0, airborne: false, tumbling: false });
      expect(c.pitch).toBe(0);
      expect(Math.abs(c.tilt)).toBeLessThan(0.05);
      return { peak, air: airTicks * DT, landedHard };
    };
    const fast = flight(45);
    const slow = flight(18);
    expect(fast.peak).toBeGreaterThan(JUMP_HEIGHT + 1);
    expect(fast.air).toBeGreaterThan(0.6);
    expect(fast.air).toBeGreaterThan(slow.air);
    expect(fast.landedHard).toBeGreaterThan(0);
  });

  it("sends rivals off the ramps too", () => {
    const r = newRival(gridSlot(0).s, 5, rivalPace(SPEC, 0));
    let peak = 0;
    for (let t = 0; t < 12; t += DT) {
      stepRival(r, DT, t, LAPS);
      if (r.loop < 0) peak = Math.max(peak, r.y);
    }
    expect(peak).toBeGreaterThan(JUMP_HEIGHT);
  });
});

describe("loop-the-loops", () => {
  const rideOne = (c: PlayerCar) => {
    let top = 0;
    let entered = false;
    for (let i = 0; i < 60 * 12 && !(entered && c.loop < 0); i++) {
      stepPlayerCar(c, DRIVE, SPEC, DT);
      entered ||= c.loop >= 0;
      top = Math.max(top, c.y);
    }
    return { entered, top };
  };

  it.each(LOOPS.map((loop, i) => [i + 1, loop] as const))("loop %i carries a car over the top into the exit lane", (_, loop) => {
    const c = carAt(loop.entryS - 6, 40, -4);
    const { entered, top } = rideOne(c);
    expect(entered).toBe(true);
    expect(top).toBeGreaterThan(LOOP_RADIUS * 1.9);
    expect(c).toMatchObject({ loop: -1, y: 0, pitch: 0 });
    // Set down past the foot, a lane to the right of where the loop took it up.
    const lane = (c.x - loop.cx) * -loop.dz + (c.z - loop.cz) * loop.dx;
    expect(lane).toBeCloseTo(LOOP_SHIFT / 2, 1);
    expect((c.x - loop.cx) * loop.dx + (c.z - loop.cz) * loop.dz).toBeGreaterThan(0);
  });

  it("boosts a slow car so it still makes it round", () => {
    const c = carAt(LOOPS[1].entryS - 6, LOOP_MIN_SPEED - 12);
    expect(rideOne(c).entered).toBe(true);
    expect(c.loop).toBe(-1);
    expect(c.speed).toBeGreaterThanOrEqual(LOOP_MIN_SPEED);
  });

  it("corkscrews from the entry lane to the exit lane", () => {
    const pose = { along: 0, y: 0, pitch: 0, lane: 0 };
    // Arrives on the exit side, is eased across during the run-in…
    expect(loopPose(0, 6, pose)).toMatchObject({ lane: 6, y: 0, along: -LOOP_APPROACH });
    expect(loopPose(LOOP_APPROACH, 6, pose).lane).toBeCloseTo(-LOOP_SHIFT / 2, 5);
    // …is over the middle at the top, and comes down in the exit lane.
    loopPose(LOOP_APPROACH + Math.PI * (LOOP_RADIUS - 0.4), 6, pose);
    expect(pose.lane).toBeCloseTo(0, 5);
    expect(pose.y).toBeCloseTo((LOOP_RADIUS - 0.4) * 2, 5);
    expect(loopPose(1e6, 6, pose).lane).toBeCloseTo(LOOP_SHIFT / 2, 5);
  });

  it("sends rivals round every loop, every lap", () => {
    const r = newRival(gridSlot(0).s, 5, rivalPace(SPEC, 0));
    let loops = 0;
    let was = false;
    for (let t = 0; t < 600 && r.finishTime === 0; t += DT) {
      stepRival(r, DT, t, LAPS);
      if (r.loop >= 0 && !was) loops++;
      was = r.loop >= 0;
    }
    expect(loops).toBe(LAPS * LOOPS.length);
    expect(r.finishTime).toBeGreaterThan(0);
  });
});

describe("crashes", () => {
  /** A rival parked on the centerline `gap` metres ahead of lap distance `s`. */
  const rivalAhead = (s: number, gap: number, speed: number): Rival => {
    const r = newRival(s + gap, 0, 40);
    r.travelled = lapDistance(s + gap);
    r.speed = speed;
    stepRival(r, 1e-6, 0, LAPS);
    r.speed = speed;
    return r;
  };

  it("a gentle nudge shoves both cars apart without flipping anyone", () => {
    const c = carAt(OPEN_ROAD, 30);
    const r = rivalAhead(OPEN_ROAD, 3.6, 26);
    const before = r.speed;
    expect(collideCars(c, [r])).toBeGreaterThan(0);
    expect(c.tumbling || r.tumbling).toBe(false);
    expect(r.speed).toBeGreaterThan(before);
    expect(c.speed).toBeLessThan(30);
  });

  it("ramming a slower car flips it; it rolls, lands and drives on", () => {
    const c = carAt(OPEN_ROAD, 44);
    const r = rivalAhead(OPEN_ROAD, 3.6, 26);
    collideCars(c, [r]);
    expect(r.tumbling).toBe(true);
    expect(c.tumbling).toBe(false);
    let peak = 0;
    let rolled = 0;
    for (let t = 0; t < 6; t += DT) {
      stepRival(r, DT, t, LAPS);
      peak = Math.max(peak, r.y);
      rolled = Math.max(rolled, Math.abs(r.roll));
    }
    expect(peak).toBeGreaterThan(1);
    expect(rolled).toBeGreaterThan(Math.PI);
    expect(r).toMatchObject({ tumbling: false, roll: 0, y: 0 });
    expect(r.speed).toBeGreaterThan(10);
  });

  it("a head-on at racing speed flips the player too, and they recover", () => {
    const c = carAt(OPEN_ROAD, 50);
    const r = rivalAhead(OPEN_ROAD, 3.6, 0);
    expect(collideCars(c, [r])).toBeGreaterThan(0.5);
    expect(c.tumbling && r.tumbling).toBe(true);
    for (let i = 0; i < 60 * 6; i++) stepPlayerCar(c, DRIVE, SPEC, DT);
    expect(c).toMatchObject({ tumbling: false, roll: 0, flip: 0, y: 0 });
    expect(c.speed).toBeGreaterThan(10);
    expect(c.loc.dist).toBeLessThanOrEqual(ROAD_HALF + 0.001);
  });

  it("ignores cars passing overhead", () => {
    const c = carAt(OPEN_ROAD, 50);
    const r = rivalAhead(OPEN_ROAD, 3.6, 0);
    r.y = 5;
    expect(collideCars(c, [r])).toBe(0);
  });
});

describe("race", () => {
  it("a steady driver completes the race, stunts and traffic included", () => {
    const start = gridSlot(3);
    const c = newPlayerCar(start.x, start.z, start.rotY);
    const laps = newLapState();
    const rivals = [0, 1, 2].map((i) => newRival(gridSlot(i).s, gridSlot(i).lane, rivalPace(SPEC, i)));
    expect(playerPlace(laps, c.loc.s, rivals)).toBe(4);

    let time = 0;
    while (time < 400 && laps.finishTime === 0) {
      time += DT;
      const prev = c.loc.s;
      stepPlayerCar(c, autopilot(c), SPEC, DT);
      updateLap(laps, prev, c.loc.s, time, LAPS);
      for (const r of rivals) stepRival(r, DT, time, LAPS);
      collideCars(c, rivals);
    }
    expect(laps.finishTime).toBeGreaterThan(0);
    expect(laps.lap).toBe(LAPS);
    expect(laps.bestLap).toBeGreaterThan(25);
    expect(laps.bestLap).toBeLessThan(90);
    expect(playerTravelled(laps, c.loc.s)).toBe(LAPS * TRACK_LENGTH);
    expect(playerPlace(laps, c.loc.s, rivals)).toBeLessThanOrEqual(2);

    // Rivals get home too, not long after.
    while (time < 600 && rivals.some((r) => r.finishTime === 0)) {
      time += DT;
      for (const r of rivals) stepRival(r, DT, time, LAPS);
    }
    for (const r of rivals) {
      expect(r.finishTime).toBeGreaterThan(0);
      expect(r.finishTime).toBeLessThan(laps.finishTime * 1.5);
    }
  });

  it("only counts a lap when every timing line was crossed in order", () => {
    const laps = newLapState();
    // Roll over the finish without having crossed anything.
    updateLap(laps, FINISH_S - 2, FINISH_S + 2, 5, LAPS);
    expect(laps.lap).toBe(1);
    // Skip the first line: later lines and the finish must not count.
    for (const s of [...CHECKPOINT_S.slice(1), FINISH_S]) updateLap(laps, s - 2, s + 2, 10, LAPS);
    expect(laps).toMatchObject({ lap: 1, nextCheckpoint: 0 });
    // Driving backwards over a line does not count either.
    updateLap(laps, CHECKPOINT_S[0] + 2, CHECKPOINT_S[0] - 2, 11, LAPS);
    expect(laps.nextCheckpoint).toBe(0);
    // A proper lap.
    for (const s of [...CHECKPOINT_S, FINISH_S]) updateLap(laps, s - 2, s + 2, 40, LAPS);
    expect(laps).toMatchObject({ lap: 2, bestLap: 40, nextCheckpoint: 0 });
  });
});

describe("car stats", () => {
  it("is stable per car and stays close to the baseline", () => {
    const a = car("3f0c9c1e-0000-4000-8000-000000000001");
    expect(racerFromCar({ id: a.key, casting_name: a.name, treasure_hunt_type: "None" })).toEqual(a);
    for (let i = 0; i < 50; i++) {
      const { spec } = car(`id-${i}`);
      expect(spec.topSpeed / SPEC.topSpeed).toBeGreaterThan(0.94);
      expect(spec.topSpeed / SPEC.topSpeed).toBeLessThan(1.06);
      for (const v of Object.values(statBars(spec))) {
        expect(v).toBeGreaterThan(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });

  it("makes treasure hunts a touch quicker", () => {
    expect(car("x", "STH").spec.topSpeed).toBeGreaterThan(car("x", "TH").spec.topSpeed);
    expect(car("x", "TH").spec.topSpeed).toBeGreaterThan(car("x").spec.topSpeed);
  });

  it("formats times and places", () => {
    expect(formatRaceTime(0)).toBe("0:00.0");
    expect(formatRaceTime(75.49)).toBe("1:15.4");
    expect([1, 2, 3, 4, 11, 12, 13, 21].map(ordinal)).toEqual(["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st"]);
  });
});

describe("track records", () => {
  it("keeps the faster time and flags new bests", () => {
    const first = mergeTrackRecord({ bestLap: 0, bestRace: 0 }, { bestLap: 9.5, raceTime: 31 });
    expect(first).toEqual({ record: { bestLap: 9.5, bestRace: 31 }, newBestLap: true, newBestRace: true });
    const slower = mergeTrackRecord(first.record, { bestLap: 9.9, raceTime: 30 });
    expect(slower).toEqual({ record: { bestLap: 9.5, bestRace: 30 }, newBestLap: false, newBestRace: true });
  });
});
