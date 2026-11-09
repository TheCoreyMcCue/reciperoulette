/** Heuristics for social captions. Pure, so they're easy to test and tune. */

const SOCIAL_HOSTS = /(^|\.)(instagram\.com|instagr\.am|tiktok\.com|youtube\.com|youtu\.be|facebook\.com|fb\.watch|fb\.com|pinterest\.[a-z.]+|pin\.it|linktr\.ee|threads\.net|x\.com|twitter\.com)$/i;

export function isSocialHost(hostname: string): boolean {
  return SOCIAL_HOSTS.test(hostname.replace(/^www\./, ""));
}

const QTY_START = /^([-•*▪✅🔸]\uFE0F?\s*)?(\d+([.,/]\d+)?|[½¼¾⅓⅔])\s*\S/u;
const KEYWORDS = /\b(ingredi[eë]nt(en|s)?|bereiding|instructions|method|directions|wat heb je nodig|zo maak je|recept|recipe|serves|personen|minutes|minuten)\b/i;

/** Does this caption plausibly contain the recipe itself (not just a teaser)? */
export function looksLikeRecipe(text: string): boolean {
  if (!text || text.length < 120) return false;
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const qtyLines = lines.filter((l) => QTY_START.test(l)).length;
  const keyword = KEYWORDS.test(text);
  return qtyLines >= 3 || (keyword && qtyLines >= 2) || (keyword && lines.length >= 8);
}

export function mentionsRecipeElsewhere(text: string): boolean {
  return /\b(recipe|recept|link|full recipe|volledige recept)\b[^.\n]{0,30}\b(in (my |de |mijn )?bio|in profile|op (mijn|de) (blog|website)|on (my|the) (blog|website)|link below|linkje)\b/i.test(text) ||
    /\blink in bio\b/i.test(text);
}

/** External (non-social) links in a caption, in order. */
export function externalLinks(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/\bhttps?:\/\/[^\s<>"')\]]+/gi)) {
    const raw = m[0].replace(/[.,!?)]+$/, "");
    try {
      const u = new URL(raw);
      if (!isSocialHost(u.hostname) && !out.includes(u.toString())) out.push(u.toString());
    } catch {
      /* ignore */
    }
  }
  return out;
}
