import { describe, expect, it, vi } from "vitest";

vi.mock("expo-image-manipulator", () => {
  const manipulateAsync = vi.fn(async (uri: string) => ({ uri: `${uri}.processed`, width: 1600, height: 1200 }));
  return {
    manipulateAsync,
    SaveFormat: { JPEG: "jpeg", PNG: "png", WEBP: "webp" },
  };
});

import * as ImageManipulator from "expo-image-manipulator";
import { preparePhotoForUpload } from "../lib/photoPipeline";

describe("preparePhotoForUpload", () => {
  it("resizes landscape images on width", async () => {
    await preparePhotoForUpload("file:///a.jpg", "image/jpeg", 4000, 3000);
    const call = (ImageManipulator.manipulateAsync as ReturnType<typeof vi.fn>).mock.calls.at(-1);
    expect(call?.[1]).toEqual([{ resize: { width: 1600 } }]);
  });

  it("resizes portrait images on height", async () => {
    await preparePhotoForUpload("file:///b.jpg", "image/jpeg", 3000, 4000);
    const call = (ImageManipulator.manipulateAsync as ReturnType<typeof vi.fn>).mock.calls.at(-1);
    expect(call?.[1]).toEqual([{ resize: { height: 1600 } }]);
  });

  it("outputs JPEG for unknown mime (EXIF-stripping default)", async () => {
    const res = await preparePhotoForUpload("file:///c.heic", "image/heic", 800, 600);
    expect(res.mimeType).toBe("image/jpeg");
  });

  it("preserves PNG and WebP when input is those", async () => {
    const png = await preparePhotoForUpload("file:///d.png", "image/png", 800, 600);
    expect(png.mimeType).toBe("image/png");
    const webp = await preparePhotoForUpload("file:///e.webp", "image/webp", 800, 600);
    expect(webp.mimeType).toBe("image/webp");
  });
});
