import { describe, expect, it } from "vitest";
import { interpretShared } from "./shared-input";

describe("interpretShared", () => {
  it("prefers an explicit url", () => {
    expect(interpretShared({ url: "https://www.bbcgoodfood.com/recipes/x" })).toEqual({ kind: "url", url: "https://www.bbcgoodfood.com/recipes/x" });
  });
  it("finds links inside shared text (Instagram/TikTok style)", () => {
    expect(interpretShared({ text: "Check out this reel! https://www.instagram.com/reel/C1abc/?igsh=xyz" })).toEqual({
      kind: "url",
      url: "https://www.instagram.com/reel/C1abc/?igsh=xyz",
    });
    expect(interpretShared({ title: "Pasta", text: "https://vm.tiktok.com/ZGabc/." })).toEqual({ kind: "url", url: "https://vm.tiktok.com/ZGabc/" });
  });
  it("treats long text as a recipe to parse", () => {
    const text = "Pannenkoeken\n" + "250 g bloem, 500 ml melk, 3 eieren. ".repeat(10) + "https://example.com/source";
    expect(interpretShared({ text }).kind).toBe("text");
  });
  it("handles empty input", () => {
    expect(interpretShared({})).toEqual({ kind: "none" });
    expect(interpretShared({ url: "not a link" })).toEqual({ kind: "none" });
  });
});
