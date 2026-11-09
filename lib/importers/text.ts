import "server-only";
import { parseRecipe, type ParseContext } from "@/lib/ai/parse-recipe";
import type { ImportResponse } from "./types";

export async function importFromText(text: string, translate: boolean, ctx: ParseContext): Promise<ImportResponse> {
  const result = await parseRecipe({ text, translateToEnglish: translate, meta: { sourceType: "text" } }, ctx);
  if (result.status === "not_recipe") return { ...result, suggestion: "manual" };
  return result;
}
