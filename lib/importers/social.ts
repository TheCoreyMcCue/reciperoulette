import "server-only";
import type { ParseContext } from "@/lib/ai/parse-recipe";
import type { ImportResponse } from "./types";

/** Social platform adapters (filled in by the social import phase). */
export interface SocialAdapter {
  id: string;
  matches(url: URL): boolean;
}

const ADAPTERS: SocialAdapter[] = [];

export function findSocialAdapter(url: URL): SocialAdapter | null {
  return ADAPTERS.find((a) => a.matches(url)) ?? null;
}

export async function importFromSocial(adapter: SocialAdapter, url: URL, translate: boolean, ctx: ParseContext): Promise<ImportResponse> {
  void [adapter, url, translate, ctx];
  return { status: "error", message: "Social links aren't supported yet.", suggestion: "photo" };
}
