import "server-only";
import { parseRecipe, type ParseContext } from "@/lib/ai/parse-recipe";
import type { ImportResponse } from "../types";
import { importFromUrl } from "../url";
import { externalLinks, looksLikeRecipe, mentionsRecipeElsewhere } from "./caption";
import { facebook } from "./facebook";
import { instagram } from "./instagram";
import { pinterest } from "./pinterest";
import { tiktok } from "./tiktok";
import type { SocialAdapter, SocialPost } from "./types";
import { youtube } from "./youtube";

export type { SocialAdapter, SocialPost } from "./types";

/** Add or fix platforms here; each adapter is independent. */
const ADAPTERS: SocialAdapter[] = [instagram, tiktok, youtube, facebook, pinterest];

export function findSocialAdapter(url: URL): SocialAdapter | null {
  return ADAPTERS.find((a) => a.matches(url)) ?? null;
}

function fallback(platform: string, reason: string, blocked = true): ImportResponse {
  const why = blocked ? ` ${platform} often hides posts from apps like ours.` : "";
  return {
    status: "error",
    message: `${reason}${why} Take a screenshot of the post (with the caption visible) and use the Photo option, or copy the caption and paste it.`,
    suggestion: "photo",
  };
}

/**
 * Layered social import:
 *  1. The adapter collects caption/author/thumbnail (oEmbed, Open Graph, page data).
 *  2. A direct recipe link (e.g. Pinterest source) goes through the URL importer.
 *  3. A caption that contains the recipe is parsed by the AI.
 *  4. Otherwise a blog link in the caption is followed.
 *  5. Otherwise we explain and suggest the screenshot/paste fallback.
 */
export async function importFromSocial(adapter: SocialAdapter, url: URL, translate: boolean, ctx: ParseContext): Promise<ImportResponse> {
  let post: SocialPost;
  try {
    post = await adapter.fetchPost(url);
  } catch (err) {
    console.warn(`[social:${adapter.id}] fetch failed`, err);
    return fallback(adapter.name, `We couldn't open that ${adapter.name} post.`);
  }

  const withSocialMeta = (res: ImportResponse, note: string): ImportResponse => {
    if (res.status !== "ok" && res.status !== "partial") return res;
    return {
      ...res,
      note,
      recipe: {
        ...res.recipe,
        imageUrl: res.recipe.imageUrl || post.thumbnailUrl,
        sourceAuthor: res.recipe.sourceAuthor || post.author,
      },
    };
  };

  if (post.recipeUrl) {
    const res = await importFromUrl(post.recipeUrl, translate, ctx, 1);
    if (res.status === "ok" || res.status === "partial") return withSocialMeta(res, `Found the original recipe this ${adapter.name} post links to.`);
  }

  if (looksLikeRecipe(post.caption)) {
    const res = await parseRecipe(
      {
        text: post.caption,
        translateToEnglish: translate,
        meta: { sourceType: "social", sourceUrl: post.canonicalUrl, sourceAuthor: post.author, imageUrl: post.thumbnailUrl },
      },
      ctx,
    );
    if (res.status === "ok" || res.status === "partial" || res.status === "limited") return res;
  }

  const link = externalLinks(post.caption)[0];
  if (link) {
    const res = await importFromUrl(link, translate, ctx, 1);
    if (res.status === "ok" || res.status === "partial") return withSocialMeta(res, "Followed the link in the caption to the full recipe.");
  }

  if (mentionsRecipeElsewhere(post.caption)) {
    return fallback(
      adapter.name,
      `This post says the recipe is in the creator's bio or on their website, which we can't open automatically. Open their link and share that page with reciperoulette instead.`,
      false,
    );
  }
  if (!post.caption.trim()) return fallback(adapter.name, `We couldn't read the caption of that ${adapter.name} post.`);
  return fallback(adapter.name, `That ${adapter.name} caption doesn't seem to include the recipe.`, false);
}
