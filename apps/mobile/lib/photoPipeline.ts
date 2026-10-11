// Shared image preparation for garage photo uploads.
// Resizes to ≤1600px on the long edge and re-encodes as JPEG to strip EXIF metadata
// (including GPS) before uploading to Supabase Storage.
import * as ImageManipulator from "expo-image-manipulator";

const MAX_EDGE = 1600;
const OUTPUT_QUALITY = 0.82;

export type PreparedPhoto = { uri: string; mimeType: string };

export async function preparePhotoForUpload(
  localUri: string,
  srcMime: string,
  sourceWidth?: number,
  sourceHeight?: number,
): Promise<PreparedPhoto> {
  const actions: ImageManipulator.Action[] = [];
  const w = sourceWidth ?? 0;
  const h = sourceHeight ?? 0;
  if (w && h && Math.max(w, h) > MAX_EDGE) {
    actions.push(
      w >= h
        ? { resize: { width: MAX_EDGE } }
        : { resize: { height: MAX_EDGE } },
    );
  } else if (!w || !h) {
    // Unknown source size — cap the longest edge via width hint.
    actions.push({ resize: { width: MAX_EDGE } });
  }
  const format =
    srcMime.includes("png")
      ? ImageManipulator.SaveFormat.PNG
      : srcMime.includes("webp")
      ? ImageManipulator.SaveFormat.WEBP
      : ImageManipulator.SaveFormat.JPEG;
  const result = await ImageManipulator.manipulateAsync(localUri, actions, {
    compress: OUTPUT_QUALITY,
    format,
  });
  const mimeType =
    format === ImageManipulator.SaveFormat.PNG
      ? "image/png"
      : format === ImageManipulator.SaveFormat.WEBP
      ? "image/webp"
      : "image/jpeg";
  return { uri: result.uri, mimeType };
}
