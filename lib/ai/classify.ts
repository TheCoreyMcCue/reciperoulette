import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { env } from "@/lib/env";
import { sanitizeClassification, type Classification } from "@/lib/units/classify";
import { anthropic } from "./client";

/**
 * Classifies ingredient names for unit conversion (used by the backfill; new
 * imports get this from parseRecipe). Results are sanitised; the density
 * table is applied separately and always wins.
 */

const ResultSchema = z.object({
  ingredients: z.array(
    z.object({
      index: z.number().describe("Index of the ingredient in the input list."),
      category: z.enum(["dry", "liquid", "fat", "count", "unknown"]),
      gramsPerCup: z.number().nullable(),
    }),
  ),
});

const PROMPT = `You classify recipe ingredients for unit conversion. For each numbered ingredient, return:
- category: "dry" (flours, sugars, grains, rice, pasta, oats, powders, spices, nuts, seeds, grated/shredded cheese, chopped vegetables, fruit), "fat" (butter, margarine, shortening, lard, solid coconut oil, nut butters, cream cheese), "liquid" (water, milk, cream, stock, oils, wine, juice, vinegar, sauces, honey, syrups, yogurt), "count" (eggs, whole vegetables or fruit, garlic cloves, cans, packages, pinches), or "unknown".
- gramsPerCup: estimated grams in one US cup (240 ml) as described (chopped, grated, packed), for dry and fat ingredients and thick liquids such as honey, syrups and yogurt; null for thin liquids, counted items, or if you can't estimate.
Ingredient names may be in Dutch or other languages. Return one entry per input index.`;

export type UsageInfo = { inputTokens: number; outputTokens: number; model: string };

export async function classifyIngredientsWithAi(
  items: string[],
): Promise<{ results: Map<number, Classification>; usage: UsageInfo }> {
  const model = env().ANTHROPIC_MODEL;
  const res = await anthropic().beta.messages.parse({
    model,
    max_tokens: 8000,
    output_config: { effort: "low", format: betaZodOutputFormat(ResultSchema) },
    system: [{ type: "text", text: PROMPT, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: items.map((item, i) => `${i}. ${item}`).join("\n") }],
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
  });
  const results = new Map<number, Classification>();
  const parsed = ResultSchema.safeParse(res.parsed_output);
  if (res.stop_reason !== "refusal" && parsed.success) {
    for (const r of parsed.data.ingredients) {
      const c = sanitizeClassification(r.category, r.gramsPerCup);
      if (c && Number.isInteger(r.index) && r.index >= 0 && r.index < items.length) results.set(r.index, c);
    }
  }
  return { results, usage: { inputTokens: res.usage.input_tokens, outputTokens: res.usage.output_tokens, model: res.model } };
}
