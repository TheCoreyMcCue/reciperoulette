import { describe, expect, it } from "vitest";
import { aiToRecipeInput } from "./map";
import type { AiRecipe } from "./schema";

const base: AiRecipe = {
  isRecipe: true,
  notRecipeReason: "",
  title: "Erwtensoep",
  description: "",
  servings: 6,
  prepTimeMinutes: null,
  cookTimeMinutes: 90,
  totalTimeMinutes: null,
  ingredients: [
    { quantity: "500", quantityValue: 500, unit: "g", item: "spliterwten", note: "afgespoeld", group: "Voor de soep" },
    { quantity: "", quantityValue: null, unit: "", item: "  ", note: "", group: "" },
  ],
  steps: [{ text: "Breng aan de kook.", group: "" }, { text: "", group: "" }],
  tags: ["Soup", "winter"],
  cuisine: "Dutch",
  language: "NL",
  sourceAuthor: "Oma",
  warnings: [],
};

describe("aiToRecipeInput", () => {
  it("maps fields and drops empty rows", () => {
    const r = aiToRecipeInput(base, { sourceType: "text" });
    expect(r.title).toBe("Erwtensoep");
    expect(r.cookTime).toBe(90);
    expect(r.ingredients).toHaveLength(1);
    expect(r.ingredients[0]!.group).toBe("Voor de soep");
    expect(r.steps).toHaveLength(1);
    expect(r.tags).toEqual(["soup", "winter"]);
    expect(r.language).toBe("nl");
    expect(r.sourceType).toBe("text");
    expect(r.sourceAuthor).toBe("Oma");
  });

  it("is lenient with garbage", () => {
    const r = aiToRecipeInput(
      { title: "", servings: -3, totalTimeMinutes: 1e9, ingredients: "nope" as never, steps: [{ text: "x".repeat(9000), group: "" }] },
      { sourceType: "url", sourceUrl: "not a url", imageUrl: "https://ok.example/img.jpg" },
    );
    expect(r.title).toBe("Untitled recipe");
    expect(r.servings).toBeNull();
    expect(r.totalTime).toBeNull();
    expect(r.ingredients).toEqual([]);
    expect(r.steps[0]!.text).toHaveLength(4000);
    expect(r.sourceUrl).toBe("");
  });

  it("prefers known source metadata", () => {
    const r = aiToRecipeInput(base, { sourceType: "social", sourceAuthor: "@chef", sourceUrl: "https://instagram.com/p/x" });
    expect(r.sourceAuthor).toBe("@chef");
    expect(r.sourceUrl).toBe("https://instagram.com/p/x");
  });
});
