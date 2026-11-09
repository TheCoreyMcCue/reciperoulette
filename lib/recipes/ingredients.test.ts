import { describe, expect, it } from "vitest";
import { formatIngredient, groupBy, parseIngredientLine, parseQuantityValue } from "./ingredients";

const p = (s: string) => {
  const r = parseIngredientLine(s);
  return r && { quantity: r.quantity, unit: r.unit, item: r.item, note: r.note, value: r.quantityValue };
};

describe("parseIngredientLine", () => {
  it.each([
    ["200 g spaghetti", { quantity: "200", unit: "g", item: "spaghetti", note: "", value: 200 }],
    ["200g spaghetti", { quantity: "200", unit: "g", item: "spaghetti", note: "", value: 200 }],
    ["1 1/2 cups flour, sifted", { quantity: "1 1/2", unit: "cups", item: "flour", note: "sifted", value: 1.5 }],
    ["½ tsp salt", { quantity: "1/2", unit: "tsp", item: "salt", note: "", value: 0.5 }],
    ["1½ el olijfolie", { quantity: "1 1/2", unit: "el", item: "olijfolie", note: "", value: 1.5 }],
    ["2-3 cloves garlic (minced)", { quantity: "2-3", unit: "cloves", item: "garlic", note: "minced", value: null }],
    ["2 teentjes knoflook, fijngehakt", { quantity: "2", unit: "teentjes", item: "knoflook", note: "fijngehakt", value: 2 }],
    ["1,5 kg kruimige aardappelen", { quantity: "1,5", unit: "kg", item: "kruimige aardappelen", note: "", value: 1.5 }],
    ["3 eggs", { quantity: "3", unit: "", item: "eggs", note: "", value: 3 }],
    ["salt and pepper", { quantity: "", unit: "", item: "salt and pepper", note: "", value: null }],
    ["• 1 tin chopped tomatoes", { quantity: "1", unit: "tin", item: "chopped tomatoes", note: "", value: 1 }],
    ["2 cups of milk", { quantity: "2", unit: "cups", item: "milk", note: "", value: 2 }],
    ["1 grote ui", { quantity: "1", unit: "", item: "grote ui", note: "", value: 1 }],
    ["4 garlic cloves", { quantity: "4", unit: "", item: "garlic cloves", note: "", value: 4 }],
    ["1 l melk", { quantity: "1", unit: "l", item: "melk", note: "", value: 1 }],
    ["1 lemon", { quantity: "1", unit: "", item: "lemon", note: "", value: 1 }],
  ])("%s", (line, expected) => {
    expect(p(line)).toEqual(expected);
  });

  it("doesn't mistake words starting with a unit for a unit", () => {
    // "large" starts with "l", "gin" starts with "g", "tbsp" mustn't eat "tbspx"
    expect(p("2 large onions")?.unit).toBe("");
    expect(p("50 ml gin")?.item).toBe("gin");
    expect(p("1 gingerroot")?.unit).toBe("");
  });

  it("returns null for blank lines and keeps the group", () => {
    expect(parseIngredientLine("   ")).toBeNull();
    expect(parseIngredientLine("1 onion", "Sauce")?.group).toBe("Sauce");
  });

  it("round-trips through formatIngredient", () => {
    for (const line of ["200 g spaghetti", "1 1/2 cups flour, sifted", "3 eggs", "salt"]) {
      expect(formatIngredient(parseIngredientLine(line)!)).toBe(line);
    }
  });
});

describe("parseQuantityValue", () => {
  it("handles fractions, decimals and ranges", () => {
    expect(parseQuantityValue("3/4")).toBe(0.75);
    expect(parseQuantityValue("2,5")).toBe(2.5);
    expect(parseQuantityValue("¼")).toBe(0.25);
    expect(parseQuantityValue("2-3")).toBeNull();
    expect(parseQuantityValue("1/0")).toBeNull();
    expect(parseQuantityValue("")).toBeNull();
  });
});

describe("groupBy", () => {
  it("preserves first-seen order", () => {
    const g = groupBy([{ group: "", n: 1 }, { group: "Sauce", n: 2 }, { group: "", n: 3 }]);
    expect(g.map((x) => [x.group, x.items.length])).toEqual([["", 2], ["Sauce", 1]]);
  });
});
