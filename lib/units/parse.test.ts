import { describe, expect, it } from "vitest";
import { classifyFromTable, classifyIngredient, lookupDensity, sanitizeClassification, stem } from "./classify";
import { DENSITIES } from "./densities";
import { friendlyFraction, roundGrams, roundMl } from "./format";
import { normalizeUnit } from "./normalize";
import { parseQuantity } from "./quantity";

describe("normalizeUnit", () => {
  it.each([
    ["cup", "cup"], ["cups", "cup"], ["c.", "cup"], ["C", "cup"], ["c", "cup"],
    ["tablespoon", "tbsp"], ["tbsp", "tbsp"], ["Tbsp", "tbsp"], ["TBSP", "tbsp"], ["T", "tbsp"], ["Tbs", "tbsp"], ["el", "tbsp"], ["eetlepels", "tbsp"],
    ["teaspoon", "tsp"], ["tsp", "tsp"], ["t", "tsp"], ["tl", "tsp"], ["theelepel", "tsp"],
    ["oz", "oz"], ["ounces", "oz"], ["fl oz", "floz"], ["fl. oz", "floz"], ["fluid ounces", "floz"],
    ["lb", "lb"], ["lbs", "lb"], ["pound", "lb"], ["ml", "ml"], ["l", "l"], ["liter", "l"], ["g", "g"], ["gr", "g"], ["gram", "g"], ["kg", "kg"],
    ["stick", "stick"], ["quarts", "quart"], ["pint", "pint"],
  ])("%s → %s", (raw, canon) => expect(normalizeUnit(raw)).toBe(canon));

  it("returns null for non-measures", () => {
    for (const u of ["", "clove", "cloves", "pinch", "can", "handful", "teentjes", "blik"]) expect(normalizeUnit(u)).toBeNull();
  });
});

describe("parseQuantity", () => {
  it.each([
    ["1", { low: 1, high: null }],
    ["1 1/2", { low: 1.5, high: null }],
    ["1½", { low: 1.5, high: null }],
    ["½", { low: 0.5, high: null }],
    ["1.5", { low: 1.5, high: null }],
    ["1,5", { low: 1.5, high: null }],
    ["2-3", { low: 2, high: 3 }],
    ["2 – 3", { low: 2, high: 3 }],
    ["2 to 3", { low: 2, high: 3 }],
    ["1/2-3/4", { low: 0.5, high: 0.75 }],
    ["2 tot 3", { low: 2, high: 3 }],
  ])("%s", (q, out) => expect(parseQuantity(q)).toEqual(out));

  it("rejects non-numbers", () => {
    for (const q of ["", "a pinch", "some", "to taste", "0", "3-2"]) expect(parseQuantity(q)).toBeNull();
  });
});

describe("rounding", () => {
  it("rounds grams and ml to measurable amounts", () => {
    expect([roundGrams(7.4), roundGrams(48.6), roundGrams(51), roundGrams(226.8), roundGrams(453.6)]).toEqual([7, 49, 50, 225, 450]);
    expect([roundMl(14.8), roundMl(236.6), roundMl(473.2), roundMl(946)]).toEqual([15, 235, 475, 950]);
  });
  it("uses friendly fractions", () => {
    expect(friendlyFraction(0.5)).toBe("½");
    expect(friendlyFraction(1.33)).toBe("1 ⅓");
    expect(friendlyFraction(0.74)).toBe("¾");
    expect(friendlyFraction(1.96)).toBe("2");
    expect(friendlyFraction(0.3, { set: "spoon" })).toBe("¼");
    expect(friendlyFraction(0.13, { set: "tsp" })).toBe("⅛");
    expect(friendlyFraction(0.02)).toBe("¼"); // never "0"
  });
});

describe("classification", () => {
  it.each([
    ["all-purpose flour", "dry", 120],
    ["unbleached all purpose flour", "dry", 120],
    ["bread flour", "dry", 127],
    ["packed light brown sugar", "dry", 220],
    ["confectioners' sugar", "dry", 120],
    ["poedersuiker", "dry", 120],
    ["unsalted butter", "fat", 227],
    ["roomboter", "fat", 227],
    ["peanut butter", "fat", 258],
    ["buttermilk", "liquid", null],
    ["butter beans", "dry", 165],
    ["whole milk", "liquid", null],
    ["coconut milk", "liquid", null],
    ["rice vinegar", "liquid", null],
    ["brown rice", "dry", 190],
    ["havermout", "dry", 90],
    ["rijst", "dry", 190],
    ["bloem", "dry", 120],
    ["maïzena", "dry", 120],
    ["honey", "liquid", 340],
    ["cream cheese, softened", "fat", 232],
    ["sour cream", "liquid", 230],
    ["heavy cream", "liquid", null],
    ["large eggs", "count", null],
    ["eieren", "count", null],
    ["garlic powder", "dry", 125],
    ["garlic", "count", null],
    ["chocolate chips", "dry", 170],
    ["tomato paste", "liquid", null],
    ["olive oil", "liquid", null],
    ["coconut oil", "fat", 218],
  ])("%s → %s", (item, category, g) => expect(classifyFromTable(item)).toEqual({ category, gramsPerCup: g }));

  it("stems plurals consistently", () => {
    expect(stem("tomatoes")).toBe("tomato");
    expect(stem("berries")).toBe("berry");
    expect(stem("oats")).toBe("oat");
    expect(stem("glass")).toBe("glass");
    expect(lookupDensity("walnut")?.matched).toBe("walnuts");
  });

  it("returns null for things we don't know", () => {
    expect(classifyFromTable("gochujang")).toBeNull();
  });

  it("table values beat AI estimates; AI values are sanitised", () => {
    expect(classifyIngredient({ item: "flour", category: "liquid" as const, gramsPerCup: 999 })).toMatchObject({ category: "dry", gramsPerCup: 120 });
    expect(classifyIngredient({ item: "gochujang", category: "fat" as const, gramsPerCup: 300 })).toMatchObject({ category: "fat", gramsPerCup: 300 });
    // milk-like AI densities are dropped so liquids stay in ml
    expect(sanitizeClassification("liquid", 245)).toEqual({ category: "liquid", gramsPerCup: null });
    expect(sanitizeClassification("liquid", 330)).toEqual({ category: "liquid", gramsPerCup: 330 });
    expect(sanitizeClassification("count", 100)).toEqual({ category: "count", gramsPerCup: null });
    expect(sanitizeClassification("bogus", 100)).toBeNull();
    expect(sanitizeClassification("dry", 5000)).toEqual({ category: "dry", gramsPerCup: null });
  });

  it("table entries are well-formed", () => {
    for (const e of DENSITIES) {
      if (e.category === "dry" || e.category === "fat") expect(e.gramsPerCup, e.names[0]).toBeGreaterThan(0);
      if (e.category === "count" || e.category === "unknown") expect(e.gramsPerCup, e.names[0]).toBeUndefined();
    }
  });
});

describe("pepper", () => {
  it("treats ground pepper as a spice but keeps bell peppers separate", () => {
    expect(classifyFromTable("black pepper")).toEqual({ category: "dry", gramsPerCup: 125 });
    expect(classifyFromTable("freshly ground black pepper")).toEqual({ category: "dry", gramsPerCup: 125 });
    expect(classifyFromTable("red bell pepper")).toEqual({ category: "dry", gramsPerCup: 150 });
  });
});
