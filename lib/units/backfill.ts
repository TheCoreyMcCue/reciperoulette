import type { Ingredient } from "@/lib/recipes/schema";
import { classifyFromTable, sanitizeClassification, type Classification } from "./classify";

/**
 * Pure core of `pnpm db:backfill-units`: decides classifications for one
 * recipe's ingredients. The AI classifier is injected so this is testable.
 *
 *  1. Table hits always win (and overwrite older values).
 *  2. Existing valid classifications are kept, unless `force` (re-ask the AI).
 *  3. Whatever is still unclassified goes to the AI, if available.
 */
export type AiClassifier = (items: string[]) => Promise<Map<number, Classification>>;

export type BackfillResult = {
  ingredients: Ingredient[];
  changed: boolean;
  fromTable: number;
  fromAi: number;
  unresolved: number;
};

export async function backfillIngredients(
  ingredients: Ingredient[],
  { ai, force = false }: { ai?: AiClassifier; force?: boolean } = {},
): Promise<BackfillResult> {
  let fromTable = 0;
  const out = ingredients.map((i): Ingredient => {
    const table = classifyFromTable(i.item);
    if (table) {
      if (table.category !== i.category || table.gramsPerCup !== i.gramsPerCup) fromTable++;
      return { ...i, ...table };
    }
    const existing = force ? null : sanitizeClassification(i.category, i.gramsPerCup);
    return { ...i, category: existing?.category ?? null, gramsPerCup: existing?.gramsPerCup ?? null };
  });

  let fromAi = 0;
  const pending = out.flatMap((i, n) => (i.category === null ? [n] : []));
  if (ai && pending.length) {
    const results = await ai(pending.map((n) => [out[n]!.item, out[n]!.note].filter(Boolean).join(", ")));
    pending.forEach((n, idx) => {
      const c = results.get(idx);
      if (c) {
        out[n] = { ...out[n]!, ...c };
        fromAi++;
      }
    });
  }

  return {
    ingredients: out,
    changed: out.some((i, n) => i.category !== ingredients[n]!.category || i.gramsPerCup !== ingredients[n]!.gramsPerCup),
    fromTable,
    fromAi,
    unresolved: out.filter((i) => i.category === null).length,
  };
}
