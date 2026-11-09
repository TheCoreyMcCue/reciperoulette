import { describe, expect, it } from "vitest";
import { effectiveTotalTime, RecipeInputSchema } from "./schema";

describe("RecipeInputSchema", () => {
  it("fills defaults for a minimal recipe", () => {
    const r = RecipeInputSchema.parse({ title: "  Toast " });
    expect(r.title).toBe("Toast");
    expect(r.ingredients).toEqual([]);
    expect(r.servings).toBeNull();
    expect(r.sourceType).toBe("manual");
  });

  it("normalises and de-duplicates tags", () => {
    const r = RecipeInputSchema.parse({ title: "x", tags: ["Vegan", "vegan ", "Quick"] });
    expect(r.tags).toEqual(["vegan", "quick"]);
  });

  it("rejects non-http image urls", () => {
    expect(RecipeInputSchema.safeParse({ title: "x", imageUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(RecipeInputSchema.safeParse({ title: "x", imageUrl: "file:///etc/passwd" }).success).toBe(false);
  });

  it("requires a title", () => {
    expect(RecipeInputSchema.safeParse({ title: " " }).success).toBe(false);
  });
});

describe("effectiveTotalTime", () => {
  it("prefers totalTime, else prep + cook", () => {
    expect(effectiveTotalTime({ totalTime: 50, prepTime: 10, cookTime: 10 })).toBe(50);
    expect(effectiveTotalTime({ totalTime: null, prepTime: 10, cookTime: null })).toBe(10);
    expect(effectiveTotalTime({ totalTime: null, prepTime: null, cookTime: null })).toBeNull();
  });
});
