/**
 * The 3D race: track, cars, chase camera and the per-frame loop.
 * Ported from velocity-rush (MIT, github.com/AnushAdk04/velocity-rush) — `DesertRun`,
 * `PlayerCar`, `GhostCar` and `ChaseCamera` — onto React Three Fiber's native renderer,
 * then reskinned as orange toy track with loop-the-loops and jump ramps.
 *
 * Everything in here renders inside the R3F <Canvas>, which has its own React root:
 * it talks to the React Native HUD only through the mutable `RaceSession`.
 */
import { useMemo, useRef } from "react";
import { PixelRatio } from "react-native";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CarModel } from "./CarModel";
import { GARAGE_FLOOR_COLOR, GarageSky } from "./GarageSky";
import { rivalPace, type Racer } from "../../lib/race/carStats";
import {
  collideCars,
  isWrongWay,
  newLapState,
  newPlayerCar,
  newRival,
  playerPlace,
  resetToSafePose,
  stepPlayerCar,
  stepRival,
  updateLap,
} from "../../lib/race/physics";
import {
  FINISH_POINT,
  JUMPS,
  JUMP_HEIGHT,
  JUMP_LENGTH,
  LOOPS,
  LOOP_APPROACH,
  LOOP_RADIUS,
  LOOP_SHIFT,
  LOOP_WIDTH,
  ROAD_HALF,
  ROAD_WIDTH,
  WAYPOINTS,
  gridSlot,
  headingFor,
  locateOnTrack,
  newTrackLocation,
  type JumpStunt,
  type LoopStunt,
} from "../../lib/race/track";

/** Shared, mutable state between the scene (writes) and the HUD / touch controls (read / write). */
export type RaceSession = {
  /** False during the countdown and after leaving; cars hold still. */
  running: boolean;
  input: {
    /** −1 left, 0, 1 right — what the thumbs are asking for. */
    steer: number;
    throttle: boolean;
    /** Brakes, then reverses once stopped. */
    brake: boolean;
    resetRequested: boolean;
  };
  hud: {
    lap: number;
    place: number;
    time: number;
    speedKmh: number;
    gear: number;
    wrongWay: boolean;
    bestLap: number;
    finished: boolean;
  };
  /** Ground positions for the minimap; player first. */
  dots: { x: number; z: number }[];
};

export function newRaceSession(racers: number): RaceSession {
  return {
    running: false,
    input: { steer: 0, throttle: false, brake: false, resetRequested: false },
    hud: { lap: 1, place: racers, time: 0, speedKmh: 0, gear: 1, wrongWay: false, bestLap: 0, finished: false },
    dots: Array.from({ length: racers }, () => ({ x: 0, z: 0 })),
  };
}

const CAR_Y = 0.4;
/** Analog feel for digital thumbs: steering eases toward the held side. */
const STEER_RESPONSE = 9;

// ── Track ────────────────────────────────────────────────────────────────────

function lambert(color: string): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({ color });
}

const TRACK_ORANGE = "#FF7A1A";
const TRACK_LIP = "#E0590B";

