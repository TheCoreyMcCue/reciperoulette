import { isKnownUnit, normalizeFractions, parseQuantityValue } from "@/lib/recipes/ingredients";
import { RecipeInputSchema, type Ingredient, type RecipeInput } from "@/lib/recipes/schema";
import { classifyIngredient } from "@/lib/units/classify";
import { normalizeUnit, VOLUME_ML, WEIGHT_G, type CanonicalUnit } from "@/lib/units/normalize";
import { OZ_G } from "@/lib/units/constants";
import { amountMax, parseQuantity } from "@/lib/units/quantity";
import { parseDuration } from "../jsonld";
import type { LegacyRecord } from "./mongo";

/**
 * Maps one legacy record onto the app's recipe shape, collecting data-quality
 * flags along the way. Flags never change the data: they're for the report.
 */

export type Flag = { kind: string; message: string };

export type MappedRecipe = {
  legacyId: string;
  title: string;
  input: RecipeInput;
  createdAt: string;
  incomplete: boolean;
  incompleteReasons: string[];
  unfinishedSteps: boolean;
  inRotation: boolean;
  flags: Flag[];
  /** Ingredient items the density table doesn't cover (sent to the AI on --commit). */
  unclassified: string[];
};

export const NEEDS_DETAILS_TAG = "needs-details";

const str = (v: unknown) => (typeof v === "string" ? v : typeof v === "number" ? String(v) : "");
const isStar = (s: string) => s.trim() === "*";

// ── ingredient names ─────────────────────────────────────────────────────────

const PREP_WORDS = new Set([
  "divided", "chopped", "minced", "diced", "sliced", "smashed", "crushed", "grated", "shredded", "peeled", "softened",
  "melted", "beaten", "drained", "rinsed", "halved", "quartered", "cubed", "julienned", "optional", "trimmed", "torn",
  "pitted", "seeded", "deveined", "zested", "juiced", "toasted", "cooked", "uncooked", "thawed", "frozen", "packed", "sifted",
  "mashed", "pressed", "squeezed", "separated", "whisked", "crumbled", "warmed", "cooled", "rinsed", "patted",
]);
const PREP_ADVERBS = new Set(["finely", "thinly", "roughly", "coarsely", "freshly", "lightly", "firmly", "loosely", "very", "well", "and"]);
const TRAILING_PHRASES = /\s+(to taste|for serving|for garnish|for frying|for greasing|for dusting|at room temperature|plus more[^,]*)$/i;

/** "garlic, smashed" → garlic / smashed; "salt divided" → salt / divided; "butter (softened)" → butter / softened. */
export function splitIngredientName(name: string): { item: string; note: string } {
  let item = name.trim();
  const notes: string[] = [];
  item = item.replace(/\s*\(([^)]*)\)\s*/g, (_, n: string) => (n.trim() && notes.push(n.trim()), " ")).trim();
  const comma = item.indexOf(",");
  if (comma > 0) {
    notes.unshift(item.slice(comma + 1).trim());
    item = item.slice(0, comma).trim();
  }
  const phrase = item.match(TRAILING_PHRASES);
  if (phrase && item.length > phrase[0].length) {
    notes.unshift(phrase[1]!);
    item = item.slice(0, -phrase[0].length).trim();
  }
  // Trailing prep words ("onion finely chopped", "garlic peeled and smashed", "salt divided").
  const words = item.split(/\s+/);
  const lc = (w: string) => w.toLowerCase();
  let cut = words.length;
  while (cut > 1 && PREP_WORDS.has(lc(words[cut - 1]!))) {
    cut--;
    while (cut > 1 && PREP_ADVERBS.has(lc(words[cut - 1]!))) cut--;
  }
  if (cut < words.length) {
    notes.unshift(words.slice(cut).join(" "));
    item = words.slice(0, cut).join(" ");
  }
  return { item: item.replace(/\s{2,}/g, " "), note: notes.filter(Boolean).join("; ") };
}

// ── units ────────────────────────────────────────────────────────────────────

