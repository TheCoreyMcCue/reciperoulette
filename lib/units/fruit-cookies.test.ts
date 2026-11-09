import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { IngredientSchema } from "@/lib/recipes/schema";
import { backfillIngredients } from "./backfill";
import { lookupDensity } from "./classify";
import { convertIngredient } from "./convert";
import { convertTemperaturesInText, segmentsToString } from "./temperature";

/** Regression: the real "Fruit Cookies" recipe only converted "1 lb raisins". */
const fixture = JSON.parse(readFileSync(new URL("../../tests/fixtures/fruit-cookies.json", import.meta.url), "utf8")) as {
  ingredients: unknown[];
  steps: string[];
};
// Parsing fills category/gramsPerCup with null, exactly like reading the old item from DynamoDB.
const stored = fixture.ingredients.map((i) => IngredientSchema.parse(i));

const metric = (ings: typeof stored) =>
  Object.fromEntries(ings.map((i) => {
    const d = convertIngredient(i, "metric");
    const extra = d.secondary ? ` (≈ ${d.secondary.quantity} ${d.secondary.unit})` : "";
    return [i.item, `${d.quantity} ${d.unit}`.trim() + extra];
  }));

const EXPECTED = {
  "brown sugar": "440 g",
  lard: "205 g",
  eggs: "3",
  flour: "420 g",
  vanilla: "1 tsp (≈ 5 ml)",
  nuts: "120 g",
  raisins: "450 g",
  cinnamon: "1 tsp (≈ 3 g)",
  cloves: "1/2 tsp (≈ 1 g)",
  "baking powder": "1 tsp (≈ 4 g)",
  salt: "1 tsp (≈ 6 g)",
  "baking soda": "1 tsp (≈ 6 g)",
};

describe("Fruit Cookies regression", () => {
  it("is unclassified as stored", () => {
    expect(stored.every((i) => i.category === null && i.gramsPerCup === null)).toBe(true);
  });

  it("converts unclassified ingredients via the display-time table fallback", () => {
    expect(metric(stored)).toEqual(EXPECTED);
  });

  it("classifies every ingredient from the table in the backfill (no AI needed)", async () => {
    const r = await backfillIngredients(stored);
    expect(r.unresolved).toBe(0);
    expect(r.fromTable).toBe(12);
    expect(r.ingredients.map((i) => [i.item, i.category, i.gramsPerCup])).toEqual([
      ["brown sugar", "dry", 220],
      ["lard", "fat", 205],
      ["eggs", "count", null],
      ["flour", "dry", 120],
      ["vanilla", "liquid", null],
      ["nuts", "dry", 120],
      ["raisins", "dry", 150],
      ["cinnamon", "dry", 125],
      ["cloves", "dry", 125],
      ["baking powder", "dry", 192],
      ["salt", "dry", 288],
      ["baking soda", "dry", 288],
    ]);
    expect(metric(r.ingredients)).toEqual(EXPECTED);
  });

  it("shows Celsius next to 'moderate oven'", () => {
    expect(segmentsToString(convertTemperaturesInText(fixture.steps[0]!, "metric"))).toBe(
      "Mix all together - drop from spoon onto cookie sheet and bake in moderate oven (≈180°C).",
    );
    expect(segmentsToString(convertTemperaturesInText(fixture.steps[1]!, "metric"))).toBe(fixture.steps[1]);
  });

  it("US mode leaves the cups alone and converts nothing it shouldn't", () => {
    const us = stored.map((i) => convertIngredient(i, "us"));
    expect(us.filter((d) => d.converted)).toEqual([]);
  });
});

describe("forgiving density lookup", () => {
  it.each([
    ["flour", "flour"],
    ["Flour", "flour"],
    ["FLOURS", "flour"],
    ["sifted flour", "flour"],
    ["brown sugar", "brown sugar"],
    ["packed brown sugar", "packed brown sugar"],
    ["firmly packed dark brown sugar", "dark brown sugar"],
    ["brown cane sugar", "cane sugar"],
    ["light brown muscovado sugar", "light brown sugar"],
    ["nuts", "nuts"],
    ["chopped mixed nuts", "mixed nuts"],
    ["macadamia nuts", "nuts"],
    ["Brazil nuts, roughly chopped", "nuts"],
    ["lard", "lard"],
    ["vegetable shortening", "vegetable shortening"],
    ["chopped dates", "chopped dates"],
    ["Medjool dates", "medjool dates"],
    ["seedless raisins", "raisins"],
    ["mixed dried fruit", "mixed dried fruit"],
    ["dried fruit (raisins, currants)", "dried fruit"],
  ])("%s → %s", (item, matched) => expect(lookupDensity(item)?.matched).toBe(matched));

  it("stored values still win over the table", () => {
    const d = convertIngredient(IngredientSchema.parse({ quantity: "1", unit: "cup", item: "flour", category: "dry", gramsPerCup: 140 }), "metric");
    expect(d.quantity).toBe("140");
  });

  it("doesn't borrow from the table when the stored category disagrees", () => {
    const d = convertIngredient(IngredientSchema.parse({ quantity: "2", unit: "cups", item: "flour", category: "liquid" }), "metric");
    expect(`${d.quantity} ${d.unit}`).toBe("480 ml");
  });
});

describe("old-fashioned oven descriptions", () => {
  const m = (t: string) => segmentsToString(convertTemperaturesInText(t, "metric"));
  it.each([
    ["Bake in a slow oven for 2 hours.", "Bake in a slow oven (≈150°C) for 2 hours."],
    ["Bake in a moderate oven.", "Bake in a moderate oven (≈180°C)."],
    ["Bake in a moderately hot oven until golden.", "Bake in a moderately hot oven (≈190°C) until golden."],
    ["Put into a hot oven.", "Put into a hot oven (≈220°C)."],
    ["Heat the oven until moderately hot, then bake.", "Heat the oven until moderately hot (≈190°C), then bake."],
    ["Bake in a very hot oven", "Bake in a very hot oven (≈230°C)"],
  ])("%s", (input, out) => expect(m(input)).toBe(out));

  it("ignores 'hot' that isn't about the oven", () => {
    expect(m("Pour over hot water and serve.")).toBe("Pour over hot water and serve.");
  });
  it("shows °F in US mode and keeps the original in Original mode", () => {
    expect(segmentsToString(convertTemperaturesInText("bake in moderate oven", "us"))).toBe("bake in moderate oven (≈350°F)");
    expect(segmentsToString(convertTemperaturesInText("bake in moderate oven", "original"))).toBe("bake in moderate oven");
  });
});
