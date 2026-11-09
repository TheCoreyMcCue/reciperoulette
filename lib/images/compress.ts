"use client";

import { COMPRESSION_STEPS, isHeic, MAX_IMAGE_BYTES, targetSize } from "./sizing";

export type CompressedImage = {
  id: string;
  mediaType: "image/jpeg";
  /** base64 without the data: prefix */
  data: string;
  previewUrl: string;
  bytes: number;
  name: string;
};

async function decode(file: Blob): Promise<ImageBitmap> {
  return createImageBitmap(file, { imageOrientation: "from-image" });
}

async function decodeAny(file: File): Promise<ImageBitmap> {
  try {
    return await decode(file);
  } catch (err) {
    // Safari decodes HEIC natively; other browsers need a converter (loaded only when needed).
    if (!isHeic(file)) throw err;
    const { default: heic2any } = await import("heic2any");
    const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
    return decode(Array.isArray(converted) ? converted[0]! : converted);
  }
}

function toJpeg(bitmap: ImageBitmap, maxEdge: number, quality: number): Promise<Blob> {
  const { width, height } = targetSize(bitmap.width, bitmap.height, maxEdge);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.fillStyle = "#fff"; // flatten transparent PNG screenshots
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't encode image"))), "image/jpeg", quality),
  );
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

/** Resizes to ~1600px on the long edge and re-encodes as JPEG under the size budget. */
export async function compressImage(file: File): Promise<CompressedImage> {
  const bitmap = await decodeAny(file);
  try {
    let blob: Blob | null = null;
    for (const step of COMPRESSION_STEPS) {
      blob = await toJpeg(bitmap, step.maxEdge, step.quality);
      if (blob.size <= MAX_IMAGE_BYTES) break;
    }
    const final = blob!;
    return {
      id: crypto.randomUUID(),
      mediaType: "image/jpeg",
      data: await blobToBase64(final),
      previewUrl: URL.createObjectURL(final),
      bytes: final.size,
      name: file.name || "pasted image",
    };
  } finally {
    bitmap.close();
  }
}