const NO_UNIT = new Set(["", "*", "whole", "each", "ea", "piece", "pieces", "x", "none"]);
const LABELS: Partial<Record<CanonicalUnit, [string, string]>> = {
  tsp: ["tsp", "tsp"], tbsp: ["tbsp", "tbsp"], cup: ["cup", "cups"], floz: ["fl oz", "fl oz"], pint: ["pint", "pints"],
  quart: ["quart", "quarts"], gallon: ["gallon", "gallons"], ml: ["ml", "ml"], cl: ["cl", "cl"], dl: ["dl", "dl"], l: ["l", "l"],
  mg: ["mg", "mg"], g: ["g", "g"], kg: ["kg", "kg"], oz: ["oz", "oz"], lb: ["lb", "lb"], stick: ["stick", "sticks"],
};

/** Normalised unit label ("tablespoons" → "tbsp"), or the cleaned raw unit for counts ("cloves", "packet"). */
export function normalizeLegacyUnit(raw: string, value: number | null): { unit: string; parsed: boolean } {
  const u = raw.trim();
  if (NO_UNIT.has(u.toLowerCase())) return { unit: "", parsed: true };
  const canon = normalizeUnit(u);
  if (canon) {
    const [one, many] = LABELS[canon]!;
    return { unit: value != null && value > 1 ? many : one, parsed: true };
  }
  const lower = u.toLowerCase().replace(/\.$/, "");
  return { unit: lower, parsed: isKnownUnit(lower) || /^(packages?|packets?|pinch(es)?|cloves?|cans?|dash(es)?|bunch(es)?|slices?|sprigs?|heads?|stalks?|jars?|bags?|boxes?|containers?|bottles?|leaves|leaf|handfuls?|knobs?)$/.test(lower) };
}

// ── plausibility checks ──────────────────────────────────────────────────────

const SEASONING = /\b(salt|pepper|peppercorns?|spice|seasoning|paprika|cumin|cinnamon|nutmeg|cloves?|chil[il]|cayenne|oregano|thyme|basil|herbs?|sugar|saffron|turmeric|ginger|garlic powder|onion powder|flakes|allspice|cardamom|coriander|fennel|msg|zest|vanilla|baking (soda|powder)|mustard|curry|sumac|za.?atar|rosemary|sage|dill|parsley|mint|cilantro|bay|anise|cream of tartar|yeast|lemon|lime|vinegar|oil|sauce)\b/i;
const UNIT_WORDS = /\b(tablespoons?|teaspoons?|tbsp|tsp|cups?|ounces?|oz|pounds?|lbs?|grams?|kilograms?|ml|milliliters?|liters?)\b/i;
const SPICE_MENTIONS = ["cloves", "cinnamon", "nutmeg", "cumin", "paprika", "oregano", "thyme", "rosemary", "ginger", "turmeric", "cardamom", "allspice", "coriander", "cayenne", "saffron", "fennel", "star anise", "sumac"];
const SHORT_OK = new Set(["a", "an", "of", "or", "to", "in", "on", "&", "and", "for", "x", "oz", "lb", "g", "kg", "ml"]);

function measureOf(quantity: string, unit: string, category: Ingredient["category"]): { ml?: number; g?: number } {
  const a = parseQuantity(quantity);
  const canon = normalizeUnit(unit);
  if (!a || !canon) return {};
  const max = amountMax(a);
  if (canon === "oz") return category === "liquid" ? { ml: max * VOLUME_ML.floz! } : { g: max * OZ_G };
  if (VOLUME_ML[canon]) return { ml: max * VOLUME_ML[canon]! };
  if (WEIGHT_G[canon]) return { g: max * WEIGHT_G[canon]! };
  if (canon === "stick") return { g: max * 113 };
  return {};
}

