import { FL_OZ_ML, GALLON_ML, LB_G, OZ_G, PINT_ML, QUART_ML, TBSP_ML, TSP_ML, US_CUP_ML } from "./constants";

/**
 * Maps the many ways recipes write units onto a small canonical set.
 * Case matters for one-letter US shorthand: "T" = tablespoon, "t" = teaspoon.
 */

export type CanonicalUnit =
  | "tsp" | "tbsp" | "cup" | "floz" | "pint" | "quart" | "gallon"
  | "ml" | "cl" | "dl" | "l"
  | "mg" | "g" | "kg" | "oz" | "lb"
  | "stick";

export type UnitKind = "volume" | "weight" | "stick";

const ALIASES: Record<CanonicalUnit, string[]> = {
  tsp: ["tsp", "tsps", "teaspoon", "teaspoons", "tl", "theelepel", "theelepels"],
  tbsp: ["tbsp", "tbsps", "tbs", "tbl", "tbls", "tb", "tablespoon", "tablespoons", "el", "eetlepel", "eetlepels"],
  cup: ["cup", "cups", "c"],
  floz: ["fl oz", "fl. oz", "fl.oz", "floz", "fluid ounce", "fluid ounces", "fl ounce", "fl ounces"],
  pint: ["pint", "pints", "pt", "pts"],
  quart: ["quart", "quarts", "qt", "qts"],
  gallon: ["gallon", "gallons", "gal"],
  ml: ["ml", "milliliter", "milliliters", "millilitre", "millilitres", "mls"],
  cl: ["cl", "centiliter", "centilitre"],
  dl: ["dl", "deciliter", "decilitre"],
  l: ["l", "liter", "liters", "litre", "litres", "ltr"],
  mg: ["mg", "milligram", "milligrams"],
  g: ["g", "gr", "gram", "grams", "gramme", "grammes", "grm"],
  kg: ["kg", "kilo", "kilos", "kilogram", "kilograms", "kilogramme"],
  oz: ["oz", "ounce", "ounces", "onz"],
  lb: ["lb", "lbs", "pound", "pounds"],
  stick: ["stick", "sticks"],
};

const LOOKUP = new Map<string, CanonicalUnit>();
for (const [canon, names] of Object.entries(ALIASES) as [CanonicalUnit, string[]][]) {
  for (const n of names) LOOKUP.set(n, canon);
}

export function normalizeUnit(raw: string | null | undefined): CanonicalUnit | null {
  if (!raw) return null;
  const s = raw.trim().replace(/\.$/, "").replace(/\s+/g, " ");
  if (!s) return null;
  // Case-sensitive US shorthand before lower-casing.
  if (s === "T" || s === "Tb" || s === "Tbs" || s === "Tbl") return "tbsp";
  if (s === "t") return "tsp";
  if (s === "C") return "cup";
  return LOOKUP.get(s.toLowerCase()) ?? null;
}

/** Millilitres per unit, for volume units. */
export const VOLUME_ML: Partial<Record<CanonicalUnit, number>> = {
  tsp: TSP_ML, tbsp: TBSP_ML, cup: US_CUP_ML, floz: FL_OZ_ML, pint: PINT_ML, quart: QUART_ML, gallon: GALLON_ML,
  ml: 1, cl: 10, dl: 100, l: 1000,
};
/** Grams per unit, for weight units. */
export const WEIGHT_G: Partial<Record<CanonicalUnit, number>> = { mg: 0.001, g: 1, kg: 1000, oz: OZ_G, lb: LB_G };

export const isSpoon = (u: CanonicalUnit) => u === "tsp" || u === "tbsp";
export const isMetricVolume = (u: CanonicalUnit) => u === "ml" || u === "cl" || u === "dl" || u === "l";
export const isMetricWeight = (u: CanonicalUnit) => u === "mg" || u === "g" || u === "kg";
export const isUsVolume = (u: CanonicalUnit) => ["tsp", "tbsp", "cup", "floz", "pint", "quart", "gallon"].includes(u);
export const isUsWeight = (u: CanonicalUnit) => u === "oz" || u === "lb" || u === "stick";

/** Dutch spoon labels ("el", "tl") are the same size as tbsp/tsp but read oddly in US mode. */
export function isMetricSpoonLabel(raw: string): boolean {
  return /^(el|tl|eetlepels?|theelepels?)\.?$/i.test(raw.trim());
}
