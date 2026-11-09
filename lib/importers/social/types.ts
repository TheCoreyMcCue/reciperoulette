/** What an adapter could learn about a social post. Every field is best-effort. */
export type SocialPost = {
  platform: string;
  canonicalUrl: string;
  caption: string;
  author: string;
  thumbnailUrl: string;
  /** A recipe page the post points at directly (e.g. a Pinterest pin's source). */
  recipeUrl?: string;
};

export interface SocialAdapter {
  id: "youtube" | "tiktok" | "instagram" | "facebook" | "pinterest";
  /** Human name for messages ("Instagram"). */
  name: string;
  matches(url: URL): boolean;
  /** Throws or returns a post with an empty caption when nothing usable is available. */
  fetchPost(url: URL): Promise<SocialPost>;
}
