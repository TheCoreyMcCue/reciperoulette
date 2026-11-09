import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { extractMeta, extractReadableText } from "./html";
import { extractJsonLdRecipe, isCompleteRecipe, parseDuration, parseYield } from "./jsonld";

const fixture = (name: string) => readFileSync(new URL(`../../tests/fixtures/${name}`, import.meta.url), "utf8");
const PAGE = "https://keukenvansaar.example/pompoensoep/";

describe("extractJsonLdRecipe", () => {
  const r = extractJsonLdRecipe(fixture("jsonld-recipe-page.html"), PAGE)!;

  it("finds the Recipe inside @graph", () => {
    expect(r).not.toBeNull();
    expect(isCompleteRecipe(r)).toBe(true);
    expect(r.title).toBe("Romige pompoensoep met gember");
    expect(r.author).toBe("Saar de Vries");
    expect(r.language).toBe("nl");
  });

  it("decodes entities and strips markup", () => {
    expect(r.description).toBe("Een romige pompoensoep met gember & kokosmelk. Perfect voor de herfst!");
    expect(r.rawIngredients).toContain("peper & zout");
  });

  it("maps times, yield, tags and cuisine", () => {
    expect([r.prepTime, r.cookTime, r.totalTime]).toEqual([15, 30, 45]);
    expect(r.servings).toBe(4);
    expect(r.cuisine).toBe("Nederlands");
    expect(r.tags).toEqual(expect.arrayContaining(["pompoen", "vegetarisch", "herfst", "soep"]));
    expect(r.imageUrl).toBe("https://keukenvansaar.example/wp-content/uploads/2026/10/pompoensoep-1x1.jpg");
  });

  it("parses ingredients into structured rows", () => {
    expect(r.ingredients).toHaveLength(8);
    expect(r.ingredients[0]).toMatchObject({ quantity: "1", unit: "kg", item: "flespompoen", note: "geschild en in blokjes" });
    expect(r.ingredients[6]).toMatchObject({ quantity: "1/2", unit: "el", item: "olijfolie", quantityValue: 0.5 });
  });

  it("keeps HowToSection groupings", () => {
    expect(r.steps.map((s) => s.group)).toEqual(["Soep", "Soep", "Soep", "Afmaken"]);
    expect(r.steps[2]!.text).toContain("Pureer glad.");
  });

  it("returns null when there's no Recipe", () => {
    expect(extractJsonLdRecipe(fixture("plain-recipe-page.html"), "https://blog.example/")).toBeNull();
    expect(extractJsonLdRecipe('<script type="application/ld+json">{broken</script>', "https://x.example/")).toBeNull();
  });

  it("tolerates control characters and string instructions", () => {
    const html = `<script type="application/ld+json">{"@type":"Recipe","name":"Tosti","recipeIngredient":["2 sneetjes brood"],"recipeInstructions":"1. Beleg het brood.\n2. Bak in de tosti-ijzer."}</script>`;
    const t = extractJsonLdRecipe(html, "https://x.example/")!;
    expect(t.steps.map((s) => s.text)).toEqual(["Beleg het brood.", "Bak in de tosti-ijzer."]);
  });
});

describe("parseDuration / parseYield", () => {
  it.each([["PT1H30M", 90], ["PT45M", 45], ["P0DT0H20M", 20], ["PT2H", 120], ["PT90M", 90], ["45 min", 45], ["1 uur 15 minuten", 75], ["", null], ["PT0M", null], [null, null]])(
    "duration %s → %s",
    (v, m) => expect(parseDuration(v)).toBe(m),
  );
  it("yield", () => {
    expect(parseYield("4 servings")).toBe(4);
    expect(parseYield(["6"])).toBe(6);
    expect(parseYield("1 loaf")).toBeNull();
    expect(parseYield(8)).toBe(8);
  });
});

describe("html helpers", () => {
  it("extracts og:image as an absolute url", () => {
    const m = extractMeta(fixture("jsonld-recipe-page.html"), PAGE);
    expect(m.image).toBe("https://keukenvansaar.example/wp-content/uploads/2026/10/pompoensoep-1200x800.jpg");
    expect(m.siteName).toBe("Keuken van Saar");
    expect(m.canonical).toBe(PAGE);
  });

  it("extracts readable text without chrome", () => {
    const text = extractReadableText(fixture("plain-recipe-page.html"));
    expect(text).toContain("Bananenbrood zonder suiker");
    expect(text).toContain("• 3 rijpe bananen");
    expect(text).toContain("180°C");
    expect(text).not.toMatch(/Menu|Footer links|color:red|comment/);
  });
});
