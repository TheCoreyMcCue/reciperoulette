import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchPage = vi.fn();
const parseRecipe = vi.fn();
vi.mock("./fetch-page", async (orig) => ({ ...(await orig<typeof import("./fetch-page")>()), fetchPage }));
vi.mock("@/lib/ai/parse-recipe", () => ({ parseRecipe }));

const { importFromUrl } = await import("./url");
const fixture = (n: string) => readFileSync(new URL(`../../tests/fixtures/${n}`, import.meta.url), "utf8");
const ctx = { householdId: "h1", userId: "u1" };
const page = (body: string, status = 200) => ({ url: "https://keukenvansaar.example/pompoensoep/", status, contentType: "text/html; charset=utf-8", body });

beforeEach(() => {
  fetchPage.mockReset();
  parseRecipe.mockReset();
});

describe("importFromUrl", () => {
  it("sends JSON-LD to the AI for clean-up, with og/structured image", async () => {
    fetchPage.mockResolvedValue(page(fixture("jsonld-recipe-page.html")));
    parseRecipe.mockResolvedValue({ status: "ok", recipe: { title: "x" }, warnings: [], rawSourceText: "" });
    await importFromUrl("https://keukenvansaar.example/pompoensoep/", false, ctx);
    const input = parseRecipe.mock.calls[0]![0];
    expect(input.structured.recipeIngredient).toHaveLength(8);
    expect(input.text).toBeUndefined();
    expect(input.meta).toMatchObject({ sourceType: "url", sourceUrl: "https://keukenvansaar.example/pompoensoep/", sourceAuthor: "Saar de Vries" });
    expect(input.meta.imageUrl).toMatch(/pompoensoep-1x1\.jpg$/);
  });

  it("falls back to the structured data when the AI is unavailable", async () => {
    fetchPage.mockResolvedValue(page(fixture("jsonld-recipe-page.html")));
    parseRecipe.mockResolvedValue({ status: "limited", message: "Daily limit reached." });
    const r = await importFromUrl("https://keukenvansaar.example/pompoensoep/", false, ctx);
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    expect(r.recipe.title).toBe("Romige pompoensoep met gember");
    expect(r.recipe.steps).toHaveLength(4);
    expect(r.note).toMatch(/Daily limit/);
  });

  it("uses readable text when there's no structured data", async () => {
    fetchPage.mockResolvedValue({ ...page(fixture("plain-recipe-page.html")), url: "https://blog.example/banaan" });
    parseRecipe.mockResolvedValue({ status: "ok", recipe: {}, warnings: [], rawSourceText: "" });
    await importFromUrl("https://blog.example/banaan", false, ctx);
    const input = parseRecipe.mock.calls[0]![0];
    expect(input.text).toContain("3 rijpe bananen");
    expect(input.meta.imageUrl).toBe("https://blog.example/banana.jpg");
  });

  it("suggests a screenshot when a site blocks us", async () => {
    fetchPage.mockResolvedValue(page("Forbidden", 403));
    const r = await importFromUrl("https://www.ah.nl/allerhande/recept/x", false, ctx);
    expect(r).toMatchObject({ status: "error", suggestion: "photo" });
    expect(parseRecipe).not.toHaveBeenCalled();
  });

  it("rejects unsafe urls before fetching", async () => {
    const r = await importFromUrl("http://169.254.169.254/latest/meta-data", false, ctx);
    expect(r.status).toBe("error");
    expect(fetchPage).not.toHaveBeenCalled();
  });
});