function ingredientFlags(i: Ingredient, rawName: string, rawUnit: string, unitParsed: boolean): Flag[] {
  const flags: Flag[] = [];
  const line = [i.quantity, i.unit, rawName].filter(Boolean).join(" ");
  if (!unitParsed) flags.push({ kind: "unit", message: `Unit "${rawUnit}" wasn't recognised: "${line}"` });
  if (UNIT_WORDS.test(i.item)) flags.push({ kind: "name", message: `Item name contains a unit: "${line}"` });
  const words = rawName.split(/[\s,;-]+/).filter(Boolean);
  const garbled = words.filter((w) => /([a-z])\1\1/i.test(w) || /[a-z]{3,}dd$/i.test(w) || (w.length <= 2 && !SHORT_OK.has(w.toLowerCase()) && !/^\d/.test(w)));
  if (garbled.length) flags.push({ kind: "garbled", message: `Name looks garbled (${garbled.map((w) => `"${w}"`).join(", ")}): "${line}"` });
  if (rawName.length > 60 || words.length > 8) flags.push({ kind: "name", message: `A lot of detail in the name (${rawName.length} chars): "${line}"` });
  if (/\s(and|&|or|plus)\s|\//i.test(i.item) && !/^salt\s*(and|&)\s*pepper$/i.test(i.item)) {
    flags.push({ kind: "multiple", message: `Item may list more than one thing: "${line}"` });
  }

  const m = measureOf(i.quantity, i.unit, i.category);
  if (/\boil\b/i.test(i.item) && m.ml != null && m.ml >= 120) flags.push({ kind: "amount", message: `Lots of oil (≈${Math.round(m.ml)} ml): "${line}"` });
  if (/\b(salt|baking soda|baking powder|cloves|cinnamon|nutmeg|cayenne|chil[il] (powder|flakes))\b/i.test(i.item) && m.ml != null && m.ml >= 45 && !/rub|brine/i.test(line)) {
    flags.push({ kind: "amount", message: `Lots of a strong seasoning (≈${Math.round(m.ml)} ml): "${line}"` });
  }
  if (/^(pinch|pinches|dash|dashes)$/i.test(i.unit) && !SEASONING.test(i.item)) flags.push({ kind: "amount", message: `A "${i.unit}" of something that isn't a seasoning: "${line}"` });
  if ((m.g ?? 0) > 5000 || (m.ml ?? 0) > 5000) flags.push({ kind: "amount", message: `Very large amount: "${line}"` });
  const q = parseQuantity(i.quantity);
  if (q && !i.unit && amountMax(q) > 24) flags.push({ kind: "amount", message: `Large count with no unit: "${line}"` });
  return flags;
}

// ── steps ────────────────────────────────────────────────────────────────────

/**
 * The last step ends mid-sentence: either a lowercase fragment after the final
 * full stop ("…set aside. in a small serving bowl") or it ends on a
 * connecting word ("…and"), with no closing punctuation.
 */
