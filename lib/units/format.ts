/** Rounding and display of converted amounts. */

const FRACTIONS: [number, string][] = [
  [1 / 8, "⅛"],
  [1 / 4, "¼"],
  [1 / 3, "⅓"],
  [1 / 2, "½"],
  [2 / 3, "⅔"],
  [3 / 4, "¾"],
];

/**
 * Which fractions make sense for a measure: cups come in thirds and quarters,
 * spoons and pounds in halves and quarters (eighths for teaspoons).
 */
export type FractionSet = "cup" | "spoon" | "tsp" | "quarters" | "any";
const SETS: Record<FractionSet, number[]> = {
  cup: [1 / 4, 1 / 3, 1 / 2, 2 / 3, 3 / 4],
  spoon: [1 / 4, 1 / 2, 3 / 4],
  tsp: [1 / 8, 1 / 4, 1 / 2, 3 / 4],
  quarters: [1 / 4, 1 / 2, 3 / 4],
  any: [1 / 8, 1 / 4, 1 / 3, 1 / 2, 2 / 3, 3 / 4],
};

/** US-style friendly number: 1.5 → "1 ½", 0.33 → "⅓" (for sets that allow thirds). */
export function friendlyFraction(value: number, { set = "cup" }: { set?: FractionSet } = {}): string {
  if (!Number.isFinite(value) || value <= 0) return "0";
  if (value >= 10) return String(Math.round(value));
  const options = FRACTIONS.filter(([f]) => SETS[set].includes(f));
  let whole = Math.floor(value);
  const frac = value - whole;
  let best: [number, string] = [0, ""];
  for (const opt of [[0, ""] as [number, string], ...options, [1, ""] as [number, string]]) {
    if (Math.abs(frac - opt[0]) < Math.abs(frac - best[0])) best = opt;
  }
  if (best[0] === 1) {
    whole += 1;
    best = [0, ""];
  }
  if (whole === 0 && !best[1]) return options[0]![1]; // never show "0"
  if (!best[1]) return String(whole);
  return whole ? `${whole} ${best[1]}` : best[1];
}

const roundTo = (v: number, step: number) => Math.max(step, Math.round(v / step) * step);

/** Practical precision: 1 g under 50 g, 5 g under 250 g, then 10 g. */
export function roundGrams(g: number): number {
  if (g < 50) return Math.max(1, Math.round(g));
  if (g < 250) return roundTo(g, 5);
  return roundTo(g, 10);
}

/** 5 ml under 500 ml, then 10 ml. */
export function roundMl(ml: number): number {
  if (ml < 500) return roundTo(ml, 5);
  return roundTo(ml, 10);
}

const oneDecimal = (v: number) => {
  const r = Math.round(v * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
};

export function joinRange(low: string, high: string | null): string {
  return high && high !== low ? `${low}–${high}` : low;
}

/** Metric weight display for a (possibly ranged) amount in grams. */
export function formatGrams(low: number, high: number | null, { exact = false } = {}): { quantity: string; unit: string } {
  const max = high ?? low;
  if (max >= 1000) return { quantity: joinRange(oneDecimal(low / 1000), high == null ? null : oneDecimal(high / 1000)), unit: "kg" };
  const r = (g: number) => String(exact ? Math.round(g) : roundGrams(g));
  return { quantity: joinRange(r(low), high == null ? null : r(high)), unit: "g" };
}

export function formatMl(low: number, high: number | null): { quantity: string; unit: string } {
  const max = high ?? low;
  if (max >= 1000) return { quantity: joinRange(oneDecimal(low / 1000), high == null ? null : oneDecimal(high / 1000)), unit: "l" };
  return { quantity: joinRange(String(roundMl(low)), high == null ? null : String(roundMl(high))), unit: "ml" };
}

/** Plain number for scaled amounts that stay in their original unit. */
export function formatPlain(v: number, usStyle: boolean): string {
  if (usStyle) return friendlyFraction(v, { set: "any" });
  if (v >= 10) return String(Math.round(v));
  return oneDecimal(v);
}
