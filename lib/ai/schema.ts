import { z } from "zod";

/**
 * The JSON shape Claude must return (enforced with structured outputs).
 * Kept free of numeric/length constraints (unsupported by structured
 * outputs); we map it onto the stricter RecipeInputSchema afterwards.
 */
export const AiIngredientSchema = z.object({
  quantity: z.string().describe('Quantity exactly as written, e.g. "1 1/2", "200", "2-3". Empty if none.'),
  quantityValue: z.number().nullable().describe("Numeric value of quantity if unambiguous (1.5 for 1 1/2), else null."),
  unit: z.string().describe('Unit as written, e.g. "g", "el", "cups". Empty if none.'),
  item: z.string().describe("The ingredient itself."),
  note: z.string().describe('Preparation or extra note, e.g. "finely chopped", "optional". Empty if none.'),
  group: z.string().describe('Section heading the ingredient belongs to, e.g. "For the sauce". Empty if none.'),
});

export const AiStepSchema = z.object({
  text: z.string(),
  group: z.string().describe("Section heading for this step, if the source groups steps. Empty if none."),
});

export const AiRecipeSchema = z.object({
  isRecipe: z.boolean().describe("False if the input does not contain a recipe."),
  notRecipeReason: z.string().describe("If isRecipe is false, a short friendly explanation. Otherwise empty."),
  title: z.string(),
  description: z.string(),
  servings: z.number().nullable(),
  prepTimeMinutes: z.number().nullable(),
  cookTimeMinutes: z.number().nullable(),
  totalTimeMinutes: z.number().nullable(),
  ingredients: z.array(AiIngredientSchema),
  steps: z.array(AiStepSchema),
  tags: z.array(z.string()).describe("3-6 short lower-case tags."),
  cuisine: z.string(),
  language: z.string().describe('ISO 639-1 code of the language the output is written in, e.g. "nl", "en".'),
  sourceAuthor: z.string().describe("Author, chef, blog or account name if stated in the source. Empty if unknown."),
  warnings: z.array(z.string()).describe("Short notes for the user about anything unclear, missing or illegible."),
});

export type AiRecipe = z.infer<typeof AiRecipeSchema>;
