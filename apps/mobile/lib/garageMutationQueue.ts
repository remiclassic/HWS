import AsyncStorage from "@react-native-async-storage/async-storage";
import type { CreateUserCarBody, PatchUserCarBody } from "@hotwheels/shared";
import {
  addToGarage,
  deleteGarageItem,
  deleteGarageItemPhoto,
  patchGarageItem,
  uploadGarageItemPhoto,
} from "./api";

const STORAGE_KEY = "hotwheels_garage_mutation_queue";

const listeners = new Set<() => void>();

export function subscribeGarageQueue(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emitQueueChanged(): void {
  for (const l of listeners) l();
}

export type GarageQueuedOp =
  | { v: 1; kind: "add"; payload: CreateUserCarBody }
  | { v: 1; kind: "patch"; id: string; body: PatchUserCarBody }
  | { v: 1; kind: "delete"; id: string }
  | { v: 1; kind: "deletePhoto"; garageItemId: string; photoId: string }
  | { v: 1; kind: "uploadPhoto"; garageItemId: string; localUri: string; mimeType: string };

async function readQueue(): Promise<GarageQueuedOp[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as GarageQueuedOp[]) : [];
  } catch {
    return [];
  }
}

async function writeQueue(ops: GarageQueuedOp[]): Promise<void> {
  if (ops.length === 0) await AsyncStorage.removeItem(STORAGE_KEY);
  else await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(ops));
  emitQueueChanged();
}

export async function getGarageQueueLength(): Promise<number> {
  return (await readQueue()).length;
}

export async function enqueueGarageOp(op: GarageQueuedOp): Promise<void> {
  const q = await readQueue();
  q.push(op);
  await writeQueue(q);
}

export function isTransientNetworkError(e: unknown): boolean {
  if (e instanceof TypeError) return true;
  const msg = String(e).toLowerCase();
  return (
    msg.includes("network") ||
    msg.includes("fetch") ||
    msg.includes("internet") ||
    msg.includes("aborted") ||
    msg.includes("timeout") ||
    msg.includes("failed to connect")
  );
}

/**
 * Replay queued garage mutations. Drops an item on non-transient errors so the queue cannot deadlock.
 */
export async function processGarageQueue(): Promise<number> {
  let processed = 0;
  let q = await readQueue();

  while (q.length > 0) {
    const op = q[0];
    try {
      switch (op.kind) {
        case "add":
          await addToGarage(op.payload);
          break;
        case "patch":
          await patchGarageItem(op.id, op.body);
          break;
        case "delete":
          await deleteGarageItem(op.id);
          break;
        case "deletePhoto":
          await deleteGarageItemPhoto(op.garageItemId, op.photoId);
          break;
        case "uploadPhoto":
          await uploadGarageItemPhoto(op.garageItemId, op.localUri, op.mimeType);
          break;
        default:
          break;
      }
      q = q.slice(1);
      await writeQueue(q);
      processed++;
    } catch (e) {
      if (isTransientNetworkError(e)) break;
      q = q.slice(1);
      await writeQueue(q);
    }
  }

  return processed;
}