/** Orange track, raised side lips and lane dashes, all derived from the waypoint loop. */
function buildTrack(): THREE.Object3D[] {
  const n = WAYPOINTS.length;
  const half = ROAD_WIDTH / 2;

  // Road: a quad strip using the smoothed direction at each waypoint.
  const vertices: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i < n; i++) {
    const prev = WAYPOINTS[(i - 1 + n) % n];
    const next = WAYPOINTS[(i + 1) % n];
    const len = Math.hypot(next.x - prev.x, next.z - prev.z) || 1;
    const rx = -(next.z - prev.z) / len;
    const rz = (next.x - prev.x) / len;
    const p = WAYPOINTS[i];
    vertices.push(p.x - rx * half, 0.02, p.z - rz * half, p.x + rx * half, 0.02, p.z + rz * half);
    const a = i * 2;
    const c = ((i + 1) % n) * 2;
    indices.push(a, a + 1, c, a + 1, c + 1, c);
  }
  const roadGeo = new THREE.BufferGeometry();
  roadGeo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  roadGeo.setIndex(indices);
  roadGeo.computeVertexNormals();
  const road = new THREE.Mesh(roadGeo, lambert(TRACK_ORANGE));

  // Edge furniture is instanced: hundreds of pieces, two draw calls.
  const lips = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 1, 1), lambert(TRACK_LIP), n * 2);
  const dashes = new THREE.InstancedMesh(new THREE.BoxGeometry(0.35, 0.02, 1), lambert("#FFD2A8"), Math.ceil(n / 2));
  const dummy = new THREE.Object3D();
  // The car's centre stops at ROAD_HALF, so the lip stands a body-width further out.
  const lipOffset = ROAD_HALF + 1.1;

  for (let i = 0; i < n; i++) {
    const a = WAYPOINTS[i];
    const b = WAYPOINTS[(i + 1) % n];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz) || 1;
    const mx = (a.x + b.x) / 2;
    const mz = (a.z + b.z) / 2;
    const rx = -dz / len;
    const rz = dx / len;
    dummy.rotation.set(0, Math.atan2(dx, dz), 0);

    for (let side = 0; side < 2; side++) {
      const sign = side === 0 ? -1 : 1;
      dummy.position.set(mx + rx * lipOffset * sign, 0.5, mz + rz * lipOffset * sign);
      // Overlap neighbours a little so outside corners do not show gaps.
      dummy.scale.set(1, 1, len * 1.25);
      dummy.updateMatrix();
      lips.setMatrixAt(i * 2 + side, dummy.matrix);
    }

    if (i % 2 === 0) {
      dummy.position.set(mx, 0.035, mz);
      dummy.scale.set(1, 1, len * 0.6);
      dummy.updateMatrix();
      dashes.setMatrixAt(i / 2, dummy.matrix);
    }
  }
  lips.instanceMatrix.needsUpdate = true;
  dashes.instanceMatrix.needsUpdate = true;

  return [road, lips, dashes];
}

/** The loop-the-loop: one lane of track corkscrewed into a circle, as in the toy. */
function buildLoop(foot: LoopStunt): THREE.Object3D[] {
  const rx = -foot.dz;
  const rz = foot.dx;
  const half = LOOP_WIDTH / 2;
  const steps = 64;

  /**
   * A band round the loop between two (offset from the lane centre, radius) edges.
   * "dashed" keeps alternate segments only.
   */
  const band = (
    offsetA: number,
    radiusA: number,
    offsetB: number,
    radiusB: number,
    color: string,
    pattern: "solid" | "dashed" = "solid",
  ) => {
    const vertices: number[] = [];
    const indices: number[] = [];
    for (let i = 0; i <= steps; i++) {
      const angle = (i / steps) * Math.PI * 2;
      const centre = -LOOP_SHIFT / 2 + (LOOP_SHIFT * i) / steps;
      for (const [offset, radius] of [
        [offsetA, radiusA],
        [offsetB, radiusB],
      ]) {
        const along = radius * Math.sin(angle);
        const lateral = centre + offset;
        vertices.push(
          foot.cx + rx * lateral + foot.dx * along,
          LOOP_RADIUS - radius * Math.cos(angle) + 0.05,
          foot.cz + rz * lateral + foot.dz * along,
        );
      }
      if (i < steps && (pattern === "solid" || i % 2 === 0)) {
        const a = i * 2;
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide }));
  };

  const surface = LOOP_RADIUS - 0.05;
  return [
    band(-half, LOOP_RADIUS, half, LOOP_RADIUS, TRACK_ORANGE),
    // Ribs and a centre line so the climb reads as a curve, not a wall.
    band(-half, surface, half, surface, "#FF9440", "dashed"),
    band(-0.2, surface - 0.04, 0.2, surface - 0.04, "#FFF1E0", "dashed"),
    // Side lips, standing inward from each edge.
    band(-half, LOOP_RADIUS, -half, LOOP_RADIUS - 0.9, TRACK_LIP),
    band(half, LOOP_RADIUS, half, LOOP_RADIUS - 0.9, TRACK_LIP),
  ];
}

const BASE_BLUE = "#1E6FE0";

