import type { LineType, UserCarDto, UserCarStatus } from "@hotwheels/shared";

export type GarageSort = "recent" | "name" | "year";
export type GarageViewMode = "grid" | "list";
export type GarageStatusFilter = UserCarStatus | "all";

export type GarageFilters = {
  q: string;
  status: GarageStatusFilter;
  huntsOnly: boolean;
  line: LineType | "all";
};

export const DEFAULT_GARAGE_FILTERS: GarageFilters = {
  q: "",
  status: "all",
  huntsOnly: false,
  line: "all",
};

export const GARAGE_SORT_LABELS: Record<GarageSort, string> = {
  recent: "Recently added",
  name: "Name (A–Z)",
  year: "Year (newest)",
};

export function garageFiltersAreActive(f: GarageFilters): boolean {
  return f.q.trim() !== "" || f.status !== "all" || f.huntsOnly || f.line !== "all";
}

function isHunt(item: UserCarDto): boolean {
  return item.car != null && item.car.treasure_hunt_type !== "None";
}

export function filterGarage(items: UserCarDto[], f: GarageFilters): UserCarDto[] {
  const needle = f.q.trim().toLowerCase();
  return items.filter((item) => {
    if (f.status !== "all" && item.status !== f.status) return false;
    if (f.huntsOnly && !isHunt(item)) return false;
    if (f.line !== "all" && item.car?.line_type !== f.line) return false;
    if (needle) {
      const haystack = [item.car?.casting_name, item.car?.series, item.car?.year, item.notes]
        .filter((v) => v != null)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });
}

export function sortGarage(items: UserCarDto[], sort: GarageSort): UserCarDto[] {
  const byName = (a: UserCarDto, b: UserCarDto) =>
    (a.car?.casting_name ?? "").localeCompare(b.car?.casting_name ?? "");
  const sorted = [...items];
  if (sort === "name") {
    sorted.sort(byName);
  } else if (sort === "year") {
    sorted.sort((a, b) => (b.car?.year ?? 0) - (a.car?.year ?? 0) || byName(a, b));
  } else {
    sorted.sort((a, b) => Date.parse(b.date_added) - Date.parse(a.date_added) || byName(a, b));
  }
  return sorted;
}

export type GarageStats = {
  total: number;
  byStatus: Record<UserCarStatus, number>;
  hunts: number;
  /** Lines present in the garage, in first-seen order — drives which line chips are offered. */
  lines: LineType[];
};

export function garageStats(items: UserCarDto[]): GarageStats {
  const byStatus: Record<UserCarStatus, number> = { Owned: 0, Want: 0, Duplicate: 0 };
  const lines: LineType[] = [];
  let hunts = 0;
  for (const item of items) {
    byStatus[item.status] += 1;
    if (isHunt(item)) hunts += 1;
    const line = item.car?.line_type;
    if (line && !lines.includes(line)) lines.push(line);
  }
  return { total: items.length, byStatus, hunts, lines };
}
