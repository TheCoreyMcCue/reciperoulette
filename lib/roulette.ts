/**
 * Roulette selection. Pure functions so they're easy to test; the page runs
 * them in the browser on the rotation it already has.
 *
 * Rules:
 *  1. Only recipes in the rotation, matching the optional filters.
 *  2. "Not this week" (skipUntil in the future) is always excluded.
 *  3. Anything cooked in the last 7 days is excluded, unless that would leave
 *     fewer than MIN_POOL candidates; then they're allowed back in with a
 *     small weight.
 *  4. Light weighting: the longer since a recipe was cooked, the likelier it
 *     comes up; never-cooked recipes get a small boost.
 *  5. "Spin again" avoids landing on the same recipe twice in a row when
 *     there's an alternative.
 */

export type RouletteCandidate = {
  id: string;
  inRotation: boolean;
  lastCookedAt: string | null;
  skipUntil: string | null;
  totalTime: number | null;
  tags: string[];
};

export type RouletteFilters = {
  maxTime?: number | null;
  tag?: string | null;
  /** Avoid these if possible (e.g. the previous pick). */
  avoidIds?: string[];
};

export const RECENT_DAYS = 7;
export const MIN_POOL = 2;
const DAY = 86400_000;

export type Pool<T> = {
  entries: { recipe: T; weight: number }[];
  /** True when recently-cooked recipes had to be let back in. */
  relaxed: boolean;
  /** Why the pool is empty, if it is. */
  emptyReason: "no-rotation" | "filters" | "all-skipped" | null;
};

export function daysSince(iso: string | null, now: Date): number | null {
  if (!iso) return null;
  return (now.getTime() - new Date(iso).getTime()) / DAY;
}

export function weightFor(lastCookedAt: string | null, now: Date): number {
  const d = daysSince(lastCookedAt, now);
  if (d == null) return 1.25;
  if (d < RECENT_DAYS) return 0.15;
  if (d < 14) return 0.5;
  if (d < 28) return 0.8;
  return 1;
}

export function buildPool<T extends RouletteCandidate>(
  recipes: T[],
  filters: RouletteFilters = {},
  now: Date = new Date(),
): Pool<T> {
  const rotation = recipes.filter((r) => r.inRotation);
  if (!rotation.length) return { entries: [], relaxed: false, emptyReason: "no-rotation" };

  const filtered = rotation.filter(
    (r) =>
      (filters.maxTime == null || (r.totalTime != null && r.totalTime <= filters.maxTime)) &&
      (!filters.tag || r.tags.includes(filters.tag)),
  );
  if (!filtered.length) return { entries: [], relaxed: false, emptyReason: "filters" };

  const notSkipped = filtered.filter((r) => !r.skipUntil || new Date(r.skipUntil).getTime() <= now.getTime());
  if (!notSkipped.length) return { entries: [], relaxed: false, emptyReason: "all-skipped" };

  const notRecent = notSkipped.filter((r) => {
    const d = daysSince(r.lastCookedAt, now);
    return d == null || d >= RECENT_DAYS;
  });
  const relaxed = notRecent.length < MIN_POOL && notSkipped.length > notRecent.length;
  let chosen = relaxed ? notSkipped : notRecent;

  const avoid = new Set(filters.avoidIds ?? []);
  if (avoid.size && chosen.some((r) => !avoid.has(r.id))) chosen = chosen.filter((r) => !avoid.has(r.id));

  return {
    entries: chosen.map((recipe) => ({ recipe, weight: weightFor(recipe.lastCookedAt, now) })),
    relaxed,
    emptyReason: null,
  };
}

/** Weighted random pick. `rand` returns [0, 1). */
export function pickWeighted<T>(entries: { recipe: T; weight: number }[], rand: () => number = Math.random): T | null {
  const total = entries.reduce((s, e) => s + e.weight, 0);
  if (!entries.length || total <= 0) return null;
  let r = rand() * total;
  for (const e of entries) {
    r -= e.weight;
    if (r < 0) return e.recipe;
  }
  return entries[entries.length - 1]!.recipe;
}

export function spin<T extends RouletteCandidate>(
  recipes: T[],
  filters: RouletteFilters = {},
  now: Date = new Date(),
  rand: () => number = Math.random,
): { pick: T | null; pool: Pool<T> } {
  const pool = buildPool(recipes, filters, now);
  return { pick: pickWeighted(pool.entries, rand), pool };
}

/**
 * Sequence of items for the slot-machine reel, ending on `pick`. Uses the
 * whole pool for variety so even a 2-recipe rotation looks lively.
 */
export function buildReel<T extends { id: string }>(pool: T[], pick: T, length = 18, rand: () => number = Math.random): T[] {
  if (pool.length <= 1) return Array.from({ length: Math.min(length, 6) }, () => pick);
  // Built backwards from the pick so neighbours never repeat, even with 2 recipes.
  const reel: T[] = [pick];
  while (reel.length < length) {
    const options = pool.filter((p) => p.id !== reel[0]!.id);
    reel.unshift(options[Math.floor(rand() * options.length)]!);
  }
  return reel;
}
