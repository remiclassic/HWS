import { mkdir } from "node:fs/promises";
import path from "node:path";

const SUBDIR = "user-car-photos";

export function getUploadRoot(): string {
  return process.env["UPLOAD_DIR"]?.trim() || path.join(process.cwd(), "data", "uploads");
}

export async function ensureUserCarPhotoDir(): Promise<void> {
  await mkdir(path.join(getUploadRoot(), SUBDIR), { recursive: true });
}

export function userCarPhotoDiskPath(filename: string): string {
  return path.join(getUploadRoot(), SUBDIR, filename);
}

export function userCarPhotoPublicPath(filename: string): string {
  return `/uploads/${SUBDIR}/${filename}`;
}
