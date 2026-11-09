import "server-only";
import { aiToRecipeInput } from "@/lib/ai/map";
import { parseRecipe, type ParseContext } from "@/lib/ai/parse-recipe";
import { RecipeInputSchema, type RecipeInput } from "@/lib/recipes/schema";
import { FetchError, fetchPage } from "./fetch-page";
import { extractMeta, extractReadableText } from "./html";
import { extractJsonLdRecipe, isCompleteRecipe, type JsonLdRecipe } from "./jsonld";
import { findSocialAdapter, importFromSocial } from "./social";
import { UnsafeUrlError, assertSafeUrl } from "./ssrf";
import type { ImportResponse } from "./types";

function jsonLdToInput(r: JsonLdRecipe, url: string, imageUrl: string): RecipeInput {
  const draft = {
    title: r.title || "Untitled recipe",
    description: r.description,
    servings: r.servings,
    prepTime: r.prepTime,
    cookTime: r.cookTime,
    totalTime: r.totalTime,
    ingredients: r.ingredients,
    steps: r.steps,
    tags: r.tags,
    cuisine: r.cuisine,
    sourceType: "url" as const,
    sourceUrl: url,
    sourceAuthor: r.author,
    imageUrl,
    language: r.language,
  };
  const parsed = RecipeInputSchema.safeParse(draft);
  return parsed.success ? parsed.data : RecipeInputSchema.parse({ ...draft, imageUrl: "", sourceUrl: "" });
}

/** What we send the model when structured data exists: raw strings, so it does the splitting. */
function jsonLdForAi(r: JsonLdRecipe) {
  return {
    name: r.title,
    description: r.description,
    recipeYield: r.servings,
    prepTimeMinutes: r.prepTime,
    cookTimeMinutes: r.cookTime,
    totalTimeMinutes: r.totalTime,
    recipeIngredient: r.rawIngredients,
    recipeInstructions: r.steps.map((s) => (s.group ? { section: s.group, text: s.text } : s.text)),
    keywords: r.tags,
    recipeCuisine: r.cuisine,
    author: r.author,
  };
}

export async function importFromUrl(rawUrl: string, translate: boolean, ctx: ParseContext, depth = 0): Promise<ImportResponse> {
  let url: URL;
  try {
    url = assertSafeUrl(rawUrl.trim());
  } catch (err) {
    return { status: "error", message: err instanceof UnsafeUrlError ? err.message : "That link doesn't look right." };
  }

  const adapter = findSocialAdapter(url);
  if (adapter && depth === 0) return importFromSocial(adapter, url, translate, ctx);

  let page;
  try {
    page = await fetchPage(url.toString());
  } catch (err) {
    const message = err instanceof FetchError || err instanceof UnsafeUrlError ? err.message : "We couldn't load that page.";
    return { status: "error", message: `${message} You can take a screenshot of the recipe or paste its text instead.`, suggestion: "photo" };
  }
  if (page.status === 401 || page.status === 403 || page.status === 429) {
    return {
      status: "error",
      message: "That website blocked us from reading the page. Take a screenshot of the recipe, or copy and paste its text instead.",
      suggestion: "photo",
    };
  }
  if (page.status >= 400) {
    return { status: "error", message: `That page couldn't be loaded (error ${page.status}). Check the link?`, suggestion: "text" };
  }
  if (!/html|xml/i.test(page.contentType) && page.contentType) {
    return { status: "error", message: "That link isn't a web page we can read. Try a screenshot instead.", suggestion: "photo" };
  }

  const meta = extractMeta(page.body, page.url);
  const sourceUrl = meta.canonical || page.url;
  const structured = extractJsonLdRecipe(page.body, page.url);

  if (structured && isCompleteRecipe(structured)) {
    const imageUrl = structured.imageUrl || meta.image;
    const ai = await parseRecipe(
      {
        structured: jsonLdForAi(structured),
        translateToEnglish: translate,
        meta: { sourceType: "url", sourceUrl, sourceAuthor: structured.author || meta.siteName, imageUrl },
      },
      ctx,
    );
    if (ai.status === "ok" || ai.status === "partial") return ai;
    // The page's own recipe data is good enough to show even without the AI pass.
    const note =
      ai.status === "limited"
        ? `${ai.message} We used the recipe data from the page as-is.`
        : "We used the recipe data from the page as-is.";
    return {
      status: "ok",
      recipe: jsonLdToInput(structured, sourceUrl, imageUrl),
      warnings: [],
      rawSourceText: JSON.stringify(jsonLdForAi(structured)),
      note,
    };
  }

  const text = extractReadableText(page.body);
  if (text.length < 150) {
    return {
      status: "error",
      message: "We couldn't find any recipe text on that page. It may need a login or load content with JavaScript. Try a screenshot instead.",
      suggestion: "photo",
    };
  }
  const ai = await parseRecipe(
    {
      text: [meta.title, meta.description, text].filter(Boolean).join("\n\n"),
      structured: structured ? jsonLdForAi(structured) : undefined,
      translateToEnglish: translate,
      meta: { sourceType: "url", sourceUrl, sourceAuthor: structured?.author || meta.siteName, imageUrl: structured?.imageUrl || meta.image },
    },
    ctx,
  );
  if (ai.status === "not_recipe") return { ...ai, suggestion: "photo" };
  return ai;
}

/** Exported for tests. */
export const __test = { jsonLdToInput, aiToRecipeInput };
