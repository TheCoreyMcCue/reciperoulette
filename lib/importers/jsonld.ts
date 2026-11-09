import { parseIngredientLine } from "@/lib/recipes/ingredients";
import type { Ingredient, Step } from "@/lib/recipes/schema";
import { absoluteUrl, cleanText } from "./html";

/**
 * schema.org/Recipe extraction from JSON-LD. Most recipe sites embed this
 * (WordPress recipe plugins, AH Allerhande, Jumbo, BBC Good Food, NYT...).
 */

export type JsonLdRecipe = {
  title: string;
  description: string;
  servings: number | null;
  prepTime: number | null;
  cookTime: number | null;
  totalTime: number | null;
  ingredients: Ingredient[];
  steps: Step[];
  tags: string[];
  cuisine: string;
  author: string;
  imageUrl: string;
  language: string;
  /** The raw ingredient strings, kept for the AI clean-up pass. */
  rawIngredients: string[];
};

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : v == null ? [] : [v]);

function hasType(o: Obj, type: string): boolean {
  return arr(o["@type"]).some((t) => typeof t === "string" && (t === type || t.endsWith(`/${type}`) || t.endsWith(`:${type}`)));
}

/** Parse JSON-LD script contents, tolerating common site bugs. */
function parseLenient(text: string): unknown {
  const cleaned = text
    .trim()
    .replace(/^<!\[CDATA\[|\]\]>$/g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    // Raw control characters inside strings (very common) break JSON.parse.
    .replace(/[\u0000-\u0019]+/g, " ");
  try {
    return JSON.parse(cleaned);
  } catch {
    try {
      return JSON.parse(cleaned.replace(/,\s*([}\]])/g, "$1")); // trailing commas
    } catch {
      return null;
    }
  }
}

export function findJsonLdBlocks(html: string): unknown[] {
  const out: unknown[] = [];
  const re = /<script\b[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi;
  for (let m = re.exec(html); m; m = re.exec(html)) {
    const parsed = parseLenient(m[1] ?? "");
    if (parsed != null) out.push(parsed);
  }
  return out;
}

/** Depth-first search for Recipe nodes (handles arrays, @graph, mainEntity, nesting). */
export function findRecipeNodes(root: unknown, depth = 0, out: Obj[] = []): Obj[] {
  if (depth > 8) return out;
  if (Array.isArray(root)) {
    for (const r of root) findRecipeNodes(r, depth + 1, out);
  } else if (isObj(root)) {
    if (hasType(root, "Recipe")) out.push(root);
    for (const key of ["@graph", "mainEntity", "mainEntityOfPage", "itemListElement", "item", "hasPart"]) {
      if (key in root) findRecipeNodes(root[key], depth + 1, out);
    }
  }
  return out;
}

/** ISO-8601 duration (PT1H30M, P0DT0H45M, PT90M) or loose "45 min" → minutes. */
export function parseDuration(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v) && v > 0) return Math.round(v);
  if (typeof v !== "string") return null;
  const s = v.trim().toUpperCase();
  const iso = s.match(/^P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/);
  if (iso && s !== "P" && s !== "PT") {
    const [, d, h, m, sec] = iso;
    const total = Number(d ?? 0) * 1440 + Number(h ?? 0) * 60 + Number(m ?? 0) + Number(sec ?? 0) / 60;
    return total > 0 ? Math.round(total) : null;
  }
  const loose = s.match(/(?:(\d+)\s*(?:H|HR|HOURS?|UUR))?\s*(?:(\d+)\s*(?:M|MIN|MINS|MINUTES?|MINUTEN))?/);
  if (loose && (loose[1] || loose[2])) return Number(loose[1] ?? 0) * 60 + Number(loose[2] ?? 0) || null;
  return null;
}

export function parseYield(v: unknown): number | null {
  for (const y of arr(v)) {
    if (typeof y === "number" && y >= 1 && y <= 500) return Math.round(y);
    if (typeof y === "string") {
      const m = y.match(/\d+/);
      // "4 servings", "4-6 personen" → 4; skip things like "1 loaf" only if clearly not portions
      if (m && !/\b(loaf|loaves|cake|brood|taart|tin|pan|cookies?|koekjes|stuks?|pieces?|cm|inch)\b/i.test(y)) {
        const n = Number(m[0]);
        if (n >= 1 && n <= 500) return n;
      }
    }
  }
  return null;
}

