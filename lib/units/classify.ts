import { INGREDIENT_CATEGORIES, type Ingredient, type IngredientCategory } from "@/lib/recipes/schema";
import { DENSITIES, type DensityEntry } from "./densities";

/**
 * Ingredient classification for unit conversion. Runs when recipes are
 * saved/imported (never at display time): table hits win, otherwise the AI's
 * estimate is kept (sanitised), otherwise the ingredient stays unclassified.
 */

export type Classification = { category: IngredientCategory; gramsPerCup: number | null };

function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Very small English plural stemmer, applied to both sides so matching is consistent. */
export function stem(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.endsWith("oes")) return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

const tokens = (s: string) => normalizeText(s).split(" ").filter(Boolean).map(stem);

type Alias = { tokens: string[]; entry: DensityEntry; name: string };
const ALIASES: Alias[] = DENSITIES.flatMap((entry) => entry.names.map((name) => ({ tokens: tokens(name), entry, name })));

type Match = { alias: Alias; n: number; contiguous: boolean; end: number };

/** Allows a couple of extra words inside an alias ("brown cane sugar" ⊇ "brown sugar"). */
const MAX_GAP = 2;

function gappedEnd(alias: string[], t: string[]): number | null {
  // Earliest in-order occurrence of the alias tokens with at most MAX_GAP extra words in between.
  for (let start = 0; start < t.length; start++) {
    if (t[start] !== alias[0]) continue;
    let pos = start;
    let gaps = 0;
    let ok = true;
    for (let j = 1; j < alias.length && ok; j++) {
      let k = pos + 1;
      while (k < t.length && t[k] !== alias[j]) k++;
      if (k >= t.length) ok = false;
      else {
        gaps += k - pos - 1;
        pos = k;
      }
    }
    if (ok && gaps <= MAX_GAP) return pos + 1;
  }
  return null;
}

const better = (a: Match, b: Match | null) =>
  !b || a.n > b.n || (a.n === b.n && a.contiguous && !b.contiguous) || (a.n === b.n && a.contiguous === b.contiguous && a.end > b.end);

const cache = new Map<string, (DensityEntry & { matched: string }) | null>();

/**
 * Finds the table entry for an ingredient name, forgivingly: case, accents,
 * punctuation and plurals are ignored, extra words around (and a few inside)
 * an alias are allowed. Most matched words wins, then contiguous matches,
 * then the match ending last (the head noun: "rice vinegar" → vinegar).
 */
export function lookupDensity(item: string): (DensityEntry & { matched: string }) | null {
  const key = item.trim().toLowerCase();
  if (cache.has(key)) return cache.get(key)!;
  const t = tokens(item);
  let best: Match | null = null;
  for (const alias of ALIASES) {
    const n = alias.tokens.length;
    if (!n || n > t.length) continue;
    let found: Match | null = null;
    for (let i = 0; i + n <= t.length; i++) {
      if (alias.tokens.every((tok, j) => t[i + j] === tok)) found = { alias, n, contiguous: true, end: i + n };
    }
    if (!found && n > 1) {
      const end = gappedEnd(alias.tokens, t);
      if (end != null) found = { alias, n, contiguous: false, end };
    }
    if (found && better(found, best)) best = found;
  }
  const result = best ? { ...best.alias.entry, matched: best.alias.name } : null;
  if (cache.size > 5000) cache.clear();
  cache.set(key, result);
  return result;
}

/**
 * The classification to use when converting: stored values win; if there's
 * no stored density, fall back to the table (so never-classified recipes
 * still convert for common ingredients).
 */
export function effectiveClassification(ing: { item?: string; category?: IngredientCategory | null; gramsPerCup?: number | null }): Classification {
  const stored: Classification = { category: ing.category ?? "unknown", gramsPerCup: ing.gramsPerCup ?? null };
  if (stored.gramsPerCup != null || !ing.item) return stored;
  const table = classifyFromTable(ing.item);
  if (!table) return stored;
  // Only borrow from the table when the stored category doesn't contradict it.
  if (ing.category == null || ing.category === "unknown" || ing.category === table.category) return table;
  return stored;
}

export function classifyFromTable(item: string): Classification | null {
  const hit = lookupDensity(item);
  return hit ? { category: hit.category, gramsPerCup: hit.gramsPerCup ?? null } : null;
}

/** Water is ~240 g/cup; only keep AI densities for liquids clearly thicker than that (honey, syrups). */
const THICK_LIQUID_MIN = 276;

/** Cleans up an AI (or otherwise untrusted) classification. */
export function sanitizeClassification(category: unknown, gramsPerCup: unknown): Classification | null {
  if (typeof category !== "string" || !(INGREDIENT_CATEGORIES as readonly string[]).includes(category)) return null;
  const cat = category as IngredientCategory;
  let g = typeof gramsPerCup === "number" && Number.isFinite(gramsPerCup) && gramsPerCup >= 10 && gramsPerCup <= 1500 ? Math.round(gramsPerCup) : null;
  if (cat === "count" || cat === "unknown") g = null;
  if (cat === "liquid" && g != null && g < THICK_LIQUID_MIN) g = null;
  return { category: cat, gramsPerCup: g };
}

/** Applies the table (which always wins) and sanitises whatever was there before. */
export function classifyIngredient<T extends Pick<Ingredient, "item" | "category" | "gramsPerCup">>(ing: T): T {
  const table = classifyFromTable(ing.item);
  if (table) return { ...ing, ...table };
  const existing = sanitizeClassification(ing.category, ing.gramsPerCup);
  return { ...ing, category: existing?.category ?? null, gramsPerCup: existing?.gramsPerCup ?? null };
}

export function classifyIngredients<T extends Pick<Ingredient, "item" | "category" | "gramsPerCup">>(ings: T[]): T[] {
  return ings.map(classifyIngredient);
}
