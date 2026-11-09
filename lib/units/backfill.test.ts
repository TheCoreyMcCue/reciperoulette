import { describe, expect, it, vi } from "vitest";
import { IngredientSchema, type Ingredient } from "@/lib/recipes/schema";
import { backfillIngredients } from "./backfill";

const ing = (item: string, extra: Partial<Ingredient> = {}) => IngredientSchema.parse({ quantity: "1", unit: "cup", item, ...extra });

describe("backfillIngredients", () => {
  it("uses the table first and the AI only for the rest", async () => {
    const ai = vi.fn(async (items: string[]) => {
      expect(items).toEqual(["gochujang", "dashi, warm"]);
      return new Map([
        [0, { category: "fat" as const, gramsPerCup: 290 }],
        [1, { category: "liquid" as const, gramsPerCup: null }],
      ]);
    });
    const r = await backfillIngredients([ing("flour"), ing("gochujang"), ing("dashi", { note: "warm" }), ing("eggs", { unit: "" })], { ai });
    expect(r.ingredients.map((i) => [i.item, i.category, i.gramsPerCup])).toEqual([
      ["flour", "dry", 120],
      ["gochujang", "fat", 290],
      ["dashi", "liquid", null],
      ["eggs", "count", null],
    ]);
    expect(r).toMatchObject({ changed: true, fromTable: 2, fromAi: 2, unresolved: 0 });
  });

  it("keeps existing classifications and skips the AI when nothing is missing", async () => {
    const ai = vi.fn();
    const r = await backfillIngredients([ing("flour", { category: "dry", gramsPerCup: 120 }), ing("gochujang", { category: "fat", gramsPerCup: 290 })], { ai });
    expect(r.changed).toBe(false);
    expect(ai).not.toHaveBeenCalled();
  });

  it("lets the table overwrite older AI guesses", async () => {
    const r = await backfillIngredients([ing("sugar", { category: "dry", gramsPerCup: 180 })]);
    expect(r.ingredients[0]).toMatchObject({ gramsPerCup: 200 });
    expect(r.changed).toBe(true);
  });

  it("works without AI and reports what's unresolved", async () => {
    const r = await backfillIngredients([ing("gochujang"), ing("flour")]);
    expect(r).toMatchObject({ fromTable: 1, fromAi: 0, unresolved: 1 });
  });

  it("re-asks the AI with force", async () => {
    const ai = vi.fn(async () => new Map([[0, { category: "fat" as const, gramsPerCup: 300 }]]));
    const r = await backfillIngredients([ing("gochujang", { category: "fat", gramsPerCup: 290 })], { ai, force: true });
    expect(ai).toHaveBeenCalledOnce();
    expect(r.ingredients[0]!.gramsPerCup).toBe(300);
  });
});
