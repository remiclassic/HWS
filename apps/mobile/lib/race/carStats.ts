/**
 * Turns a catalog car into a racer. The catalog has no performance data, so stats
 * are derived from the car's id: stable per car, mildly different between cars.
 */
import type { CarListItemDto, TreasureHuntType } from "@hotwheels/shared";
import { lookFor, type CarLook } from "./carLooks";
import type { CarSpec } from "./physics";

export type Racer = {
  key: string;
  name: string;
  /** Main body colour — minimap dot and picker sprite. */
  paint: string;
  /** How the 3D model is built. */
  look: CarLook;
  spec: CarSpec;
};

/** velocity-rush's default car ("Desert Hawk"): 198 km/h, with a little extra steering for thumbs. */
const BASE: CarSpec = { topSpeed: 55, acceleration: 12, braking: 28, handling: 1.6, grip: 0.88 };

const PAINTS = [
  "#E8222C",
  "#3B9BFF",
  "#FFD400",
  "#22C55E",
  "#7C4DFF",
  "#FF7A1A",
  "#F472B6",
  "#14B8A6",
  "#F5F8FC",
  "#B9C8D9",
] as const;

const HUNT_BOOST: Record<TreasureHuntType, number> = { None: 1, TH: 1.03, STH: 1.05 };

/** FNV-1a → four independent-ish values in [0, 1). */
function seeds(id: string): [number, number, number, number] {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  const out: number[] = [];
  for (let i = 0; i < 4; i++) {
    h ^= h >>> 15;
    h = Math.imul(h, 0x2c1b3c6d);
    h ^= h >>> 12;
    out.push((h >>> 0) / 0x100000000);
  }
  return out as [number, number, number, number];
}

function spread(seed: number, range: number): number {
  return 1 - range / 2 + seed * range;
}

export function racerFromCar(car: Pick<CarListItemDto, "id" | "casting_name" | "treasure_hunt_type">): Racer {
  const [a, b, c, d] = seeds(car.id);
  const boost = HUNT_BOOST[car.treasure_hunt_type];
  const look = lookFor(car.casting_name, PAINTS[Math.floor(d * PAINTS.length) % PAINTS.length]);
  return {
    key: car.id,
    name: car.casting_name,
    paint: look.paint,
    look,
    spec: {
      topSpeed: BASE.topSpeed * spread(a, 0.1) * boost,
      acceleration: BASE.acceleration * spread(b, 0.24),
      braking: BASE.braking,
      handling: BASE.handling * spread(c, 0.16),
      grip: BASE.grip,
    },
  };
}

/** Stand-in opponent when the garage has too few cars to fill the grid. */
export function houseRival(slot: number): Racer {
  return {
    key: `house-${slot}`,
    name: `Rival ${slot + 1}`,
    paint: "#5C6F86",
    look: { body: "coupe", paint: "#5C6F86" },
    spec: { ...BASE },
  };
}

/** Cruise speed (m/s) of the rival starting in grid `slot`; pole sitter is quickest. */
export function rivalPace(spec: CarSpec, slot: number): number {
  return spec.topSpeed * (0.93 - slot * 0.04);
}

/** 0–1 bar values for the car picker. */
export function statBars(spec: CarSpec): { speed: number; accel: number; handling: number } {
  const norm = (v: number, base: number, range: number) =>
    Math.max(0.08, Math.min(1, (v / base - (1 - range / 2)) / range));
  return {
    speed: norm(spec.topSpeed, BASE.topSpeed * 1.025, 0.15),
    accel: norm(spec.acceleration, BASE.acceleration, 0.24),
    handling: norm(spec.handling, BASE.handling, 0.16),
  };
}

export function formatRaceTime(seconds: number): string {
  const tenths = Math.floor(seconds * 10);
  const m = Math.floor(tenths / 600);
  const s = Math.floor((tenths % 600) / 10);
  return `${m}:${String(s).padStart(2, "0")}.${tenths % 10}`;
}

export function ordinal(n: number): string {
  const suffix = n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th";
  return `${n}${suffix}`;
}
