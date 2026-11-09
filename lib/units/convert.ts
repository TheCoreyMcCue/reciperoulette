import type { IngredientCategory } from "@/lib/recipes/schema";
import { BUTTER_STICK_G, LB_G, OZ_G, QUART_ML, SPOON_MAX_ML, TBSP_ML, TSP_ML, US_CUP_ML, type UnitSystem } from "./constants";
import { formatGrams, formatMl, formatPlain, friendlyFraction, joinRange, type FractionSet } from "./format";
import {
  isMetricSpoonLabel,
  isMetricVolume,
  isMetricWeight,
  isSpoon,
  isUsVolume,
  isUsWeight,
  normalizeUnit,
  VOLUME_ML,
  WEIGHT_G,
  type CanonicalUnit,
} from "./normalize";
import { effectiveClassification } from "./classify";
import { amountMax, parseQuantity, scaleAmount, type Amount } from "./quantity";

/**
 * Display-time conversion of one ingredient. Pure and deterministic: it only
 * reads the stored classification (category, gramsPerCup), never guesses.
 *
 * Pipeline: parse quantity → scale (servings, later) → convert → round/format.
 * Anything we can't convert confidently is returned as written.
 */

export type ConvertibleIngredient = {
  quantity: string;
  unit: string;
  /** Used for the density-table fallback when nothing is stored. */
  item?: string;
  category?: IngredientCategory | null;
  gramsPerCup?: number | null;
};

export type DisplayAmount = {
  quantity: string;
  unit: string;
  /** True when the amount differs from what's written in the recipe. */
  converted: boolean;
  /** True when the conversion is approximate (show "≈"). */
  approx: boolean;
  /**
   * Metric mode only: for small spoon amounts that stay spoons, the
   * approximate metric equivalent shown alongside ("1 tsp … (≈ 4 g)").
   */
  secondary?: { quantity: string; unit: string };
};

type Measure =
  | { kind: "weight"; low: number; high: number | null; exactSticks?: boolean }
  | { kind: "volume"; low: number; high: number | null };

const asWritten = (i: ConvertibleIngredient): DisplayAmount => ({ quantity: i.quantity, unit: i.unit, converted: false, approx: false });

function map(a: Amount, f: (v: number) => number): Amount {
  return { low: f(a.low), high: a.high == null ? null : f(a.high) };
}

function toMeasure(unit: CanonicalUnit, a: Amount, category: IngredientCategory): Measure | null {
  if (unit === "stick") return { kind: "weight", ...map(a, (n) => n * BUTTER_STICK_G), exactSticks: true };
  if (unit === "oz") {
    // "oz" is ambiguous: fluid ounces for liquids, weight for everything solid (incl. counted items like chicken).
    if (category === "liquid") return { kind: "volume", ...map(a, (n) => n * VOLUME_ML.floz!) };
    if (category === "dry" || category === "fat" || category === "count") return { kind: "weight", ...map(a, (n) => n * OZ_G) };
    return null;
  }
  const g = WEIGHT_G[unit];
  if (g) return { kind: "weight", ...map(a, (n) => n * g) };
  const ml = VOLUME_ML[unit];
  if (ml) return { kind: "volume", ...map(a, (n) => n * ml) };
  return null;
}

/** Original unit, just scaled (no conversion). */
function scaledOriginal(i: ConvertibleIngredient, a: Amount, factor: number, unit: CanonicalUnit | null): DisplayAmount {
  if (factor === 1) return asWritten(i);
  const us = unit == null || isUsVolume(unit) || isUsWeight(unit);
  return {
    quantity: joinRange(formatPlain(a.low, us), a.high == null ? null : formatPlain(a.high, us)),
    unit: i.unit,
    converted: true,
    approx: false,
  };
}

// ---- metric ----------------------------------------------------------------

function weightFromVolume(ml: Amount, gramsPerCup: number): DisplayAmount {
  const g = map(ml, (v) => (v / US_CUP_ML) * gramsPerCup);
  return { ...formatGrams(g.low, g.high), converted: true, approx: true };
}

function toMetric(i: ConvertibleIngredient, unit: CanonicalUnit, m: Measure, category: IngredientCategory): DisplayAmount | null {
  const density = i.gramsPerCup ?? null;
  if (m.kind === "weight") {
    if (isMetricWeight(unit)) return null;
    return { ...formatGrams(m.low, m.high, { exact: m.exactSticks }), converted: true, approx: true };
  }
  if (isMetricVolume(unit)) return null;

  if (isSpoon(unit)) {
    // Butter is always weighed in Europe, even by the spoon.
    if (category === "fat" && density) return weightFromVolume(m, density);
    // Small spoon amounts stay spoons: European recipes use them too.
    if (amountMax(m) <= SPOON_MAX_ML) return null;
  }

  if ((category === "dry" || category === "fat" || category === "liquid") && density) return weightFromVolume(m, density);
  if (category === "liquid") return { ...formatMl(m.low, m.high), converted: true, approx: true };
  return null; // dry/fat without density, or unknown: don't guess
}

