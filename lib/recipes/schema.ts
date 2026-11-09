import { z } from "zod";

/**
 * Canonical recipe shape shared by the database layer, the edit form, the
 * importers and the AI parser. Text fields default to "" rather than null to
 * keep forms simple; numeric fields that may be unknown are nullable.
 */

export const SOURCE_TYPES = ["photo", "text", "url", "social", "manual"] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

const text = (max: number) => z.string().trim().max(max).default("");
const minutes = z.number().int().min(0).max(60 * 24 * 14).nullable().default(null);

export const INGREDIENT_CATEGORIES = ["dry", "liquid", "fat", "count", "unknown"] as const;
export type IngredientCategory = (typeof INGREDIENT_CATEGORIES)[number];

export const IngredientSchema = z.object({
  /** As written in the source: "1 1/2", "½", "2-3", "a pinch". */
  quantity: text(40),
  /**
   * Numeric value of `quantity` when it's unambiguous (1.5 for "1 1/2"), so
   * servings scaling / shopping lists can be added later. Null when unknown.
   */
  quantityValue: z.number().min(0).max(100000).nullable().default(null),
  unit: text(40),
  item: z.string().trim().min(1).max(200),
  note: text(200),
  /** Section heading, e.g. "For the sauce". "" = no group. */
  group: text(100),
  /**
   * How the ingredient converts between unit systems (see lib/units). Null =
   * not classified yet; "unknown" = classified but we don't know.
   */
  category: z.enum(INGREDIENT_CATEGORIES).nullable().default(null),
  /** Weight of one US cup (240 ml) in grams, for dry/fat ingredients and thick liquids. */
  gramsPerCup: z.number().positive().max(2000).nullable().default(null),
});
export type Ingredient = z.infer<typeof IngredientSchema>;

export const StepSchema = z.object({
  text: z.string().trim().min(1).max(4000),
  group: text(100),
});
export type Step = z.infer<typeof StepSchema>;

/** Fields a user can edit (and the AI can produce). */
export const RecipeInputSchema = z.object({
  title: z.string().trim().min(1, "Give the recipe a title").max(200),
  description: text(2000),
  servings: z.number().int().min(1).max(500).nullable().default(null),
  prepTime: minutes,
  cookTime: minutes,
  totalTime: minutes,
  ingredients: z.array(IngredientSchema).max(200).default([]),
  steps: z.array(StepSchema).max(200).default([]),
  tags: z
    .array(z.string().trim().toLowerCase().min(1).max(40))
    .max(20)
    .default([])
    .transform((t) => [...new Set(t)]),
  cuisine: text(60),
  notes: text(4000),
  sourceType: z.enum(SOURCE_TYPES).default("manual"),
  sourceUrl: z.union([z.url({ protocol: /^https?$/ }).max(2000), z.literal("")]).default(""),
  sourceAuthor: text(200),
  imageUrl: z.union([z.url({ protocol: /^https?$/ }).max(2000), z.literal("")]).default(""),
  /** BCP-47-ish language of the recipe text, e.g. "nl", "en". */
  language: text(10),
});
export type RecipeInput = z.infer<typeof RecipeInputSchema>;
export type RecipeInputDraft = z.input<typeof RecipeInputSchema>;

/** A stored recipe. */
export const RecipeSchema = RecipeInputSchema.extend({
  id: z.string(),
  householdId: z.string(),
  inRotation: z.boolean().default(false),
  timesCooked: z.number().int().min(0).default(0),
  lastCookedAt: z.string().nullable().default(null),
  /** "Not this week": excluded from spins until this ISO timestamp. */
  skipUntil: z.string().nullable().default(null),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Recipe = z.infer<typeof RecipeSchema>;

/** Max raw source text we keep for re-parsing (well under DynamoDB's 400 KB). */
export const MAX_RAW_SOURCE_CHARS = 100_000;

/** Total time, falling back to prep + cook when total isn't given. */
export function effectiveTotalTime(r: Pick<Recipe, "totalTime" | "prepTime" | "cookTime">): number | null {
  if (r.totalTime != null) return r.totalTime;
  if (r.prepTime == null && r.cookTime == null) return null;
  return (r.prepTime ?? 0) + (r.cookTime ?? 0);
}
