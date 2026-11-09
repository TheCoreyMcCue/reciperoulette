import "server-only";
import { absoluteUrl } from "../html";
import { isSocialHost } from "./caption";
import type { SocialAdapter } from "./types";
import { fetchOpenGraph, hostIs } from "./shared";

/** A pin's source page: og:see_also, or the "link" field in the embedded pin JSON. */
export function pinterestSourceLink(html: string, base: string): string {
  const candidates = [
    html.match(/<meta[^>]+property=["']og:see_also["'][^>]+content=["']([^"']+)["']/i)?.[1],
    html.match(/"link"\s*:\s*"(https?:[^"]+)"/)?.[1]?.replace(/\\\//g, "/"),
  ];
  for (const c of candidates) {
    const u = c && absoluteUrl(c, base);
    if (u && !isSocialHost(new URL(u).hostname)) return u;
  }
  return "";
}

export const pinterest: SocialAdapter = {
  id: "pinterest",
  name: "Pinterest",
  matches: (url) => hostIs(url, "pinterest.com", "pin.it") || /(^|\.)pinterest\.[a-z.]+$/i.test(url.hostname),
  async fetchPost(url) {
    const og = await fetchOpenGraph(url.toString()); // follows pin.it redirects
    if (!og) return { platform: "Pinterest", canonicalUrl: url.toString(), caption: "", author: "", thumbnailUrl: "" };
    return {
      platform: "Pinterest",
      canonicalUrl: og.meta.canonical || og.finalUrl,
      caption: [og.meta.title, og.meta.description].filter(Boolean).join("\n\n"),
      author: "",
      thumbnailUrl: og.meta.image,
      recipeUrl: pinterestSourceLink(og.html, og.finalUrl) || undefined,
    };
  },
};
