import "server-only";
import { parseRecipe, type ImageInput, type ParseContext } from "@/lib/ai/parse-recipe";
import type { ImportResponse } from "./types";

/** Images go to Claude and are then discarded; we never store them. */
export async function importFromImages(
  images: ImageInput[],
  extraText: string | undefined,
  translate: boolean,
  ctx: ParseContext,
): Promise<ImportResponse> {
  const result = await parseRecipe(
    { images, text: extraText, translateToEnglish: translate, meta: { sourceType: "photo" } },
    ctx,
  );
  if (result.status === "not_recipe") return { ...result, suggestion: "text" };
  return result;
}
