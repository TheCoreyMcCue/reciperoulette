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

/** Finds the table entry for an ingredient name: longest alias wins, then the one ending last (the head noun). */
export function lookupDensity(item: string): (DensityEntry & { matched: string }) | null {
  const t = tokens(item);
  let best: { alias: Alias; end: number } | null = null;
  for (const alias of ALIASES) {
    const n = alias.tokens.length;
    for (let i = 0; i + n <= t.length; i++) {
      if (alias.tokens.every((tok, j) => t[i + j] === tok)) {
        const end = i + n;
        if (!best || n > best.alias.tokens.length || (n === best.alias.tokens.length && end > best.end)) best = { alias, end };
      }
    }
  }
  return best ? { ...best.alias.entry, matched: best.alias.name } : null;
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
