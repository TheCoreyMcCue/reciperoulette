/** Pure helpers for client-side image resizing (kept separate so they're testable). */

export const MAX_EDGE = 1600;
/** Per-image budget after compression; 6 images stay well under Vercel's 4.5 MB body limit (base64 adds ~33%). */
export const MAX_IMAGE_BYTES = 450_000;

export function targetSize(width: number, height: number, maxEdge = MAX_EDGE): { width: number; height: number } {
  if (width <= 0 || height <= 0) return { width: 0, height: 0 };
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

export function isHeic(file: { type: string; name: string }): boolean {
  return /image\/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
}

/** Quality/size steps to try until an image fits the byte budget. */
export const COMPRESSION_STEPS: { maxEdge: number; quality: number }[] = [
  { maxEdge: 1600, quality: 0.82 },
  { maxEdge: 1600, quality: 0.7 },
  { maxEdge: 1400, quality: 0.65 },
  { maxEdge: 1200, quality: 0.6 },
];
