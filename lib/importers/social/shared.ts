import "server-only";
import { fetchPage } from "../fetch-page";
import { extractMeta, type PageMeta } from "../html";

export async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetchPage(url, { accept: "application/json", timeoutMs: 8000, maxBytes: 500_000 });
    if (res.status !== 200) return null;
    return JSON.parse(res.body) as T;
  } catch {
    return null;
  }
}

export type OEmbed = { title?: string; author_name?: string; author_url?: string; thumbnail_url?: string; html?: string };

export async function fetchOEmbed(endpoint: string, postUrl: string): Promise<OEmbed | null> {
  const u = new URL(endpoint);
  u.searchParams.set("url", postUrl);
  u.searchParams.set("format", "json");
  return fetchJson<OEmbed>(u.toString());
}

/** Fetches the post page and reads Open Graph tags. Returns the raw HTML too for platform-specific parsing. */
export async function fetchOpenGraph(url: string): Promise<{ meta: PageMeta; html: string; finalUrl: string } | null> {
  try {
    const res = await fetchPage(url, { timeoutMs: 8000 });
    if (res.status !== 200) return null;
    return { meta: extractMeta(res.body, res.url), html: res.body, finalUrl: res.url };
  } catch {
    return null;
  }
}

export const hostIs = (url: URL, ...hosts: string[]) => {
  const h = url.hostname.toLowerCase().replace(/^(www|m|mobile|vm|vt|web)\./, "");
  return hosts.some((x) => h === x || h.endsWith(`.${x}`));
};
