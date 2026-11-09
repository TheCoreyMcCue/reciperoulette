import { parseQuantityValue } from "@/lib/recipes/ingredients";
import { classifyIngredient, sanitizeClassification } from "@/lib/units/classify";
import { RecipeInputSchema, type RecipeInput, type SourceType } from "@/lib/recipes/schema";
import type { AiRecipe } from "./schema";

const clip = (s: unknown, max: number) => (typeof s === "string" ? s.trim().slice(0, max) : "");
const mins = (n: unknown) =>
  typeof n === "number" && Number.isFinite(n) && n > 0 && n <= 60 * 24 * 14 ? Math.round(n) : null;
const servings = (n: unknown) => (typeof n === "number" && Number.isFinite(n) && n >= 1 && n <= 500 ? Math.round(n) : null);

export type SourceMeta = {
  sourceType: SourceType;
  sourceUrl?: string;
  sourceAuthor?: string;
  imageUrl?: string;
};

/**
 * Maps (possibly imperfect) AI output onto the app's RecipeInput, clipping
 * lengths, dropping empty rows and filling the source fields we already know.
 * Lenient by design: used both for the happy path and for the "show whatever
 * we got" fallback.
 */
export function aiToRecipeInput(ai: Partial<AiRecipe>, meta: SourceMeta): RecipeInput {
  const ingredients = (Array.isArray(ai.ingredients) ? ai.ingredients : [])
    .filter((i) => i && clip(i.item, 200))
    .slice(0, 200)
    .map((i) => {
      const quantity = clip(i.quantity, 40);
      const qv = typeof i.quantityValue === "number" && Number.isFinite(i.quantityValue) && i.quantityValue >= 0 ? i.quantityValue : null;
      const ai = sanitizeClassification(i.category, i.gramsPerCup);
      // Table values win over the AI's estimate.
      return classifyIngredient({
        quantity,
        quantityValue: qv ?? parseQuantityValue(quantity),
        unit: clip(i.unit, 40),
        item: clip(i.item, 200),
        note: clip(i.note, 200),
        group: clip(i.group, 100),
        category: ai?.category ?? null,
        gramsPerCup: ai?.gramsPerCup ?? null,
      });
    });
  const steps = (Array.isArray(ai.steps) ? ai.steps : [])
    .filter((s) => s && clip(s.text, 4000))
    .slice(0, 200)
    .map((s) => ({ text: clip(s.text, 4000), group: clip(s.group, 100) }));
  const tags = (Array.isArray(ai.tags) ? ai.tags : [])
    .map((t) => clip(t, 40).toLowerCase())
    .filter(Boolean)
    .slice(0, 20);

  const draft = {
    title: clip(ai.title, 200) || "Untitled recipe",
    description: clip(ai.description, 2000),
    servings: servings(ai.servings),
    prepTime: mins(ai.prepTimeMinutes),
    cookTime: mins(ai.cookTimeMinutes),
    totalTime: mins(ai.totalTimeMinutes),
    ingredients,
    steps,
    tags,
    cuisine: clip(ai.cuisine, 60),
    notes: "",
    sourceType: meta.sourceType,
    sourceUrl: meta.sourceUrl ?? "",
    sourceAuthor: clip(meta.sourceAuthor || ai.sourceAuthor, 200),
    imageUrl: meta.imageUrl ?? "",
    language: clip(ai.language, 10).toLowerCase(),
  };
  const parsed = RecipeInputSchema.safeParse(draft);
  if (parsed.success) return parsed.data;
  // Drop whichever optional URL failed validation rather than losing the recipe.
  return RecipeInputSchema.parse({ ...draft, sourceUrl: "", imageUrl: "" });
}
