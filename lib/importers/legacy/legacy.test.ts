import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { mapLegacyRecord, normalizeLegacyUnit, splitIngredientName, stepsLookUnfinished } from "./map";
import { cleanString, fallbackId, parseMongoExport, splitTopLevelObjects, unwrapShellValues } from "./mongo";
import { findPossibleDuplicates, formatReport } from "./report";

const text = readFileSync(new URL("../../../tests/fixtures/legacy-sample.txt", import.meta.url), "utf8");
const parsed = parseMongoExport(text);
const now = new Date("2026-11-09T12:00:00Z");
const mapped = parsed.records.map((r) => mapLegacyRecord(r, now));
const byTitle = (t: string) => mapped.find((m) => m.title === t)!;
const allFlags = (t: string) => byTitle(t).flags.map((f) => f.message).join("\n");

describe("Mongo shell parsing", () => {
  it("unwraps shell values", () => {
    expect(unwrapShellValues("{ _id: ObjectId('abc'), d: ISODate(\"2023-01-01\"), n: NumberInt('0'), m: NumberLong(5) }")).toBe(
      "{ _id: 'abc', d: '2023-01-01', n: 0, m: 5 }",
    );
  });

  it("splits records separated by blank lines and glued as }{, ignoring braces in strings", () => {
    expect(splitTopLevelObjects("{a:1}\n\n{b:'}{'}{c:{d:2}}")).toEqual(["{a:1}", "{b:'}{'}", "{c:{d:2}}"]);
  });

  it("parses every record, dedupes by _id and gives a stable id to the one without", () => {
    expect(parsed.errors).toEqual([]);
    expect(parsed.records.map((r) => r.title)).toEqual(["Kimchi Noodle Soup with Scallions", "Kimchi Noodles", "Spice Rub", "Lemon Chicken", "Tuna Pasta", "Tacos"]);
    expect(parsed.duplicatesDropped).toEqual([{ legacyId: "64a000000000000000000002", title: "Spice Rub" }]);
    expect(parsed.records[0]!._legacyId).toBe(fallbackId("Kimchi Noodle Soup with Scallions"));
    expect(fallbackId("Kimchi Noodle Soup with Scallions")).toBe(fallbackId("  kimchi noodle soup with scallions "));
  });

  it("strips invisible characters and trims all strings", () => {
    expect(cleanString("﻿Hello​ world ")).toBe("Hello world");
    const chicken = byTitle("Lemon Chicken");
    expect(chicken.input.steps[0]!.text).toBe("Preheat the oven to 400 degrees.");
  });
});

describe("field mapping", () => {
  it("maps the basics", () => {
    const k = byTitle("Kimchi Noodles");
    expect(k.legacyId).toBe("64a000000000000000000001");
    expect(k.input).toMatchObject({ totalTime: 15, prepTime: null, sourceType: "import", imageUrl: "https://utfs.io/f/abc123.jpg", description: "Quick weeknight noodles" });
    expect(k.createdAt).toBe("2023-05-02T18:00:00.000Z");
  });

  it("merges category + categories into lowercase tags without '*'", () => {
    expect(byTitle("Kimchi Noodle Soup with Scallions").input.tags).toEqual(["dinner", "korean"]);
    expect(byTitle("Kimchi Noodle Soup with Scallions").input.description).toBe("");
  });

  it("normalises units, keeps counts and ranges, moves 'to taste' into the note", () => {
    const ings = byTitle("Lemon Chicken").input.ingredients;
    const line = (item: string) => ings.find((i) => i.item === item)!;
    expect(line("chicken thighs")).toMatchObject({ quantity: "1.5", unit: "lb", quantityValue: 1.5 });
    expect(line("garlic")).toMatchObject({ quantity: "3", unit: "cloves", note: "smashed" });
    expect(line("salt")).toMatchObject({ unit: "tsp", note: "divided" });
    expect(line("white wine")).toMatchObject({ quantity: "", quantityValue: null, note: "splash" });
    expect(line("potatoes")).toMatchObject({ quantity: "350-450", unit: "g", quantityValue: null });
    const soup = byTitle("Kimchi Noodle Soup with Scallions").input.ingredients;
    expect(soup.find((i) => i.item === "scallions")).toMatchObject({ quantity: "4", unit: "", note: "thinly sliced" });
    expect(soup.find((i) => i.item === "salt")).toMatchObject({ quantity: "", note: "to taste" });
    expect(soup.find((i) => i.item === "udon noodles")).toMatchObject({ unit: "packages" });
  });

  it("classifies ingredients from the density table", () => {
    const ings = byTitle("Lemon Chicken").input.ingredients;
    expect(ings.find((i) => i.item === "potatoes")).toMatchObject({ category: "dry", gramsPerCup: 150 });
    expect(byTitle("Kimchi Noodle Soup with Scallions").unclassified).toContain("gochujang");
  });

  it.each([
    ["grams", "g"], ["teaspoons", "tsp"], ["tablespoons", "tbsp"], ["pounds", "lb"], ["ounces", "oz"], ["cups", "cups"],
    ["cloves", "cloves"], ["packages", "packages"], ["packet", "packet"], ["pinch", "pinch"], ["whole", ""], ["", ""],
  ])("unit %s → %s", (raw, out) => expect(normalizeLegacyUnit(raw, 2)).toMatchObject({ unit: out, parsed: true }));

  it("reports units it doesn't know", () => {
    expect(normalizeLegacyUnit("smidgen", 1)).toEqual({ unit: "smidgen", parsed: false });
  });

  it.each([
    ["garlic, smashed", "garlic", "smashed"],
    ["salt divided", "salt", "divided"],
    ["onion finely chopped", "onion", "finely chopped"],
    ["garlic peeled and smashed", "garlic", "peeled and smashed"],
    ["butter (softened)", "butter", "softened"],
    ["toasted sesame oil", "toasted sesame oil", ""],
    ["parsley for garnish", "parsley", "for garnish"],
    ["cooked", "cooked", ""],
  ])("splits %s", (name, item, note) => expect(splitIngredientName(name)).toEqual({ item, note }));
});