function LoopTheLoop({ stunt: foot }: { stunt: LoopStunt }) {
  const parts = useMemo(() => buildLoop(foot), [foot]);
  const rotY = headingFor(foot.dx, foot.dz);
  const post = LOOP_SHIFT / 2 + LOOP_WIDTH / 2 + 1.6;
  // From the right-hand lip at the start of the run-in to the gap between entry and exit.
  const guideRun = LOOP_APPROACH - 18;
  const guideLength = Math.hypot(guideRun, ROAD_HALF + 0.6);
  const guideAngle = Math.atan2(ROAD_HALF + 0.6, guideRun);
  return (
    <>
      {parts.map((object) => (
        <primitive key={object.uuid} object={object} />
      ))}
      {/* Blue clip-on base: plate under the entry and exit, posts and a cross-beam through the middle. */}
      <group position={[foot.cx, 0, foot.cz]} rotation={[0, rotY, 0]}>
        <mesh position={[0, 0.03, 0]}>
          <boxGeometry args={[post * 2 + 2, 0.04, 18]} />
          <meshLambertMaterial color={BASE_BLUE} />
        </mesh>
        {[-post, post].map((x) => (
          <mesh key={x} position={[x, LOOP_RADIUS / 2, 0]}>
            <boxGeometry args={[1.2, LOOP_RADIUS, 1.2]} />
            <meshLambertMaterial color={BASE_BLUE} />
          </mesh>
        ))}
        <mesh position={[0, LOOP_RADIUS, 0]}>
          <boxGeometry args={[post * 2 + 1.2, 1, 1]} />
          <meshLambertMaterial color={BASE_BLUE} />
        </mesh>
        {/* Guide rail sweeping traffic off the exit side and into the entry lane (group +x is left of travel). */}
        <mesh position={[-(ROAD_HALF + 0.6) / 2, 0.6, LOOP_APPROACH / 2 + 9]} rotation={[0, guideAngle, 0]}>
          <boxGeometry args={[0.5, 1.2, guideLength]} />
          <meshLambertMaterial color={BASE_BLUE} />
        </mesh>
      </group>
    </>
  );
}

/** Kicker ramp across the whole road: an orange wedge on a blue trestle. */
function JumpRamp({ stunt }: { stunt: JumpStunt }) {
  const width = (ROAD_HALF + 1.1) * 2;
  const run = Math.hypot(JUMP_LENGTH, JUMP_HEIGHT);
  const tilt = Math.atan2(JUMP_HEIGHT, JUMP_LENGTH);
  // Group −z is the direction of travel, so the ramp climbs toward −z.
  return (
    <group position={[stunt.cx, 0, stunt.cz]} rotation={[0, headingFor(stunt.dx, stunt.dz), 0]}>
      <mesh position={[0, JUMP_HEIGHT / 2, -JUMP_LENGTH / 2]} rotation={[tilt, 0, 0]}>
        <boxGeometry args={[width, 0.12, run]} />
        <meshLambertMaterial color={TRACK_ORANGE} />
      </mesh>
      {/* Lane arrows up the face */}
      {[-6, 0, 6].map((x) => (
        <mesh key={x} position={[x, JUMP_HEIGHT / 2 + 0.08, -JUMP_LENGTH / 2]} rotation={[tilt, 0, 0]}>
          <boxGeometry args={[0.5, 0.02, run * 0.7]} />
          <meshLambertMaterial color="#FFF1E0" />
        </mesh>
      ))}
      {[-width / 2, width / 2].map((x) => (
        <mesh key={x} position={[x, JUMP_HEIGHT / 2 + 0.45, -JUMP_LENGTH / 2]} rotation={[tilt, 0, 0]}>
          <boxGeometry args={[0.5, 1, run]} />
          <meshLambertMaterial color={TRACK_LIP} />
        </mesh>
      ))}
      {/* Trestle under the lip */}
      <mesh position={[0, JUMP_HEIGHT / 2 - 0.1, -JUMP_LENGTH + 0.4]}>
        <boxGeometry args={[width, JUMP_HEIGHT - 0.2, 0.8]} />
        <meshLambertMaterial color={BASE_BLUE} />
      </mesh>
      {[-width / 2 + 0.5, width / 2 - 0.5].map((x) => (
        <mesh key={x} position={[x, JUMP_HEIGHT / 4, -JUMP_LENGTH / 2]}>
          <boxGeometry args={[0.8, JUMP_HEIGHT / 2, 0.8]} />
          <meshLambertMaterial color={BASE_BLUE} />
        </mesh>
      ))}
    </group>
  );
}

