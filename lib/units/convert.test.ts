import { describe, expect, it } from "vitest";
import { parseIngredientLine } from "@/lib/recipes/ingredients";
import { classifyIngredient } from "./classify";
import type { UnitSystem } from "./constants";
import { convertIngredient, formatConvertedLine } from "./convert";

/** Real pipeline: parse the line, classify from the table, convert. */
const ing = (line: string) => classifyIngredient(parseIngredientLine(line)!);
const show = (line: string, system: UnitSystem = "metric") => {
  const d = convertIngredient(ing(line), system);
  return `${d.quantity} ${d.unit}`.trim();
};

describe("metric: volume → weight for dry and fat ingredients", () => {
  it.each([
    ["1 cup flour", "120 g"],
    ["1 cup all-purpose flour, sifted", "120 g"],
    ["1 cup sugar", "200 g"],
    ["1 cup packed brown sugar", "220 g"],
    ["1 cup brown sugar, packed", "220 g"],
    ["1 1/2 cups flour", "180 g"],
    ["1½ cups flour", "180 g"],
    ["1.5 cups flour", "180 g"],
    ["2-3 cups flour", "240–360 g"],
    ["2 to 3 cups flour", "240–360 g"],
    ["3/4 cup cocoa powder", "65 g"],
    ["1 cup rolled oats", "90 g"],
    ["1/2 cup grated parmesan", "50 g"],
    ["1 C flour", "120 g"],
    ["2 c. sugar", "400 g"],
    ["6 tbsp flour", "45 g"],
    ["9 cups flour", "1.1 kg"],
  ])("%s → %s", (line, out) => expect(show(line)).toBe(out));
});

describe("butter", () => {
  it.each([
    ["1 stick butter", "113 g"],
    ["2 sticks unsalted butter", "226 g"],
    ["1 cup butter", "225 g"],
    ["2 tbsp butter", "28 g"],
    ["1 T butter", "14 g"],
  ])("%s → %s", (line, out) => expect(show(line)).toBe(out));
});

describe("metric: liquids stay volumes", () => {
  it.each([
    ["1 cup milk", "240 ml"],
    ["16 fl oz stock", "475 ml"],
    ["8 oz milk", "235 ml"], // oz on a liquid = fluid ounces
    ["2 quarts chicken stock", "1.9 l"],
    ["1/2 cup heavy cream", "120 ml"],
    ["3 cups water", "720 ml"],
    ["6 tbsp olive oil", "90 ml"],
  ])("%s → %s", (line, out) => expect(show(line)).toBe(out));

  it("thick liquids are weighed", () => {
    expect(show("1/2 cup honey")).toBe("170 g");
    expect(show("1/4 cup maple syrup")).toBe("80 g");
    expect(show("1 cup greek yogurt")).toBe("280 g");
  });
});

describe("metric: spoons stay spoons for small amounts", () => {
  it.each([
    ["2 tbsp olive oil", "2 tbsp"],
    ["1 tsp salt", "1 tsp"],
    ["4 tbsp flour", "4 tbsp"],
    ["1 T honey", "1 T"],
    ["1/2 t baking soda", "1/2 t"],
    ["2 el olijfolie", "2 el"],
  ])("%s → %s", (line, out) => {
    const d = convertIngredient(ing(line), "metric");
    expect(`${d.quantity} ${d.unit}`).toBe(out);
    expect(d.converted).toBe(false);
  });
});

describe("weights stay weights", () => {
  it.each([
    ["8 oz cream cheese", "225 g"],
    ["1 lb ground beef", "450 g"],
    ["2 lbs potatoes", "910 g"],
    ["3 lb chicken thighs", "1.4 kg"],
    ["4 oz parmesan", "115 g"],
  ])("%s → %s", (line, out) => expect(show(line)).toBe(out));

  it("leaves metric weights alone", () => {
    expect(convertIngredient(ing("200 g spaghetti"), "metric")).toMatchObject({ quantity: "200", unit: "g", converted: false });
  });
});

