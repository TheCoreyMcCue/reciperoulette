import "server-only";
import type { SocialAdapter } from "./types";
import { fetchOEmbed, fetchOpenGraph, hostIs } from "./shared";

export const tiktok: SocialAdapter = {
  id: "tiktok",
  name: "TikTok",
  matches: (url) => hostIs(url, "tiktok.com"),
  async fetchPost(url) {
    // TikTok's public oEmbed returns the caption as `title`. Short links (vm./vt.) are resolved by oEmbed too.
    const oembed = await fetchOEmbed("https://www.tiktok.com/oembed", url.toString());
    if (oembed?.title) {
      return {
        platform: "TikTok",
        canonicalUrl: url.toString(),
        caption: oembed.title,
        author: oembed.author_name ? `@${oembed.author_name.replace(/^@/, "")}` : "",
        thumbnailUrl: oembed.thumbnail_url ?? "",
      };
    }
    const og = await fetchOpenGraph(url.toString());
    return {
      platform: "TikTok",
      canonicalUrl: og?.meta.canonical || og?.finalUrl || url.toString(),
      caption: og?.meta.description ?? "",
      author: "",
      thumbnailUrl: og?.meta.image ?? "",
    };
  },
};