export function stepsLookUnfinished(steps: string[]): boolean {
  const last = steps.at(-1)?.trim();
  if (!last || /[.!?)"'”…:]$/.test(last)) return false;
  const sentences = last.split(/(?<=[.!?])\s+/);
  if (sentences.length > 1 && /^[a-z]/.test(sentences.at(-1)!)) return true;
  return /\b(a|an|the|and|or|with|in|into|of|to|for|then)$/i.test(last);
}

// ── record ───────────────────────────────────────────────────────────────────

function tagList(...vals: unknown[]): string[] {
  const out = new Set<string>();
  for (const v of vals) {
    for (const x of Array.isArray(v) ? v : v == null ? [] : [v]) {
      for (const t of str(x).split(",")) {
        const tag = t.trim().toLowerCase();
        if (tag && tag !== "*") out.add(tag.slice(0, 40));
      }
    }
  }
  return [...out];
}

function stepTexts(v: unknown): string[] {
  const arr = Array.isArray(v) ? v : v == null ? [] : [v];
  return arr
    .map((s) => (typeof s === "string" ? s : s && typeof s === "object" ? str((s as Record<string, unknown>).text) : ""))
    .map((s) => s.trim())
    .filter((s) => s && !isStar(s));
}

export function mapLegacyRecord(rec: LegacyRecord & { _legacyId: string; _idWasMissing: boolean }, importedAt: Date): MappedRecipe {
  const flags: Flag[] = [];
  const title = str(rec.title) || "Untitled recipe";
  if (!str(rec.title)) flags.push({ kind: "field", message: "Missing title" });
  if (rec._idWasMissing) flags.push({ kind: "field", message: `No _id in the export; using stable id ${rec._legacyId}` });

  // ingredients
  const ingredients: Ingredient[] = [];
  const unclassified: string[] = [];
  const rawIngs = Array.isArray(rec.ingredients) ? rec.ingredients : [];
  for (const raw of rawIngs) {
    const r = (raw ?? {}) as Record<string, unknown>;
    const rawName = str(r.name);
    const rawUnit = str(r.unit);
    const rawAmount = normalizeFractions(str(r.amount)).trim();
    if (!rawName || isStar(rawName)) {
      if (rawAmount || rawUnit) flags.push({ kind: "field", message: `Ingredient without a name: "${rawAmount} ${rawUnit}"` });
      continue;
    }
    const amount = parseQuantity(rawAmount);
    const quantity = amount ? rawAmount.replace(/\s*(-|–|—|to)\s*/i, (m) => (/to/i.test(m) ? m : "-")) : "";
    const qtyNote = !amount && rawAmount && !isStar(rawAmount) ? rawAmount : "";
    const { unit, parsed } = normalizeLegacyUnit(rawUnit, amount && amount.high == null ? amount.low : amount ? amount.high : null);
    const { item, note } = splitIngredientName(rawName);
    const ing = classifyIngredient({
      quantity: quantity.slice(0, 40),
      quantityValue: amount ? parseQuantityValue(quantity) : null,
      unit: unit.slice(0, 40),
      item: (item || rawName).slice(0, 200),
      note: [note, qtyNote].filter(Boolean).join("; ").slice(0, 200),
      group: "",
      category: null,
      gramsPerCup: null,
    });
    if (ing.category === null) unclassified.push(ing.item);
    flags.push(...ingredientFlags(ing, rawName, rawUnit, parsed));
    ingredients.push(ing);
  }

  const steps = stepTexts(rec.steps);
  const description = isStar(str(rec.description)) ? "" : str(rec.description);

  // spices mentioned in steps/description but not listed
  const listed = ingredients.map((i) => `${i.item} ${i.note}`.toLowerCase()).join(" | ");
  const prose = `${steps.join(" ")} ${description}`.toLowerCase();
  for (const spice of SPICE_MENTIONS) {
    const re = new RegExp(`\\b${spice}\\b(?!\\s+(of\\s+)?garlic)`, "i");
    if (re.test(prose) && !listed.includes(spice.replace(/s$/, ""))) {
      flags.push({ kind: "missing", message: `Steps or description mention "${spice}" but it isn't in the ingredients` });
    }
  }

  const incompleteReasons = [
    steps.length === 0 && "no steps",
    steps.length === 1 && "only one step",
    ingredients.length <= 2 && `only ${ingredients.length} ingredient${ingredients.length === 1 ? "" : "s"}`,
  ].filter((x): x is string => !!x);
  const incomplete = incompleteReasons.length > 0;
  const unfinishedSteps = !incomplete && stepsLookUnfinished(steps);
  if (unfinishedSteps) flags.push({ kind: "steps", message: `Steps look unfinished: last step is "${steps.at(-1)}"` });

  const cookRaw = str(rec.cookTime);
  const totalTime = /^\d+$/.test(cookRaw) ? (Number(cookRaw) > 0 ? Number(cookRaw) : null) : cookRaw && !isStar(cookRaw) ? parseDuration(cookRaw) : null;
  if (cookRaw && !isStar(cookRaw) && totalTime == null && cookRaw !== "0") flags.push({ kind: "field", message: `Couldn't read cookTime "${cookRaw}"` });
  if (totalTime != null && totalTime > 24 * 60) flags.push({ kind: "field", message: `cookTime of ${totalTime} minutes looks implausible` });

  const image = str(rec.image);
  const imageUrl = /^https?:\/\/\S+$/i.test(image) ? image : "";
  if (image && !isStar(image) && !imageUrl) flags.push({ kind: "field", message: `Image isn't a URL: "${image.slice(0, 60)}"` });

  const created = new Date(str(rec.createdAt));
  const createdAt = Number.isNaN(created.getTime()) ? importedAt.toISOString() : created.toISOString();
  if (Number.isNaN(created.getTime())) flags.push({ kind: "field", message: "Missing or invalid createdAt; using the import time" });

  const tags = tagList(rec.category, rec.categories);
  if (incomplete && !tags.includes(NEEDS_DETAILS_TAG)) tags.push(NEEDS_DETAILS_TAG);

  const parsed = RecipeInputSchema.safeParse({
    title,
    description,
    totalTime,
    prepTime: null,
    ingredients,
    steps: steps.map((text) => ({ text: text.slice(0, 4000), group: "" })),
    tags,
    sourceType: "import",
    imageUrl,
  });
  if (!parsed.success) {
    throw new Error(`"${title}" failed validation: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
  }

  return {
    legacyId: rec._legacyId,
    title,
    input: parsed.data,
    createdAt,
    incomplete,
    incompleteReasons,
    unfinishedSteps,
    inRotation: !incomplete && !unfinishedSteps,
    flags,
    unclassified,
  };
}