describe("incomplete and unfinished recipes", () => {
  it("tags incomplete recipes and keeps them out of the rotation", () => {
    const tuna = byTitle("Tuna Pasta");
    expect(tuna).toMatchObject({ incomplete: true, inRotation: false });
    expect(tuna.input.tags).toContain("needs-details");
    expect(tuna.input.description).toBe("pasta, tuna, rode ui, capers");
    expect(tuna.input.ingredients).toHaveLength(1);
  });

  it("flags unfinished steps without needs-details", () => {
    const tacos = byTitle("Tacos");
    expect(tacos).toMatchObject({ incomplete: false, unfinishedSteps: true, inRotation: false });
    expect(tacos.input.tags).not.toContain("needs-details");
  });

  it("puts complete recipes in the rotation", () => {
    expect(byTitle("Kimchi Noodles").inRotation).toBe(true);
  });

  it.each([
    [["Mix.", "dice half an onion and set aside. in a small serving bowl"], true],
    [["Mix.", "Stir in the cheese and"], true],
    [["Mix.", "Serve warm"], false],
    [["Mix.", "Serve warm."], false],
  ])("stepsLookUnfinished %j", (steps, out) => expect(stepsLookUnfinished(steps)).toBe(out));
});

describe("data problems are flagged, not fixed", () => {
  it("flags implausible amounts, garbled names, units in names, unknown units", () => {
    const f = allFlags("Lemon Chicken");
    expect(f).toMatch(/Lots of oil.*14 oz toasted sesame oil/);
    expect(f).toMatch(/"pinch" of something that isn't a seasoning.*baby spinach/);
    expect(f).toMatch(/Item name contains a unit.*tablespoons olive oil/);
    expect(f).toMatch(/garbled.*"slicedd".*"da"/);
    expect(f).toMatch(/Unit "smidgen" wasn't recognised/);
    // and nothing was changed
    expect(byTitle("Lemon Chicken").input.ingredients.find((i) => i.item.includes("sesame"))).toMatchObject({ quantity: "14", unit: "oz" });
  });

  it("flags spices mentioned in steps but missing from ingredients", () => {
    expect(allFlags("Spice Rub")).toMatch(/mention "cloves"/);
    expect(allFlags("Spice Rub")).not.toMatch(/mention "paprika"/);
  });

  it("notes the missing _id", () => {
    expect(allFlags("Kimchi Noodle Soup with Scallions")).toMatch(/No _id/);
  });
});

describe("possible duplicates and report", () => {
  it("finds near-identical recipes", () => {
    const d = findPossibleDuplicates(mapped);
    expect(d.map((x) => [x.a, x.b])).toContainEqual(["Kimchi Noodle Soup with Scallions", "Kimchi Noodles"]);
    expect(d.some((x) => x.a === "Tacos" || x.b === "Tacos")).toBe(false);
  });

  it("formats a readable report", () => {
    const out = formatReport({
      mapped: mapped.map((m) => ({ ...m, status: "new" as const, knownIssues: [], similarTo: [] })),
      duplicatesDropped: parsed.duplicatesDropped,
      parseErrors: [],
      possibleDuplicates: findPossibleDuplicates(mapped),
      mode: "dry-run",
      email: "me@example.com",
      householdName: "Home",
    });
    expect(out).toContain("6 recipes parsed, 1 duplicate record(s) dropped");
    expect(out).toMatch(/needs-details: Tuna Pasta/);
    expect(out).toMatch(/steps look unfinished.*Tacos/);
    expect(out).toContain("Possible duplicates:");
  });
});
