import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SocialAdapter, SocialPost } from "./types";

const parseRecipe = vi.fn();
const importFromUrl = vi.fn();
vi.mock("@/lib/ai/parse-recipe", () => ({ parseRecipe }));
vi.mock("../url", () => ({ importFromUrl }));
const { importFromSocial } = await import("./index");

const ctx = { householdId: "h1", userId: "u1" };
const okRecipe = (over = {}) => ({ status: "ok", warnings: [], rawSourceText: "", recipe: { title: "Orzo", imageUrl: "", sourceAuthor: "", ...over } });
const adapter = (post: Partial<SocialPost>): SocialAdapter => ({
  id: "instagram",
  name: "Instagram",
  matches: () => true,
  fetchPost: async () => ({ platform: "Instagram", canonicalUrl: "https://instagram.com/p/x", caption: "", author: "@chef", thumbnailUrl: "https://cdn.example/t.jpg", ...post }),
});
const url = new URL("https://instagram.com/p/x");
const CAPTION = "Orzo 🍋\nIngredients:\n- 250 g orzo\n- 1 onion\n- 2 cloves garlic\n- 750 ml stock\n1. Fry.\n2. Simmer 12 min.\n3. Serve with lots of lemon and parmesan.";

beforeEach(() => {
  parseRecipe.mockReset();
  importFromUrl.mockReset();
});

describe("importFromSocial", () => {
  it("parses a caption that contains the recipe, with social metadata", async () => {
    parseRecipe.mockResolvedValue(okRecipe());
    await importFromSocial(adapter({ caption: CAPTION }), url, false, ctx);
    expect(parseRecipe.mock.calls[0]![0].meta).toEqual({
      sourceType: "social",
      sourceUrl: "https://instagram.com/p/x",
      sourceAuthor: "@chef",
      imageUrl: "https://cdn.example/t.jpg",
    });
    expect(importFromUrl).not.toHaveBeenCalled();
  });

  it("follows a blog link in the caption and keeps the author/thumbnail", async () => {
    importFromUrl.mockResolvedValue(okRecipe());
    const r = await importFromSocial(adapter({ caption: "Soooo good. Full recipe: https://blog.example/orzo" }), url, false, ctx);
    expect(importFromUrl).toHaveBeenCalledWith("https://blog.example/orzo", false, ctx, 1);
    expect(r).toMatchObject({ status: "ok", note: expect.stringMatching(/link in the caption/), recipe: { sourceAuthor: "@chef", imageUrl: "https://cdn.example/t.jpg" } });
  });

  it("uses a direct recipe link first (Pinterest)", async () => {
    importFromUrl.mockResolvedValue(okRecipe({ imageUrl: "https://blog.example/hero.jpg" }));
    const r = await importFromSocial(adapter({ recipeUrl: "https://blog.example/soup", caption: CAPTION }), url, false, ctx);
    expect(parseRecipe).not.toHaveBeenCalled();
    expect(r).toMatchObject({ recipe: { imageUrl: "https://blog.example/hero.jpg" } });
  });

  it("explains 'recipe in bio' without calling the AI", async () => {
    const r = await importFromSocial(adapter({ caption: "Best pasta ever 😍 Recipe in bio!" }), url, false, ctx);
    expect(r).toMatchObject({ status: "error", suggestion: "photo" });
    expect(r.status === "error" && r.message).toMatch(/bio/);
    expect(parseRecipe).not.toHaveBeenCalled();
  });

  it("suggests a screenshot when the caption is unavailable", async () => {
    const r = await importFromSocial(adapter({ caption: "" }), url, false, ctx);
    expect(r).toMatchObject({ status: "error", suggestion: "photo" });
    expect(r.status === "error" && r.message).toMatch(/screenshot/);
  });

  it("survives an adapter crash", async () => {
    const broken: SocialAdapter = { ...adapter({}), fetchPost: async () => { throw new Error("boom"); } };
    expect((await importFromSocial(broken, url, false, ctx)).status).toBe("error");
  });
});
