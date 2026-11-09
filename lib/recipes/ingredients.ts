import type { Ingredient } from "./schema";

/**
 * Helpers for turning free-text ingredient lines ("1 ½ el olijfolie, extra
 * vierge") into structured ingredients and back. Used by the edit form and as
 * a fallback when mapping JSON-LD recipeIngredient strings.
 */

const UNICODE_FRACTIONS: Record<string, string> = {
  "½": "1/2", "⅓": "1/3", "⅔": "2/3", "¼": "1/4", "¾": "3/4",
  "⅕": "1/5", "⅖": "2/5", "⅗": "3/5", "⅘": "4/5", "⅙": "1/6",
  "⅚": "5/6", "⅛": "1/8", "⅜": "3/8", "⅝": "5/8", "⅞": "7/8",
};

/** Units we recognise (lower-case). English and Dutch. */
const UNITS = [
  // metric
  "mg", "g", "gr", "gram", "grams", "gramme", "grammes", "kg", "kilo", "kilogram", "kilograms",
  "ml", "milliliter", "millilitre", "milliliters", "millilitres", "cl", "dl", "l", "liter", "litre", "liters", "litres",
  // imperial / us
  "tsp", "tsps", "teaspoon", "teaspoons", "tbsp", "tbsps", "tbs", "tablespoon", "tablespoons",
  "cup", "cups", "oz", "ounce", "ounces", "lb", "lbs", "pound", "pounds", "pint", "pints", "quart", "quarts",
  "fl oz",
  // dutch spoons & measures
  "tl", "theelepel", "theelepels", "el", "eetlepel", "eetlepels", "kl", "koffielepel", "koffielepels",
  "kopje", "kopjes", "beker", "bekers", "mespunt", "mespuntje", "snuf", "snufje", "scheutje", "scheut",
  // counts & packaging
  "pinch", "pinches", "dash", "dashes", "splash", "handful", "handfuls", "bunch", "bunches",
  "clove", "cloves", "teen", "teentje", "teentjes", "tenen",
  "can", "cans", "tin", "tins", "jar", "jars", "pot", "potje", "potjes", "blik", "blikje", "blikjes",
  "package", "packages", "pack", "packs", "packet", "packets", "pak", "pakje", "pakjes", "zak", "zakje", "zakjes",
  "slice", "slices", "plak", "plakje", "plakjes", "plakken",
  "stick", "sticks", "stalk", "stalks", "stengel", "stengels", "sprig", "sprigs", "takje", "takjes",
  "piece", "pieces", "stuk", "stuks", "stukje", "stukjes", "head", "heads", "krop", "kropje",
  "bos", "bosje", "bosjes", "handje", "handjes", "blaadje", "blaadjes", "sheet", "sheets", "vel", "vellen",
  "bol", "bollen", "knol", "knollen",
].sort((a, b) => b.length - a.length); // longest first so "fl oz" beats "oz"

const UNIT_SET = new Set(UNITS);

const NUM = String.raw`\d+(?:[.,]\d+)?`;
const FRACTION = String.raw`\d+\s*/\s*\d+`;
const MIXED = String.raw`\d+\s+\d+\s*/\s*\d+`;
const SINGLE = String.raw`(?:${MIXED}|${FRACTION}|${NUM})`;
const QUANTITY_RE = new RegExp(String.raw`^(${SINGLE}(?:\s*(?:-|–|—|to|tot|à|a)\s*${SINGLE})?)`, "i");

export function normalizeFractions(s: string): string {
  return s
    .replace(/(\d)([½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])/g, "$1 $2")
    .replace(/[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]/g, (c) => UNICODE_FRACTIONS[c] ?? c)
    .replace(/⁄/g, "/"); // fraction slash
}

/** Numeric value of a single (non-range) quantity, or null if ambiguous. */
export function parseQuantityValue(q: string): number | null {
  const s = normalizeFractions(q).trim().replace(",", ".");
  if (!s) return null;
  let m = s.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (m) return Number(m[3]) === 0 ? null : round(Number(m[1]) + Number(m[2]) / Number(m[3]));
  m = s.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (m) return Number(m[2]) === 0 ? null : round(Number(m[1]) / Number(m[2]));
  m = s.match(/^\d+(?:\.\d+)?$/);
  if (m) return Number(s);
  return null; // ranges ("2-3"), words ("a pinch"), etc.
}

const round = (n: number) => Math.round(n * 1000) / 1000;

function splitNote(rest: string): { item: string; note: string } {
  let item = rest.trim();
  const notes: string[] = [];
  // Parenthetical notes anywhere: "butter (softened)".
  item = item.replace(/\s*\(([^)]*)\)\s*/g, (_, n: string) => {
    if (n.trim()) notes.push(n.trim());
    return " ";
  }).trim();
  // Everything after the first comma is a note: "onion, finely chopped".
  const comma = item.indexOf(",");
  if (comma > 0) {
    notes.unshift(item.slice(comma + 1).trim());
    item = item.slice(0, comma).trim();
  }
  return { item: item.replace(/\s{2,}/g, " "), note: notes.filter(Boolean).join("; ") };
}

/**
 * Parses one ingredient line. Never throws; anything we can't split ends up
 * in `item` so no information is lost.
 */
export function parseIngredientLine(line: string, group = ""): Ingredient | null {
  let s = normalizeFractions(line)
    .replace(/^[\s•·*\-–—▢☐□✓]+/, "") // bullets / checkboxes
    .replace(/\s+/g, " ")
    .trim();
  if (!s) return null;

  let quantity = "";
  const qm = s.match(QUANTITY_RE);
  if (qm) {
    quantity = qm[1]!.replace(/\s*(-|–|—)\s*/, "-").trim();
    s = s.slice(qm[0].length).trim();
  }

  let unit = "";
  if (quantity) {
    // "200g" / "2el" leaves the unit glued to the start of the remainder.
    const lower = s.toLowerCase();
    for (const u of UNITS) {
      if (lower.startsWith(u)) {
        const next = s.charAt(u.length);
        if (next === "" || /[\s.,)]/.test(next)) {
          unit = s.slice(0, u.length);
          s = s.slice(u.length).replace(/^\.(?=\s|$)/, "").trim();
          break;
        }
      }
    }
    // "of", "van" after unit: "2 cups of flour" / "1 blik van ..."
    if (unit) s = s.replace(/^(of|van)\s+/i, "");
  }

  const { item, note } = splitNote(s);
  if (!item) {
    // e.g. "2 cloves" alone: treat the unit as the item.
    if (unit) return { quantity, quantityValue: parseQuantityValue(quantity), unit: "", item: unit, note, group };
    if (quantity) return { quantity: "", quantityValue: null, unit: "", item: quantity, note, group };
    return null;
  }
  return { quantity, quantityValue: parseQuantityValue(quantity), unit, item, note, group };
}

export function formatIngredient(i: Pick<Ingredient, "quantity" | "unit" | "item" | "note">): string {
  const main = [i.quantity, i.unit, i.item].filter(Boolean).join(" ");
  return i.note ? `${main}, ${i.note}` : main;
}

export function isKnownUnit(u: string): boolean {
  return UNIT_SET.has(u.toLowerCase());
}

/** Groups items by their `group` field, preserving first-seen order. */
export function groupBy<T extends { group: string }>(items: T[]): { group: string; items: T[] }[] {
  const out: { group: string; items: T[] }[] = [];
  for (const item of items) {
    const last = out.find((g) => g.group === item.group);
    if (last) last.items.push(item);
    else out.push({ group: item.group, items: [item] });
  }
  return out;
}