/** Arch across the road at `point`, squared up to the direction of travel there. */
function Gate({ point, color, height }: { point: { x: number; z: number }; color: string; height: number }) {
  const rotY = useMemo(() => {
    const loc = locateOnTrack(point.x, point.z, newTrackLocation());
    return headingFor(loc.dx, loc.dz);
  }, [point]);
  const hw = ROAD_HALF + 1.6;
  return (
    <group position={[point.x, 0, point.z]} rotation={[0, rotY, 0]}>
      {[-hw, hw].map((x) => (
        <mesh key={x} position={[x, height / 2, 0]}>
          <cylinderGeometry args={[0.3, 0.3, height, 8]} />
          <meshLambertMaterial color={color} emissive={color} emissiveIntensity={0.4} />
        </mesh>
      ))}
      <mesh position={[0, height + 0.2, 0]}>
        <boxGeometry args={[hw * 2 + 0.6, 0.4, 0.4]} />
        <meshLambertMaterial color={color} emissive={color} emissiveIntensity={0.6} />
      </mesh>
    </group>
  );
}

function FinishChecks() {
  const mesh = useMemo(() => {
    const cols = 8;
    const rows = 2;
    const w = ROAD_WIDTH / cols;
    const checks = new THREE.InstancedMesh(new THREE.BoxGeometry(w, 0.02, 1.5), lambert("#ffffff"), cols * rows);
    const dummy = new THREE.Object3D();
    const black = new THREE.Color("#111111");
    const white = new THREE.Color("#ffffff");
    for (let col = 0; col < cols; col++) {
      for (let row = 0; row < rows; row++) {
        dummy.position.set(-ROAD_WIDTH / 2 + col * w + w / 2, 0.04, row * 1.5 - 0.75);
        dummy.updateMatrix();
        checks.setMatrixAt(col * rows + row, dummy.matrix);
        checks.setColorAt(col * rows + row, (col + row) % 2 === 0 ? white : black);
      }
    }
    return checks;
  }, []);
  // The start straight runs along z, so the line needs no rotation.
  return <primitive object={mesh} position={[FINISH_POINT.x, 0, FINISH_POINT.z]} />;
}

function Circuit() {
  const track = useMemo(buildTrack, []);
  return (
    <>
      <ambientLight intensity={1.5} />
      <directionalLight position={[50, 80, 50]} intensity={2} />

      {/* The garage panorama is both backdrop and floor: its floor is flattened onto y = 0. */}
      <GarageSky />

      {track.map((object) => (
        <primitive key={object.uuid} object={object} />
      ))}
      {LOOPS.map((stunt) => (
        <LoopTheLoop key={stunt.s} stunt={stunt} />
      ))}
      {JUMPS.map((stunt) => (
        <JumpRamp key={stunt.s} stunt={stunt} />
      ))}
      <FinishChecks />
      <Gate point={FINISH_POINT} color="#ffd60a" height={7} />
    </>
  );
}

// ── Race loop ────────────────────────────────────────────────────────────────

type RaceProps = {
  session: RaceSession;
  /** Player first, then rivals in grid order (pole first). */
  racers: Racer[];
  laps: number;
};

