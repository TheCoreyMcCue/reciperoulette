import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { hitRateLimit } from "@/lib/db/rate-limit";
import { logUsage } from "@/lib/db/usage";
import { env } from "@/lib/env";
import type { RecipeInput } from "@/lib/recipes/schema";
import { aiToRecipeInput, type SourceMeta } from "./map";
import { SYSTEM_PROMPT } from "./prompt";
import { AiRecipeSchema, type AiRecipe } from "./schema";

/**
 * The one entry point for AI recipe parsing. Every importer (photo, text,
 * URL, social, share) funnels through here so they share one prompt, one
 * schema, one rate limit and one usage log.
 */

export type ImageInput = { mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif"; data: string };

export type ParseInput = {
  text?: string;
  images?: ImageInput[];
  /** Pre-extracted structured data (e.g. schema.org JSON-LD), to clean up and fill gaps. */
  structured?: unknown;
  translateToEnglish?: boolean;
  meta: SourceMeta;
};

export type ParseContext = { householdId: string; userId: string };

export type ParseResult =
  | { status: "ok"; recipe: RecipeInput; warnings: string[]; rawSourceText: string }
  | { status: "partial"; recipe: RecipeInput; warnings: string[]; rawSourceText: string }
  | { status: "not_recipe"; message: string }
  | { status: "limited"; message: string }
  | { status: "error"; message: string };

export const MAX_SOURCE_CHARS = 60_000;
export const MAX_IMAGES = 6;

let client: Anthropic | undefined;
function anthropic(): Anthropic {
  const key = env().ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not configured");
  client ??= new Anthropic({ apiKey: key, timeout: 55_000, maxRetries: 1 });
  return client;
}

function buildUserContent(input: ParseInput): { content: Anthropic.Beta.BetaContentBlockParam[]; truncated: boolean } {
  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  for (const img of (input.images ?? []).slice(0, MAX_IMAGES)) {
    content.push({ type: "image", source: { type: "base64", media_type: img.mediaType, data: img.data } });
  }
  const text = input.text ?? "";
  const truncated = text.length > MAX_SOURCE_CHARS;
  const parts: string[] = [];
  if (input.images?.length) {
    parts.push(`The ${input.images.length > 1 ? `${input.images.length} images above are` : "image above is"} the recipe source.`);
  }
  if (input.meta.sourceUrl) parts.push(`<source_url>${input.meta.sourceUrl}</source_url>`);
  if (input.structured) {
    parts.push(
      `<structured_data>\n${JSON.stringify(input.structured).slice(0, 30_000)}\n</structured_data>\nThis structured data was extracted from the page. Prefer it, clean it up (split ingredients, fix HTML entities, detect groupings) and fill gaps from the page text if provided.`,
    );
  }
  if (text) parts.push(`<source_text>\n${text.slice(0, MAX_SOURCE_CHARS)}\n</source_text>`);
  parts.push(
    input.translateToEnglish
      ? "Translate the recipe into English."
      : "Keep the recipe in its original language (do not translate).",
  );
  content.push({ type: "text", text: parts.join("\n\n") });
  return { content, truncated };
}

/** Text we keep for re-parsing later (images themselves are never stored). */
function rawSourceFor(input: ParseInput, ai: AiRecipe | null): string {
  if (input.text) return input.text.slice(0, MAX_SOURCE_CHARS);
  if (input.structured) return JSON.stringify(input.structured).slice(0, MAX_SOURCE_CHARS);
  // For photos, the best "source text" we have is what the model read.
  if (ai) {
    return [
      ai.title,
      ...ai.ingredients.map((i) => [i.group && `[${i.group}]`, i.quantity, i.unit, i.item, i.note && `(${i.note})`].filter(Boolean).join(" ")),
      "",
      ...ai.steps.map((s, n) => `${n + 1}. ${s.text}`),
    ].join("\n");
  }
  return "";
}

type Attempt = { ai: AiRecipe | null; raw: unknown; issue: string | null; message: Anthropic.Beta.BetaMessage | null };

export async function parseRecipe(input: ParseInput, ctx: ParseContext): Promise<ParseResult> {
  const e = env();
  if (!input.text?.trim() && !input.images?.length && !input.structured) {
    return { status: "error", message: "There's nothing to read yet. Add a photo, some text or a link." };
  }

  if (!e.ANTHROPIC_API_KEY) {
    console.error("[ai] ANTHROPIC_API_KEY is not set");
    return { status: "error", message: "AI import isn't set up yet (the Anthropic API key is missing). You can still add recipes by hand." };
  }

  const limit = await hitRateLimit(`ai:${ctx.householdId}`, e.AI_DAILY_PARSE_LIMIT, 86400);
  if (!limit.allowed) {
    const hours = Math.ceil(limit.retryAfter / 3600);
    return {
      status: "limited",
      message: `You've hit today's limit of ${limit.limit} AI imports. It resets in about ${hours} hour${hours === 1 ? "" : "s"}. You can still add recipes by hand.`,
    };
  }

  const { content, truncated } = buildUserContent(input);
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content }];

  const call = async (): Promise<Attempt> => {
    const started = Date.now();
    let message: Anthropic.Beta.BetaMessage | null = null;
    let ok = false;
    try {
      const res = await anthropic().beta.messages.parse({
        model: e.ANTHROPIC_MODEL,
        max_tokens: 16000,
        // Extraction doesn't need deep reasoning; low effort keeps it fast.
        output_config: { effort: "low", format: betaZodOutputFormat(AiRecipeSchema) },
        system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
        messages,
        // If a safety classifier declines, let the API retry on a fallback model.
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
      });
      message = res;
      if (res.stop_reason === "refusal") return { ai: null, raw: null, issue: "refusal", message };
      if (res.stop_reason === "max_tokens") return { ai: null, raw: null, issue: "The response was cut off.", message };
      const parsed = AiRecipeSchema.safeParse(res.parsed_output);
      ok = parsed.success;
      return parsed.success
        ? { ai: parsed.data, raw: res.parsed_output, issue: null, message }
        : { ai: null, raw: res.parsed_output, issue: parsed.error.issues.slice(0, 5).map((i) => `${i.path.join(".")}: ${i.message}`).join("; "), message };
    } catch (err) {
      // JSON/schema parse failures from the SDK helper: retryable once.
      if (err instanceof Anthropic.APIError) throw err;
      return { ai: null, raw: null, issue: err instanceof Error ? err.message.slice(0, 300) : "Invalid output", message };
    } finally {
      const u = message?.usage;
      const record = {
        householdId: ctx.householdId,
        userId: ctx.userId,
        model: message?.model ?? e.ANTHROPIC_MODEL,
        source: input.meta.sourceType,
        inputTokens: u?.input_tokens ?? 0,
        outputTokens: u?.output_tokens ?? 0,
        cacheReadTokens: u?.cache_read_input_tokens ?? 0,
        cacheWriteTokens: u?.cache_creation_input_tokens ?? 0,
        durationMs: Date.now() - started,
        ok,
      };
      console.log(JSON.stringify({ event: "ai.parse", ...record }));
      void logUsage(record).catch((err) => console.error("[ai] usage log failed", err));
    }
  };

  let attempt: Attempt;
  try {
    attempt = await call();
    if (!attempt.ai && attempt.issue !== "refusal") {
      // Retry once, telling the model what was wrong.
      if (attempt.message) messages.push({ role: "assistant", content: attempt.message.content });
      messages.push({
        role: "user",
        content: `Your previous output didn't validate (${attempt.issue}). Return the recipe again, matching the schema exactly.`,
      });
      const second = await call();
      if (second.ai || !attempt.raw) attempt = second;
    }
  } catch (err) {
    console.error("[ai] parse failed", err);
    if (err instanceof Anthropic.RateLimitError || err instanceof Anthropic.InternalServerError) {
      return { status: "error", message: "The recipe reader is busy right now. Please try again in a minute." };
    }
    if (err instanceof Anthropic.APIConnectionError) {
      return { status: "error", message: "Couldn't reach the recipe reader. Check your connection and try again." };
    }
    return { status: "error", message: "Something went wrong reading that recipe. Please try again, or add it by hand." };
  }

  if (attempt.issue === "refusal") {
    return { status: "error", message: "The recipe reader couldn't process that content. Try a different photo or paste the text instead." };
  }

  const warnings: string[] = [];
  if (truncated) warnings.push("The source was very long, so only the first part was read. Check that nothing is missing at the end.");

  if (attempt.ai) {
    if (!attempt.ai.isRecipe) {
      return {
        status: "not_recipe",
        message: attempt.ai.notRecipeReason || "That doesn't look like a recipe.",
      };
    }
    return {
      status: "ok",
      recipe: aiToRecipeInput(attempt.ai, input.meta),
      warnings: [...warnings, ...attempt.ai.warnings.slice(0, 8)],
      rawSourceText: rawSourceFor(input, attempt.ai),
    };
  }

  // Fallback: show whatever we got in the form so the user can fix it.
  if (attempt.raw && typeof attempt.raw === "object") {
    return {
      status: "partial",
      recipe: aiToRecipeInput(attempt.raw as Partial<AiRecipe>, input.meta),
      warnings: [...warnings, "We couldn't read everything cleanly. Please double-check every field."],
      rawSourceText: rawSourceFor(input, null),
    };
  }
  return { status: "error", message: "We couldn't make sense of that one. Try again, or paste the text instead." };
}
