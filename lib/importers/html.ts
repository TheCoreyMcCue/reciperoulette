/** Small, dependency-free HTML helpers for recipe pages. */

const NAMED: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", hellip: "…",
  frac12: "½", frac14: "¼", frac34: "¾", deg: "°", eacute: "é", egrave: "è", euml: "ë", iuml: "ï", ouml: "ö", uuml: "ü",
  auml: "ä", aacute: "á", oacute: "ó", ccedil: "ç", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", times: "×", middot: "·",
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : m;
    }
    return NAMED[e.toLowerCase()] ?? m;
  });
}

/** Strip tags and decode entities, collapsing whitespace (for short JSON-LD strings). */
export function cleanText(s: unknown): string {
  if (typeof s !== "string") return "";
  return decodeEntities(decodeEntities(s.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " ")))
    .replace(/[ \t ]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
}

function attr(tag: string, name: string): string | null {
  const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return m ? decodeEntities(m[2] ?? m[3] ?? m[4] ?? "") : null;
}

export type PageMeta = { title: string; description: string; image: string; siteName: string; author: string; canonical: string };

export function extractMeta(html: string, baseUrl: string): PageMeta {
  const metas = html.match(/<meta\b[^>]*>/gi) ?? [];
  const get = (...keys: string[]) => {
    for (const key of keys) {
      for (const tag of metas) {
        const k = (attr(tag, "property") ?? attr(tag, "name") ?? "").toLowerCase();
        if (k === key) {
          const v = attr(tag, "content");
          if (v) return v.trim();
        }
      }
    }
    return "";
  };
  const canonicalTag = (html.match(/<link\b[^>]*rel=["']?canonical["']?[^>]*>/i) ?? [])[0];
  return {
    title: get("og:title", "twitter:title") || cleanText(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? ""),
    description: get("og:description", "description", "twitter:description"),
    image: absoluteUrl(get("og:image:secure_url", "og:image", "twitter:image", "twitter:image:src"), baseUrl),
    siteName: get("og:site_name", "application-name"),
    author: get("author", "article:author"),
    canonical: absoluteUrl(canonicalTag ? (attr(canonicalTag, "href") ?? "") : "", baseUrl),
  };
}

export function absoluteUrl(href: string, base: string): string {
  if (!href) return "";
  try {
    const u = new URL(href, base);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : "";
  } catch {
    return "";
  }
}

/**
 * Readable text of the page's main content: drops scripts, styles, nav,
 * header/footer, forms and comments, prefers <article>/<main>, and keeps
 * line structure so lists and steps stay readable for the model.
 */
export function extractReadableText(html: string, maxChars = 60_000): string {
  let s = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|noscript|svg|iframe|template|form|nav|header|footer|aside|button|select)\b[\s\S]*?<\/\1>/gi, " ");
  const main = s.match(/<(article|main)\b[^>]*>([\s\S]*)<\/\1>/i)?.[2];
  const body = s.match(/<body\b[^>]*>([\s\S]*)<\/body>/i)?.[1];
  // Only trust <article>/<main> if it holds a decent chunk of the page.
  s = main && main.length > (body?.length ?? s.length) * 0.2 ? main : (body ?? s);
  s = s
    .replace(/<(br|hr)\b[^>]*>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, "\n• ")
    .replace(/<\/(p|div|section|li|ul|ol|h[1-6]|tr|table|blockquote|figure|dd|dt)>/gi, "\n")
    .replace(/<(h[1-6])\b[^>]*>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ");
  return decodeEntities(s)
    .replace(/[ \t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, maxChars);
}