describe("never converted", () => {
  it.each(["3 eggs", "salt to taste", "1 onion", "3 cloves garlic", "a pinch of salt", "1 can chickpeas", "2 large eggs, beaten"])("%s", (line) => {
    const i = ing(line);
    for (const system of ["metric", "us"] as const) {
      expect(convertIngredient(i, system)).toMatchObject({ quantity: i.quantity, unit: i.unit, converted: false });
    }
  });

  it("doesn't guess without a classification or density", () => {
    const unknown = { quantity: "1", unit: "cup", item: "mystery mix", category: null, gramsPerCup: null };
    expect(convertIngredient(unknown, "metric")).toMatchObject({ quantity: "1", unit: "cup", converted: false });
    const noDensity = { ...unknown, category: "dry" as const };
    expect(convertIngredient(noDensity, "metric")).toMatchObject({ unit: "cup", converted: false });
    // ambiguous oz on an unknown ingredient
    expect(convertIngredient({ ...unknown, unit: "oz" }, "metric")).toMatchObject({ unit: "oz", converted: false });
  });

  it("original mode returns exactly what was written", () => {
    expect(convertIngredient(ing("1 1/2 cups flour"), "original")).toEqual({ quantity: "1 1/2", unit: "cups", converted: false, approx: false });
  });
});

describe("US: back from grams and ml", () => {
  it.each([
    // weights stay weights
    ["120 g flour", "4 oz"],
    ["250 g bloem", "9 oz"],
    ["100 g sugar", "3 ½ oz"],
    ["113 g butter", "4 oz"],
    ["450 g ground beef", "1 lb"],
    ["500 g gehakt", "1 lb"],
    ["200 g chicken breast", "7 oz"],
    ["1 kg pork shoulder", "2 ¼ lb"],
    ["1.5 kg potatoes", "3 ¼ lb"],
    ["340 g honey", "12 oz"],
    ["2 g salt", "2 g"], // too small for a US weight
    // volumes stay volumes
    ["240 ml milk", "1 cup"],
    ["500 ml melk", "2 cups"],
    ["1 l bouillon", "4 ¼ cups"],
    ["2 l water", "2 quarts"],
    ["80 ml cream", "⅓ cup"],
    ["15 ml olive oil", "1 tbsp"],
    ["30 ml lemon juice", "2 tbsp"],
    ["20 ml soy sauce", "1 ¼ tbsp"],
    ["5 ml vanilla extract", "1 tsp"],
    ["2.5 ml vanilla extract", "½ tsp"],
    ["2 el olijfolie", "2 tbsp"],
    ["1 tl zout", "1 tsp"],
  ])("%s → %s", (line, out) => expect(show(line, "us")).toBe(out));

  it("ranges convert both ends", () => {
    expect(show("200-300 ml milk", "us")).toBe("¾–1 ¼ cups");
  });

  it("leaves US amounts alone", () => {
    expect(convertIngredient(ing("1 cup flour"), "us")).toMatchObject({ quantity: "1", unit: "cup", converted: false });
  });
});

describe("scaling composes before conversion", () => {
  it("scales, then converts, then rounds", () => {
    expect(convertIngredient(ing("1 cup flour"), "metric", { scale: 1.5 })).toMatchObject({ quantity: "180", unit: "g" });
    expect(convertIngredient(ing("1 stick butter"), "metric", { scale: 2 })).toMatchObject({ quantity: "226", unit: "g" });
    expect(convertIngredient(ing("3 eggs"), "metric", { scale: 2 })).toMatchObject({ quantity: "6", unit: "", converted: true });
    expect(convertIngredient(ing("1 cup flour"), "original", { scale: 0.5 })).toMatchObject({ quantity: "½", unit: "cup" });
  });
});

describe("flags and formatting", () => {
  it("marks conversions as approximate", () => {
    expect(convertIngredient(ing("1 cup flour"), "metric")).toMatchObject({ converted: true, approx: true });
    expect(convertIngredient(ing("2 el olijfolie"), "us")).toMatchObject({ converted: true, approx: false });
  });
  it("formats whole lines", () => {
    expect(formatConvertedLine(ing("1 cup flour, sifted"), "metric")).toBe("≈ 120 g flour, sifted");
    expect(formatConvertedLine(ing("3 eggs"), "metric")).toBe("3 eggs");
  });
});
