import "server-only";
import type { SocialAdapter } from "./types";
import { fetchOEmbed, fetchOpenGraph, hostIs } from "./shared";

export function youtubeVideoId(url: URL): string | null {
  if (hostIs(url, "youtu.be")) return url.pathname.slice(1).split("/")[0] || null;
  if (url.searchParams.get("v")) return url.searchParams.get("v");
  const m = url.pathname.match(/^\/(shorts|embed|live|v)\/([\w-]{6,})/);
  return m?.[2] ?? null;
}

/** The full description lives in the page's embedded player JSON (og:description is truncated). */
export function extractYoutubeDescription(html: string): string {
  const m = html.match(/"shortDescription":"((?:[^"\\]|\\.)*)"/);
  if (!m) return "";
  try {
    return JSON.parse(`"${m[1]}"`) as string;
  } catch {
    return "";
  }
}

export const youtube: SocialAdapter = {
  id: "youtube",
  name: "YouTube",
  matches: (url) => hostIs(url, "youtube.com", "youtu.be", "youtube-nocookie.com"),
  async fetchPost(url) {
    const id = youtubeVideoId(url);
    const canonical = id ? `https://www.youtube.com/watch?v=${id}` : url.toString();
    const [oembed, page] = await Promise.all([
      fetchOEmbed("https://www.youtube.com/oembed", canonical),
      fetchOpenGraph(canonical),
    ]);
    const description = page ? extractYoutubeDescription(page.html) || page.meta.description : "";
    // Transcripts need signed requests / an API key, so we don't attempt them.
    return {
      platform: "YouTube",
      canonicalUrl: canonical,
      caption: [oembed?.title ?? page?.meta.title ?? "", description].filter(Boolean).join("\n\n"),
      author: oembed?.author_name ?? "",
      thumbnailUrl: id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : (oembed?.thumbnail_url ?? ""),
    };
  },
};
