import { describe, expect, it } from "vitest";
import { isHeic, targetSize } from "./sizing";

describe("targetSize", () => {
  it("scales the long edge down to the max", () => {
    expect(targetSize(4032, 3024)).toEqual({ width: 1600, height: 1200 });
    expect(targetSize(1170, 2532)).toEqual({ width: 739, height: 1600 });
  });
  it("never upscales", () => {
    expect(targetSize(800, 600)).toEqual({ width: 800, height: 600 });
  });
  it("handles degenerate sizes", () => {
    expect(targetSize(0, 100)).toEqual({ width: 0, height: 0 });
  });
});

describe("isHeic", () => {
  it("detects by type or extension", () => {
    expect(isHeic({ type: "image/heic", name: "a" })).toBe(true);
    expect(isHeic({ type: "", name: "IMG_0001.HEIC" })).toBe(true);
    expect(isHeic({ type: "image/jpeg", name: "a.jpg" })).toBe(false);
  });
});
