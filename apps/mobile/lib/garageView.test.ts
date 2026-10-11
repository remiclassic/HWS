import { describe, expect, it } from "vitest";
import type { UserCarDto } from "@hotwheels/shared";
import {
  DEFAULT_GARAGE_FILTERS,
  filterGarage,
  garageFiltersAreActive,
  garageStats,
  sortGarage,
} from "./garageView";

let seq = 0;
function row(over: {
  name: string;
  status?: UserCarDto["status"];
  year?: number;
  line?: NonNullable<UserCarDto["car"]>["line_type"];
  hunt?: NonNullable<UserCarDto["car"]>["treasure_hunt_type"];
  added?: string;
  series?: string | null;
}): UserCarDto {
  seq += 1;
  const id = `00000000-0000-4000-8000-${String(seq).padStart(12, "0")}`;
  return {
    id,
    user_id: id,
    car_id: id,
    status: over.status ?? "Owned",
    condition: "Carded",
    quantity: 1,
    notes: null,
    date_added: over.added ?? "2026-01-01T00:00:00+00:00",
    photos: [],
    car: {
      id,
      casting_name: over.name,
      year: over.year ?? 2024,
      series: over.series ?? null,
      line_type: over.line ?? "Mainline",
      treasure_hunt_type: over.hunt ?? "None",
      confidence_score: 1,
      primary_image_url: null,
    },
  };
}

const items = [
  row({ name: "Bone Shaker", year: 2021, added: "2026-03-01T00:00:00+00:00", hunt: "STH" }),
  row({ name: "Twin Mill", status: "Want", year: 2024, added: "2026-01-01T00:00:00+00:00", line: "RLC" }),
  row({ name: "Deora II", status: "Duplicate", year: 2019, added: "2026-02-01T00:00:00+00:00", series: "HW Legends" }),
];

const names = (rows: UserCarDto[]) => rows.map((r) => r.car?.casting_name);

describe("filterGarage", () => {
  it("returns everything with default filters", () => {
    expect(filterGarage(items, DEFAULT_GARAGE_FILTERS)).toHaveLength(3);
    expect(garageFiltersAreActive(DEFAULT_GARAGE_FILTERS)).toBe(false);
  });

  it("filters by status, hunt and line", () => {
    expect(names(filterGarage(items, { ...DEFAULT_GARAGE_FILTERS, status: "Want" }))).toEqual(["Twin Mill"]);
    expect(names(filterGarage(items, { ...DEFAULT_GARAGE_FILTERS, huntsOnly: true }))).toEqual(["Bone Shaker"]);
    expect(names(filterGarage(items, { ...DEFAULT_GARAGE_FILTERS, line: "RLC" }))).toEqual(["Twin Mill"]);
  });

  it("searches casting name, series and year case-insensitively", () => {
    expect(names(filterGarage(items, { ...DEFAULT_GARAGE_FILTERS, q: " bone " }))).toEqual(["Bone Shaker"]);
    expect(names(filterGarage(items, { ...DEFAULT_GARAGE_FILTERS, q: "legends" }))).toEqual(["Deora II"]);
    expect(names(filterGarage(items, { ...DEFAULT_GARAGE_FILTERS, q: "2024" }))).toEqual(["Twin Mill"]);
    expect(garageFiltersAreActive({ ...DEFAULT_GARAGE_FILTERS, q: "x" })).toBe(true);
  });
});

describe("sortGarage", () => {
  it("sorts by recency, name and year without mutating the input", () => {
    const before = names(items);
    expect(names(sortGarage(items, "recent"))).toEqual(["Bone Shaker", "Deora II", "Twin Mill"]);
    expect(names(sortGarage(items, "name"))).toEqual(["Bone Shaker", "Deora II", "Twin Mill"]);
    expect(names(sortGarage(items, "year"))).toEqual(["Twin Mill", "Bone Shaker", "Deora II"]);
    expect(names(items)).toEqual(before);
  });
});

describe("garageStats", () => {
  it("counts statuses, hunts and distinct lines", () => {
    expect(garageStats(items)).toEqual({
      total: 3,
      byStatus: { Owned: 1, Want: 1, Duplicate: 1 },
      hunts: 1,
      lines: ["Mainline", "RLC"],
    });
  });
});
