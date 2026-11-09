import { effectiveTotalTime, type Recipe } from "./schema";

/** The slice of a recipe the list/roulette UI needs (keeps payloads small). */
export type RecipeSummary = {
  id: string;
  title: string;
  imageUrl: string;
  totalTime: number | null;
  tags: string[];
  cuisine: string;
  inRotation: boolean;
  timesCooked: number;
  lastCookedAt: string | null;
  skipUntil: string | null;
  createdAt: string;
  /** Lower-cased ingredient items, for search. */
  ingredientText: string;
};

export function toSummary(r: Recipe): RecipeSummary {
  return {
    id: r.id,
    title: r.title,
    imageUrl: r.imageUrl,
    totalTime: effectiveTotalTime(r),
    tags: r.tags,
    cuisine: r.cuisine,
    inRotation: r.inRotation,
    timesCooked: r.timesCooked,
    lastCookedAt: r.lastCookedAt,
    skipUntil: r.skipUntil,
    createdAt: r.createdAt,
    ingredientText: r.ingredients.map((i) => i.item.toLowerCase()).join(" · "),
  };
}

export function matchesSearch(r: RecipeSummary, query: string): boolean {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!terms.length) return true;
  const hay = `${r.title} ${r.tags.join(" ")} ${r.cuisine} ${r.ingredientText}`.toLowerCase();
  return terms.every((t) => hay.includes(t));
}
