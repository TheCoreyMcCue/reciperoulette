import { describe, expect, it } from "vitest";
import { buildPool, buildReel, pickWeighted, spin, weightFor, type RouletteCandidate } from "./roulette";

const now = new Date("2026-11-09T12:00:00Z");
const daysAgo = (d: number) => new Date(now.getTime() - d * 86400_000).toISOString();
const r = (id: string, o: Partial<RouletteCandidate> = {}): RouletteCandidate => ({
  id,
  inRotation: true,
  lastCookedAt: null,
  skipUntil: null,
  totalTime: 30,
  tags: [],
  ...o,
});
const ids = (p: { entries: { recipe: RouletteCandidate }[] }) => p.entries.map((e) => e.recipe.id).sort();

describe("buildPool", () => {
  it("only uses the rotation", () => {
    expect(ids(buildPool([r("a"), r("b", { inRotation: false }), r("c")], {}, now))).toEqual(["a", "c"]);
  });

  it("reports an empty rotation", () => {
    expect(buildPool([r("a", { inRotation: false })], {}, now).emptyReason).toBe("no-rotation");
    expect(buildPool([], {}, now).emptyReason).toBe("no-rotation");
  });

  it("excludes recipes cooked in the last 7 days", () => {
    const pool = buildPool([r("a", { lastCookedAt: daysAgo(2) }), r("b"), r("c", { lastCookedAt: daysAgo(10) })], {}, now);
    expect(ids(pool)).toEqual(["b", "c"]);
    expect(pool.relaxed).toBe(false);
  });

  it("lets recent recipes back in when the rotation is too small", () => {
    const pool = buildPool([r("a", { lastCookedAt: daysAgo(1) }), r("b"), r("c", { lastCookedAt: daysAgo(3) })], {}, now);
    expect(ids(pool)).toEqual(["a", "b", "c"]);
    expect(pool.relaxed).toBe(true);
    expect(pool.entries.find((e) => e.recipe.id === "a")!.weight).toBeLessThan(0.5);
  });

  it("always excludes 'not this week' recipes", () => {
    const pool = buildPool([r("a", { skipUntil: daysAgo(-3) }), r("b"), r("c"), r("d", { skipUntil: daysAgo(1) })], {}, now);
    expect(ids(pool)).toEqual(["b", "c", "d"]);
    expect(buildPool([r("a", { skipUntil: daysAgo(-3) })], {}, now).emptyReason).toBe("all-skipped");
  });

  it("applies time and tag filters", () => {
    const list = [r("quick", { totalTime: 20, tags: ["vegetarian"] }), r("slow", { totalTime: 90, tags: ["vegetarian"] }), r("unknown", { totalTime: null }), r("meat", { totalTime: 25 })];
    expect(ids(buildPool(list, { maxTime: 30 }, now))).toEqual(["meat", "quick"]);
    expect(ids(buildPool(list, { tag: "vegetarian" }, now))).toEqual(["quick", "slow"]);
    expect(ids(buildPool(list, { maxTime: 30, tag: "vegetarian" }, now))).toEqual(["quick"]);
    expect(buildPool(list, { maxTime: 5 }, now).emptyReason).toBe("filters");
  });

  it("avoids the previous pick when there's an alternative", () => {
    expect(ids(buildPool([r("a"), r("b")], { avoidIds: ["a"] }, now))).toEqual(["b"]);
    expect(ids(buildPool([r("a")], { avoidIds: ["a"] }, now))).toEqual(["a"]);
  });
});

describe("weighting", () => {
  it("prefers recipes not cooked for a while", () => {
    expect(weightFor(daysAgo(3), now)).toBeLessThan(weightFor(daysAgo(10), now));
    expect(weightFor(daysAgo(10), now)).toBeLessThan(weightFor(daysAgo(20), now));
    expect(weightFor(daysAgo(20), now)).toBeLessThan(weightFor(daysAgo(60), now));
    expect(weightFor(null, now)).toBeGreaterThan(weightFor(daysAgo(60), now));
  });

  it("pickWeighted follows the weights", () => {
    const entries = [{ recipe: "a", weight: 1 }, { recipe: "b", weight: 3 }];
    expect(pickWeighted(entries, () => 0)).toBe("a");
    expect(pickWeighted(entries, () => 0.24)).toBe("a");
    expect(pickWeighted(entries, () => 0.26)).toBe("b");
    expect(pickWeighted(entries, () => 0.9999)).toBe("b");
    expect(pickWeighted([], () => 0.5)).toBeNull();
  });

  it("is roughly proportional over many spins", () => {
    let seed = 42;
    const rand = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
    const list = [r("fresh", { lastCookedAt: daysAgo(60) }), r("meh", { lastCookedAt: daysAgo(10) })];
    const counts: Record<string, number> = { fresh: 0, meh: 0 };
    for (let i = 0; i < 4000; i++) counts[spin(list, {}, now, rand).pick!.id]!++;
    // weights 1 : 0.5 → ~2:1
    expect(counts.fresh! / counts.meh!).toBeGreaterThan(1.7);
    expect(counts.fresh! / counts.meh!).toBeLessThan(2.3);
  });
});

describe("buildReel", () => {
  it("ends on the pick without repeating neighbours", () => {
    const pool = [r("a"), r("b"), r("c")];
    const reel = buildReel(pool, pool[1]!, 18);
    expect(reel).toHaveLength(18);
    expect(reel.at(-1)!.id).toBe("b");
    for (let i = 1; i < reel.length; i++) expect(reel[i]!.id).not.toBe(reel[i - 1]!.id);
  });

  it("handles a single-recipe pool", () => {
    const reel = buildReel([r("a")], r("a"));
    expect(reel.every((x) => x.id === "a")).toBe(true);
  });
});
