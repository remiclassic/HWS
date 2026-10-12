/** Personal bests per track. Device-local — racing is just for fun, nothing syncs. */
import AsyncStorage from "@react-native-async-storage/async-storage";

export type TrackRecord = {
  /** Seconds; 0 when not set yet. */
  bestLap: number;
  bestRace: number;
};

const EMPTY: TrackRecord = { bestLap: 0, bestRace: 0 };
const key = (trackId: string) => `race.record.${trackId}`;

export async function loadTrackRecord(trackId: string): Promise<TrackRecord> {
  try {
    const raw = await AsyncStorage.getItem(key(trackId));
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<TrackRecord>;
    return {
      bestLap: typeof parsed.bestLap === "number" ? parsed.bestLap : 0,
      bestRace: typeof parsed.bestRace === "number" ? parsed.bestRace : 0,
    };
  } catch {
    return EMPTY;
  }
}

/** Folds a finished race into the stored record; reports which marks were beaten. */
export function mergeTrackRecord(
  prev: TrackRecord,
  run: { bestLap: number; raceTime: number },
): { record: TrackRecord; newBestLap: boolean; newBestRace: boolean } {
  const newBestLap = run.bestLap > 0 && (prev.bestLap === 0 || run.bestLap < prev.bestLap);
  const newBestRace = run.raceTime > 0 && (prev.bestRace === 0 || run.raceTime < prev.bestRace);
  return {
    record: {
      bestLap: newBestLap ? run.bestLap : prev.bestLap,
      bestRace: newBestRace ? run.raceTime : prev.bestRace,
    },
    newBestLap,
    newBestRace,
  };
}

export async function saveTrackRecord(trackId: string, record: TrackRecord): Promise<void> {
  try {
    await AsyncStorage.setItem(key(trackId), JSON.stringify(record));
  } catch {}
}
