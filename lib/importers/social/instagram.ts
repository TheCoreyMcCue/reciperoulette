import "server-only";
import { decodeEntities } from "../html";
import type { SocialAdapter } from "./types";
import { fetchOpenGraph, hostIs } from "./shared";

/**
 * Instagram's og:description looks like:
 *   123 likes, 4 comments - chefname on March 3, 2026: "Caption text…"
 * og:title: `Chef Name on Instagram: "Caption…"`
 */
export function parseInstagramOg(description: string, title: string): { caption: string; author: string } {
  const d = decodeEntities(description);
  const m = d.match(/^[\d.,KkMm\s]+likes?,\s*[\d.,KkMm\s]+comments?\s*-\s*([^\s]+)\s+(?:on|op)\s+[^:]+:\s*["“]?([\s\S]*?)["”]?\s*\.?$/);
  if (m) return { author: `@${m[1]}`, caption: m[2]!.trim() };
  const t = decodeEntities(title).match(/^(.*?)\s+(?:on|op)\s+Instagram:\s*["“]([\s\S]*)["”]\s*$/);
  if (t) return { author: t[1]!.trim(), caption: t[2]!.trim() };
  return { author: "", caption: d.trim() };
}

export const instagram: SocialAdapter = {
  id: "instagram",
  name: "Instagram",
  matches: (url) => hostIs(url, "instagram.com", "instagr.am"),
  async fetchPost(url) {
    // Instagram's oEmbed needs a Facebook app token, so we rely on Open Graph tags,
    // which Instagram serves to some (not all) non-logged-in requests.
    const clean = new URL(url.toString());
    clean.search = "";
    const og = await fetchOpenGraph(clean.toString());
    if (!og) return { platform: "Instagram", canonicalUrl: clean.toString(), caption: "", author: "", thumbnailUrl: "" };
    const { caption, author } = parseInstagramOg(og.meta.description, og.meta.title);
    const isLoginWall = /login|log in|inloggen/i.test(og.meta.title) && !caption;
    return {
      platform: "Instagram",
      canonicalUrl: og.meta.canonical || clean.toString(),
      caption: isLoginWall ? "" : caption,
      author,
      thumbnailUrl: og.meta.image,
    };
  },
};
