import "server-only";
import type { SocialAdapter } from "./types";
import { fetchOpenGraph, hostIs } from "./shared";

export const facebook: SocialAdapter = {
  id: "facebook",
  name: "Facebook",
  matches: (url) => hostIs(url, "facebook.com", "fb.watch", "fb.com"),
  async fetchPost(url) {
    // Facebook's oEmbed requires an app token; public Open Graph tags are best-effort.
    const og = await fetchOpenGraph(url.toString());
    const description = og?.meta.description ?? "";
    const blocked = !og || /log in|inloggen|facebook – log/i.test(og.meta.title);
    return {
      platform: "Facebook",
      canonicalUrl: og?.meta.canonical || url.toString(),
      caption: blocked ? "" : description,
      author: "",
      thumbnailUrl: og?.meta.image ?? "",
    };
  },
};