function nameOf(v: unknown): string {
  for (const x of arr(v)) {
    if (typeof x === "string" && x.trim()) return cleanText(x);
    if (isObj(x) && typeof x.name === "string") return cleanText(x.name);
  }
  return "";
}

function imageOf(v: unknown, base: string): string {
  for (const x of arr(v)) {
    if (typeof x === "string") return absoluteUrl(x, base);
    if (isObj(x)) {
      const u = typeof x.url === "string" ? x.url : typeof x.contentUrl === "string" ? x.contentUrl : "";
      if (u) return absoluteUrl(u, base);
    }
  }
  return "";
}

function stepsFrom(v: unknown, group = "", out: Step[] = [], depth = 0): Step[] {
  if (depth > 5) return out;
  for (const x of arr(v)) {
    if (typeof x === "string") {
      // A single blob of instructions: split into lines/paragraphs.
      for (const line of cleanText(x).split(/\n+|(?<=\.)\s+(?=\d+[.)]\s)/)) {
        const text = line.replace(/^\s*(\d+[.)]|step \d+:?)\s*/i, "").trim();
        if (text) out.push({ text: text.slice(0, 4000), group });
      }
    } else if (isObj(x)) {
      if (hasType(x, "HowToSection") || (Array.isArray(x.itemListElement) && !x.text)) {
        stepsFrom(x.itemListElement, cleanText(x.name) || group, out, depth + 1);
      } else {
        const text = cleanText(x.text) || cleanText(x.name) || cleanText(x.description);
        if (text) out.push({ text: text.slice(0, 4000), group });
      }
    }
  }
  return out;
}

function tagsFrom(...vals: unknown[]): string[] {
  const tags = new Set<string>();
  for (const v of vals) {
    for (const x of arr(v)) {
      if (typeof x !== "string") continue;
      for (const t of x.split(",")) {
        const tag = cleanText(t).toLowerCase();
        if (tag && tag.length <= 40) tags.add(tag);
      }
    }
  }
  return [...tags].slice(0, 12);
}

export function mapRecipeNode(node: Obj, pageUrl: string): JsonLdRecipe {
  const rawIngredients = arr(node.recipeIngredient ?? node.ingredients)
    .map((i) => cleanText(i))
    .filter(Boolean)
    .slice(0, 200);
  return {
    title: cleanText(node.name).slice(0, 200),
    description: cleanText(node.description).slice(0, 2000),
    servings: parseYield(node.recipeYield ?? node.yield),
    prepTime: parseDuration(node.prepTime),
    cookTime: parseDuration(node.cookTime),
    totalTime: parseDuration(node.totalTime),
    ingredients: rawIngredients.map((l) => parseIngredientLine(l)).filter((i): i is Ingredient => i !== null),
    steps: stepsFrom(node.recipeInstructions).slice(0, 200),
    tags: tagsFrom(node.keywords, node.recipeCategory),
    cuisine: nameOf(node.recipeCuisine).slice(0, 60),
    author: nameOf(node.author).slice(0, 200),
    imageUrl: imageOf(node.image, pageUrl),
    language: typeof node.inLanguage === "string" ? node.inLanguage.slice(0, 2).toLowerCase() : "",
    rawIngredients,
  };
}

/** Best Recipe on the page (the one with the most content), or null. */
export function extractJsonLdRecipe(html: string, pageUrl: string): JsonLdRecipe | null {
  const nodes = findJsonLdBlocks(html).flatMap((b) => findRecipeNodes(b));
  const mapped = nodes.map((n) => mapRecipeNode(n, pageUrl)).filter((r) => r.title || r.ingredients.length);
  if (!mapped.length) return null;
  return mapped.sort((a, b) => b.ingredients.length + b.steps.length - (a.ingredients.length + a.steps.length))[0]!;
}

/** Is the structured data complete enough to stand on its own? */
export function isCompleteRecipe(r: JsonLdRecipe | null): boolean {
  return !!r && !!r.title && r.ingredients.length > 0 && r.steps.length > 0;
}
