/**
 * Classifies ingredients on existing recipes for unit conversion.
 *
 *   pnpm db:backfill-units             # table first, then Claude for the rest
 *   pnpm db:backfill-units --dry-run   # show what would change, write nothing
 *   pnpm db:backfill-units --no-ai     # density table only (free)
 *   pnpm db:backfill-units --force     # re-ask Claude even for classified items
 *
 * Only `ingredients` is written, and only if the recipe hasn't been edited
 * since it was read (updatedAt check); updatedAt itself is left untouched.
 * Safe to re-run. Needs dynamodb:Scan (see README).
 */
import { classifyIngredientsWithAi } from "@/lib/ai/classify";
import { replaceIngredientsIfUnchanged, scanAllRecipes } from "@/lib/db/recipes";
import { logUsage } from "@/lib/db/usage";
import { env } from "@/lib/env";
import { backfillIngredients, type AiClassifier } from "@/lib/units/backfill";

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const force = args.has("--force");
const useAi = !args.has("--no-ai") && !!env().ANTHROPIC_API_KEY;

async function main() {
  console.log(`→ Backfilling unit classifications${dryRun ? " (dry run)" : ""}${useAi ? "" : " (table only)"}${force ? " (force)" : ""}`);
  if (!args.has("--no-ai") && !useAi) console.log("  ANTHROPIC_API_KEY not set: using the density table only.");

  const totals = { recipes: 0, updated: 0, skippedEdited: 0, fromTable: 0, fromAi: 0, unresolved: 0, inputTokens: 0, outputTokens: 0 };
  const unresolvedItems = new Set<string>();

  for await (const recipe of scanAllRecipes()) {
    totals.recipes++;
    const ai: AiClassifier | undefined = useAi
      ? async (items) => {
          const { results, usage } = await classifyIngredientsWithAi(items);
          totals.inputTokens += usage.inputTokens;
          totals.outputTokens += usage.outputTokens;
          if (!dryRun) {
            await logUsage({
              householdId: recipe.householdId,
              userId: "backfill",
              model: usage.model,
              source: "backfill-units",
              inputTokens: usage.inputTokens,
              outputTokens: usage.outputTokens,
              cacheReadTokens: 0,
              cacheWriteTokens: 0,
              durationMs: 0,
              ok: true,
            }).catch(() => {});
          }
          return results;
        }
      : undefined;

    let result;
    try {
      result = await backfillIngredients(recipe.ingredients, { ai, force });
    } catch (err) {
      console.error(`  ✗ "${recipe.title}": AI classification failed (${err instanceof Error ? err.message : err}); using table only`);
      result = await backfillIngredients(recipe.ingredients, { force });
    }
    totals.fromTable += result.fromTable;
    totals.fromAi += result.fromAi;
    totals.unresolved += result.unresolved;
    result.ingredients.filter((i) => i.category === null).forEach((i) => unresolvedItems.add(i.item));

    if (!result.changed) continue;
    const summary = result.ingredients
      .filter((i, n) => i.category !== recipe.ingredients[n]!.category || i.gramsPerCup !== recipe.ingredients[n]!.gramsPerCup)
      .map((i) => `${i.item}=${i.category}${i.gramsPerCup ? `/${i.gramsPerCup}g` : ""}`)
      .join(", ");
    if (dryRun) {
      console.log(`  ~ "${recipe.title}": ${summary}`);
      totals.updated++;
      continue;
    }
    const ok = await replaceIngredientsIfUnchanged(recipe.householdId, recipe.id, result.ingredients, recipe.updatedAt);
    if (ok) {
      totals.updated++;
      console.log(`  ✓ "${recipe.title}": ${summary}`);
    } else {
      totals.skippedEdited++;
      console.log(`  ! "${recipe.title}" was edited while we ran; skipped (re-run to pick it up)`);
    }
  }

  console.log(
    `Done. ${totals.recipes} recipes, ${totals.updated} ${dryRun ? "would be " : ""}updated, ${totals.skippedEdited} skipped. ` +
      `Classified ${totals.fromTable} from the table, ${totals.fromAi} by AI; ${totals.unresolved} unresolved.`,
  );
  if (totals.inputTokens) console.log(`AI usage: ${totals.inputTokens} input / ${totals.outputTokens} output tokens.`);
  if (unresolvedItems.size) console.log(`Unresolved (shown as written): ${[...unresolvedItems].slice(0, 30).join(", ")}`);
}

main().catch((err) => {
  console.error("✗ db:backfill-units failed:", err instanceof Error ? `${err.name}: ${err.message}` : err);
  process.exit(1);
});
