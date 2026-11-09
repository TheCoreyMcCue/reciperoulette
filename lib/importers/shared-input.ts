/**
 * Figures out what was shared into the app (Android share target, iOS
 * Shortcut, or a manual /import?url=… link). Apps are inconsistent: some send
 * `url`, many put the link inside `text` along with other words.
 */
export type SharedInput = { kind: "url"; url: string } | { kind: "text"; text: string } | { kind: "none" };

const URL_RE = /https?:\/\/[^\s<>"']+/i;

export function interpretShared(params: { url?: string | string[]; text?: string | string[]; title?: string | string[] }): SharedInput {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
  const url = one(params.url);
  const text = one(params.text);
  const title = one(params.title);

  if (url && URL_RE.test(url)) return { kind: "url", url: url.match(URL_RE)![0].replace(/[),.!?]+$/, "") };

  const combined = [title, text].filter(Boolean).join("\n").trim();
  const link = combined.match(URL_RE)?.[0]?.replace(/[),.!?]+$/, "");
  // A link plus a short blurb ("Check out this reel! https://…") is a link share.
  if (link && combined.replace(link, "").trim().length < 200) return { kind: "url", url: link };
  if (combined.length >= 10) return { kind: "text", text: combined.slice(0, 200_000) };
  if (link) return { kind: "url", url: link };
  return { kind: "none" };
}