function Race({ session, racers, laps }: RaceProps) {
  const playerRef = useRef<THREE.Group>(null);
  const wheelsRef = useRef<THREE.Group>(null);
  const rivalRefs = useRef<(THREE.Group | null)[]>([]);

  // The player starts at the back of the grid and has to come through the field.
  const sim = useMemo(() => {
    const rivalCount = racers.length - 1;
    const start = gridSlot(rivalCount);
    return {
      car: newPlayerCar(start.x, start.z, start.rotY),
      lap: newLapState(),
      rivals: racers.slice(1).map((r, i) => {
        const slot = gridSlot(i);
        return newRival(slot.s, slot.lane, rivalPace(r.spec, i));
      }),
      time: 0,
      steer: 0,
      shake: 0,
      camera: new THREE.Vector3(),
      lookAt: new THREE.Vector3(),
      cameraReady: false,
      /** Camera heading: trails `car.rotY`. */
      camYaw: 0,
      /** Smoothed speed ratio driving the pull-back and FOV kick. */
      zoom: 0,
      /** 0 on the road, 1 while on the loop's rails. */
      loopEase: 0,
      camRight: new THREE.Vector3(),
      camUp: new THREE.Vector3(),
      camBack: new THREE.Vector3(),
      camBasis: new THREE.Matrix4(),
    };
  }, [racers]);

  // Camera rig, in the car's frame (its origin is at axle height, CAR_Y above the road).
  const CAMERA_FOV = 76;
  const CAMERA_BACK = 6.2;
  const CAMERA_UP = 2.2;
  const CAMERA_LOOK_AHEAD = 6;
  const CAMERA_LOOK_UP = 0.6;

  useFrame(({ camera }, delta) => {
    // Clamp so a dropped frame cannot push a car through the barrier.
    const dt = Math.min(delta, 0.05);
    const { car, lap, rivals } = sim;
    const spec = racers[0].spec;

    if (session.running) {
      sim.time += dt;
      if (session.input.resetRequested) {
        session.input.resetRequested = false;
        resetToSafePose(car);
      }

      const finished = lap.finishTime > 0;
      // After the flag the car coasts to a stop on its own.
      const steerTarget = finished ? 0 : session.input.steer;
      sim.steer += (steerTarget - sim.steer) * Math.min(1, dt * STEER_RESPONSE);
      const prevS = car.loc.s;
      const impact = stepPlayerCar(
        car,
        {
          throttle: !finished && session.input.throttle && !session.input.brake,
          reverse: !finished && session.input.brake,
          steer: sim.steer,
        },
        spec,
        dt,
      );
      updateLap(lap, prevS, car.loc.s, sim.time, laps);
      for (const r of rivals) stepRival(r, dt, sim.time, laps);
      const hit = Math.max(impact, collideCars(car, rivals));
      if (hit > 0.05) sim.shake = Math.max(sim.shake, hit);
      if (impact > 0.05) sim.shake = Math.max(sim.shake, impact * Math.min(Math.abs(car.speed) / 20 + 0.3, 1));

      const hud = session.hud;
      hud.lap = lap.lap;
      hud.place = playerPlace(lap, car.loc.s, rivals);
      hud.time = finished ? lap.finishTime : sim.time;
      hud.speedKmh = Math.abs(car.speed) * 3.6;
      hud.gear = car.gear + 1;
      hud.wrongWay = !finished && isWrongWay(car);
      hud.bestLap = lap.bestLap;
      hud.finished = finished;
    }

    // Scene graph
    const player = playerRef.current;
    if (player) {
      player.position.set(car.x, CAR_Y + car.y + car.heave, car.z);
      // Yaw first, then pitch about the car's own axle line (nose up through the loop).
      player.rotation.order = "YXZ";
      player.rotation.y = car.rotY;
      // Loop pitch + ramp/air attitude + suspension dive + crash spin.
      player.rotation.x = car.pitch + car.tilt + car.dive + car.flip;
      player.rotation.z = car.roll + car.lean;
    }
    const wheels = wheelsRef.current;
    if (wheels) {
      const spin = (car.speed / 0.35) * dt;
      for (const wheel of wheels.children) wheel.rotation.x -= spin;
    }
    session.dots[0].x = car.x;
    session.dots[0].z = car.z;
    rivals.forEach((r, i) => {
      const node = rivalRefs.current[i];
      if (node) {
        node.position.set(r.x, CAR_Y + r.y + r.heave, r.z);
        node.rotation.order = "YXZ";
        node.rotation.y = r.rotY;
        node.rotation.x = r.pitch + r.tilt + r.dive + r.flip;
        node.rotation.z = r.roll + r.lean;
      }
      session.dots[i + 1].x = r.x;
      session.dots[i + 1].z = r.z;
    });

    // Chase camera: bolted to the car's own frame (yaw + loop pitch) so it rides the loop too.
    // Only the heading lags, which lets the car swing on screen without the camera falling behind.
    const speedRatio = Math.min(Math.abs(car.speed) / spec.topSpeed, 1);
    if (!sim.cameraReady) {
      sim.camYaw = car.rotY;
      sim.zoom = speedRatio;
      sim.loopEase = car.loop >= 0 ? 1 : 0;
      sim.cameraReady = true;
    } else {
      // Per-frame lerp factors at 60 Hz; same feel at any frame rate.
      // Shortest way round: the heading is unbounded and snaps onto the loop's line at the run-in.
      let turn = car.rotY - sim.camYaw;
      turn -= Math.round(turn / (Math.PI * 2)) * Math.PI * 2;
      sim.camYaw += turn * (1 - Math.pow(1 - 0.11, dt * 60));
      sim.zoom += (speedRatio - sim.zoom) * (1 - Math.pow(1 - 0.05, dt * 60));
      // Eases in over the run-in and back out after the landing.
      sim.loopEase += ((car.loop >= 0 ? 1 : 0) - sim.loopEase) * (1 - Math.pow(1 - 0.07, dt * 60));
    }
    const sinYaw = Math.sin(sim.camYaw);
    const cosYaw = Math.cos(sim.camYaw);
    const sinPitch = Math.sin(car.pitch);
    const cosPitch = Math.cos(car.pitch);
    // Car basis from sines and cosines only: nothing to flip at pitch 0 <-> 2π or when vertical.
    const fx = -cosPitch * sinYaw;
    const fy = sinPitch;
    const fz = -cosPitch * cosYaw;
    const ux = sinPitch * sinYaw;
    const uy = cosPitch;
    const uz = sinPitch * cosYaw;
    // Pulls back a little with speed; tucks in inside the loop to stay clear of the ribbon.
    const back = CAMERA_BACK * (1 + sim.zoom * 0.1) * (1 - sim.loopEase * 0.2);
    // On the road it looks down at the tarmac ahead; in the loop, level along the car's nose.
    const lookUp = CAMERA_LOOK_UP + (CAMERA_UP - CAMERA_LOOK_UP) * sim.loopEase;
    const originY = CAR_Y + car.y;
    sim.camera.set(
      car.x - fx * back + ux * CAMERA_UP,
      originY - fy * back + uy * CAMERA_UP,
      car.z - fz * back + uz * CAMERA_UP,
    );
    sim.lookAt.set(
      car.x + fx * CAMERA_LOOK_AHEAD + ux * lookUp,
      originY + fy * CAMERA_LOOK_AHEAD + uy * lookUp,
      car.z + fz * CAMERA_LOOK_AHEAD + uz * lookUp,
    );
    // Orientation straight from the basis: the axle line is always level, so no world-up lookAt.
    sim.camRight.set(cosYaw, 0, -sinYaw);
    sim.camBack.subVectors(sim.camera, sim.lookAt).normalize();
    sim.camUp.crossVectors(sim.camBack, sim.camRight);
    camera.position.copy(sim.camera);
    camera.quaternion.setFromRotationMatrix(sim.camBasis.makeBasis(sim.camRight, sim.camUp, sim.camBack));
    // Follows the car over the top; back to (0, 1, 0) once the pitch is.
    camera.up.set(ux, uy, uz);
    if (camera instanceof THREE.PerspectiveCamera) {
      const fov = CAMERA_FOV + sim.zoom * 6;
      if (Math.abs(fov - camera.fov) > 0.02) {
        camera.fov = fov;
        camera.updateProjectionMatrix();
      }
    }
    if (sim.shake > 0.01) {
      // Across and up the screen, whichever way up the camera is.
      camera.position.addScaledVector(sim.camRight, (Math.random() - 0.5) * sim.shake * 0.3);
      camera.position.addScaledVector(sim.camUp, (Math.random() - 0.5) * sim.shake * 0.15);
      sim.shake = Math.max(0, sim.shake - dt * 3);
    }
  });

  return (
    <>
      <group ref={playerRef} position={[sim.car.x, CAR_Y, sim.car.z]} rotation={[0, sim.car.rotY, 0]}>
        <CarModel look={racers[0].look} wheels={wheelsRef} />
      </group>
      {sim.rivals.map((r, i) => (
        <group
          key={racers[i + 1].key}
          ref={(node) => {
            rivalRefs.current[i] = node;
          }}
          position={[r.x, CAR_Y, r.z]}
          rotation={[0, r.rotY, 0]}
        >
          <CarModel look={racers[i + 1].look} />
        </group>
      ))}
    </>
  );
}

export function RaceScene(props: RaceProps) {
  return (
    <Canvas
      // 3× phone screens would triple the fill cost for little visible gain.
      dpr={Math.min(PixelRatio.get(), 2)}
      camera={{ fov: 76, near: 0.5, far: 1400, position: [0, 6, 40] }}
      gl={{ antialias: false, powerPreference: "high-performance", stencil: false }}
    >
      {/* Shown until the panorama has loaded (or if it fails to). */}
      <color attach="background" args={[GARAGE_FLOOR_COLOR]} />
      <Circuit />
      <Race {...props} />
    </Canvas>
  );
}