/** Spoons are exact multiples of 1.25 ml, so keep small ml values precise ("2.5 ml"). */
function smallMl(v: number): string {
  if (v >= 15) return String(Math.round(v / 5) * 5);
  const r = Math.round(v * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

/** Below this a gram figure is meaningless on a kitchen scale (e.g. a pinch of salt). */
const MIN_SECONDARY_G = 0.5;

/** Metric equivalent for a spoon amount that stays a spoon, or null if we can't say. */
function spoonEquivalent(ml: { low: number; high: number | null }, category: IngredientCategory, density: number | null) {
  if ((category === "dry" || category === "fat" || category === "liquid") && density) {
    const g = (v: number) => (v / US_CUP_ML) * density;
    if (g(ml.low) < MIN_SECONDARY_G) return null;
    return formatGrams(g(ml.low), ml.high == null ? null : g(ml.high));
  }
  if (category === "liquid") return { quantity: joinRange(smallMl(ml.low), ml.high == null ? null : smallMl(ml.high)), unit: "ml" };
  return null;
}

// ---- US --------------------------------------------------------------------

function usVolume(ml: Amount): { quantity: string; unit: string } {
  const max = amountMax(ml);
  const fmt = (div: number, set: FractionSet) => (v: number) => friendlyFraction(v / div, { set });
  let unit: string;
  let f: (v: number) => string;
  if (max < TBSP_ML * 0.99) [unit, f] = ["tsp", fmt(TSP_ML, "tsp")];
  else if (max < SPOON_MAX_ML * 0.99) [unit, f] = ["tbsp", fmt(TBSP_ML, "spoon")];
  else if (max < US_CUP_ML * 8) {
    f = fmt(US_CUP_ML, "cup");
    unit = max / US_CUP_ML > 1.01 || (ml.high != null && ml.high / US_CUP_ML > 1.01) ? "cups" : "cup";
  } else [unit, f] = ["quarts", fmt(QUART_ML, "quarters")];
  return { quantity: joinRange(f(ml.low), ml.high == null ? null : f(ml.high)), unit };
}

function usWeight(g: Amount): { quantity: string; unit: string } {
  const max = amountMax(g);
  if (max < LB_G * 0.97) {
    const oz = (v: number) => {
      const n = v / OZ_G;
      return n <= 4 ? friendlyFraction(Math.round(n * 2) / 2, { set: "quarters" }) : String(Math.round(n));
    };
    return { quantity: joinRange(oz(g.low), g.high == null ? null : oz(g.high)), unit: "oz" };
  }
  const lb = (v: number) => friendlyFraction(Math.round((v / LB_G) * 4) / 4, { set: "quarters" });
  return { quantity: joinRange(lb(g.low), g.high == null ? null : lb(g.high)), unit: "lb" };
}

/** Below ~¼ oz there's no sensible US weight; keep grams. */
const MIN_US_WEIGHT_G = OZ_G / 4;

function toUs(i: ConvertibleIngredient, unit: CanonicalUnit, m: Measure): DisplayAmount | null {
  if (m.kind === "weight") {
    // Weights stay weights: g → oz / lb.
    if (isUsWeight(unit) || amountMax(m) < MIN_US_WEIGHT_G) return null;
    return { ...usWeight(m), converted: true, approx: true };
  }
  if (isUsVolume(unit)) {
    // "2 el" → "2 tbsp": same spoon, US label.
    if (isMetricSpoonLabel(i.unit)) return { quantity: i.quantity, unit: unit === "tbsp" ? "tbsp" : "tsp", converted: true, approx: false };
    return null;
  }
  return { ...usVolume(m), converted: true, approx: true };
}

export function convertIngredient(i: ConvertibleIngredient, system: UnitSystem, { scale = 1 }: { scale?: number } = {}): DisplayAmount {
  const parsed = parseQuantity(i.quantity);
  if (!parsed) return asWritten(i);
  const a = scaleAmount(parsed, scale);
  const unit = normalizeUnit(i.unit);
  // Stored classification wins; unclassified ingredients fall back to the density table.
  const cls = effectiveClassification(i);
  const category: IngredientCategory = cls.category;
  i = { ...i, category: cls.category, gramsPerCup: cls.gramsPerCup };

  if (system === "original" || !unit) return scaledOriginal(i, a, scale, unit);
  const m = toMeasure(unit, a, category);
  // Counted things ("3 eggs", "1 cup eggs"?) are never converted, except plain weights ("2 lb chicken thighs").
  if (!m || (category === "count" && m.kind !== "weight")) return scaledOriginal(i, a, scale, unit);

  const out = system === "metric" ? toMetric(i, unit, m, category) : toUs(i, unit, m);
  if (out) return out;
  const base = scaledOriginal(i, a, scale, unit);
  if (system === "metric" && isSpoon(unit) && m.kind === "volume") {
    const secondary = spoonEquivalent(m, category, i.gramsPerCup ?? null);
    if (secondary) return { ...base, secondary };
  }
  return base;
}

/** "≈ 120 g flour, sifted" style line for plain-text contexts. */
export function formatConvertedLine(
  i: ConvertibleIngredient & { item: string; note?: string },
  system: UnitSystem,
  opts?: { scale?: number },
): string {
  const d = convertIngredient(i, system, opts);
  let main = [d.approx ? "≈" : "", d.quantity, d.unit, i.item].filter(Boolean).join(" ");
  if (d.secondary) main += ` (≈ ${d.secondary.quantity} ${d.secondary.unit})`;
  return i.note ? `${main}, ${i.note}` : main;
}
