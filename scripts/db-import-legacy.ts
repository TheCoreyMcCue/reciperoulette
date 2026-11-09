/**
 * Imports recipes exported from the old MongoDB recipe app.
 *
 *   pnpm db:import-legacy --email you@example.com              # dry run (default): report only
 *   pnpm db:import-legacy --email you@example.com --commit     # write new recipes
 *   pnpm db:import-legacy --email you@example.com --commit --overwrite   # also replace earlier imports
 *
 * Options: --file <path> (default scripts/data/legacy-recipes.txt), --no-ai.
 * Optional scripts/data/legacy-known-issues.json: { "<title>": ["issue", …] }
 * adds already-known problems to the report.
 *
 * Idempotent: recipes whose legacyId already exists in the household are
 * skipped unless --overwrite. All writes go through lib/db and every recipe
 * is validated with the app's Zod schema. The AI is only used, on --commit,
 * to classify ingredients the density table doesn't cover.
 */
import { existsSync, readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { classifyIngredientsWithAi } from "@/lib/ai/classify";
import { createRecipe, listRecipes, replaceImportedRecipe } from "@/lib/db/recipes";
import { logUsage } from "@/lib/db/usage";
import { getHousehold, getUserByEmail } from "@/lib/db/users";
import { env } from "@/lib/env";
import { mapLegacyRecord, type MappedRecipe } from "@/lib/importers/legacy/map";
import { parseMongoExport } from "@/lib/importers/legacy/mongo";
import { findPossibleDuplicates, formatReport, similarExisting, type ReportInput } from "@/lib/importers/legacy/report";
import { RecipeInputSchema } from "@/lib/recipes/schema";

const { values } = parseArgs({
  options: {
    email: { type: "string" },
    file: { type: "string", default: "scripts/data/legacy-recipes.txt" },
    commit: { type: "boolean", default: false },
    overwrite: { type: "boolean", default: false },
    "no-ai": { type: "boolean", default: false },
  },
});

async function main() {
  if (!values.email) throw new Error("Pass --email of the user whose household should receive the recipes.");
  if (values.overwrite && !values.commit) console.log("(--overwrite has no effect without --commit; showing what would be replaced)");
  if (!existsSync(values.file!)) throw new Error(`File not found: ${values.file}`);

  const user = await getUserByEmail(values.email);
  if (!user) throw new Error(`No user with email ${values.email}`);
  const household = await getHousehold(user.householdId);

  const knownPath = "scripts/data/legacy-known-issues.json";
  const known: Record<string, string[]> = existsSync(knownPath) ? JSON.parse(readFileSync(knownPath, "utf8")) : {};
  const knownFor = (title: string) =>
    Object.entries(known).find(([t]) => t.trim().toLowerCase() === title.trim().toLowerCase())?.[1] ?? [];

  const parsed = parseMongoExport(readFileSync(values.file!, "utf8"));
  const importedAt = new Date();
  const mappedOnly: MappedRecipe[] = parsed.records.map((r) => mapLegacyRecord(r, importedAt));

  const existing = await listRecipes(user.householdId);
  const byLegacyId = new Map(existing.filter((r) => r.legacyId).map((r) => [r.legacyId!, r]));
  const nonImportedTitles = existing.filter((r) => !r.legacyId).map((r) => r.title);

  const mapped: ReportInput["mapped"] = mappedOnly.map((m) => ({
    ...m,
    status: byLegacyId.has(m.legacyId) ? (values.overwrite ? "overwrite" : "exists") : "new",
    knownIssues: knownFor(m.title),
    similarTo: similarExisting(m.title, nonImportedTitles),
  }));

  const report = formatReport({
    mapped,
    duplicatesDropped: parsed.duplicatesDropped,
    parseErrors: parsed.errors,
    possibleDuplicates: findPossibleDuplicates(mappedOnly),
    mode: values.commit ? "commit" : "dry-run",
    email: values.email,
    householdName: household?.name ?? user.householdId,
  });
  console.log(report);

  if (!values.commit) {
    console.log("\nDry run: nothing was written. Re-run with --commit to import.");
    return;
  }

  const useAi = !values["no-ai"] && !!env().ANTHROPIC_API_KEY;
  let created = 0;
  let replaced = 0;
  let skipped = 0;
  for (const m of mapped) {
    if (m.status === "exists") {
      skipped++;
      continue;
    }
    let input = m.input;
    const pending = input.ingredients.map((i, n) => ({ i, n })).filter(({ i }) => i.category === null);
    if (useAi && pending.length) {
      try {
        const { results, usage } = await classifyIngredientsWithAi(pending.map(({ i }) => [i.item, i.note].filter(Boolean).join(", ")));
        const ingredients = [...input.ingredients];
        pending.forEach(({ n }, idx) => {
          const c = results.get(idx);
          if (c) ingredients[n] = { ...ingredients[n]!, ...c };
        });
        input = RecipeInputSchema.parse({ ...input, ingredients });
        await logUsage({
          householdId: user.householdId, userId: user.userId, model: usage.model, source: "legacy-import",
          inputTokens: usage.inputTokens, outputTokens: usage.outputTokens, cacheReadTokens: 0, cacheWriteTokens: 0, durationMs: 0, ok: true,
        }).catch(() => {});
      } catch (err) {
        console.warn(`  ! AI classification failed for "${m.title}" (${err instanceof Error ? err.message : err}); continuing without it`);
      }
    }
    if (m.status === "overwrite") {
      await replaceImportedRecipe(byLegacyId.get(m.legacyId)!, input, m.createdAt);
      replaced++;
    } else {
      await createRecipe({
        householdId: user.householdId,
        userId: user.userId,
        input,
        inRotation: m.inRotation,
        createdAt: m.createdAt,
        legacyId: m.legacyId,
      });
      created++;
    }
  }
  console.log(`\nCommitted: ${created} created, ${replaced} replaced, ${skipped} skipped (already imported).`);
}

main().catch((err) => {
  console.error("✗ db:import-legacy failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
