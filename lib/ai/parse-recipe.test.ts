import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { installFakeDynamo, type FakeDynamo } from "@/dev/fake-dynamo";
import { resetEnvCache } from "@/lib/env";
import type { AiRecipe } from "./schema";

const parse = vi.fn();
vi.mock("@anthropic-ai/sdk", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@anthropic-ai/sdk")>();
  class FakeAnthropic {
    beta = { messages: { parse } };
  }
  Object.assign(FakeAnthropic, actual.default); // keep static error classes
  return { ...actual, default: FakeAnthropic };
});

const { parseRecipe } = await import("./parse-recipe");

const recipe: AiRecipe = {
  isRecipe: true,
  notRecipeReason: "",
  title: "Erwtensoep",
  description: "",
  servings: 6,
  prepTimeMinutes: null,
  cookTimeMinutes: 90,
  totalTimeMinutes: null,
  ingredients: [{ quantity: "500", quantityValue: 500, unit: "g", item: "spliterwten", note: "", group: "Voor de soep", category: "dry", gramsPerCup: 195 }],
  steps: [{ text: "Breng aan de kook.", group: "" }],
  tags: ["soup"],
  cuisine: "Dutch",
  language: "nl",
  sourceAuthor: "",
  warnings: ["Times are approximate."],
};

const reply = (parsed_output: unknown, stop_reason = "end_turn") => ({
  parsed_output,
  stop_reason,
  model: "claude-sonnet-5-5",
  content: [{ type: "text", text: JSON.stringify(parsed_output) }],
  usage: { input_tokens: 1200, output_tokens: 400, cache_read_input_tokens: 900, cache_creation_input_tokens: 0 },
});

const ctx = { householdId: "h1", userId: "u1" };
const text = readFileSync(new URL("../../tests/fixtures/whatsapp-dutch.txt", import.meta.url), "utf8");
let fake: FakeDynamo;

beforeEach(() => {
  fake = installFakeDynamo();
  parse.mockReset();
  process.env.ANTHROPIC_API_KEY = "test";
  process.env.AI_DAILY_PARSE_LIMIT = "3";
  resetEnvCache();
});

describe("parseRecipe", () => {
  it("returns the mapped recipe, keeps raw text, logs usage", async () => {
    parse.mockResolvedValueOnce(reply(recipe));
    const r = await parseRecipe({ text, meta: { sourceType: "text" } }, ctx);
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    expect(r.recipe.title).toBe("Erwtensoep");
    expect(r.recipe.ingredients[0]!.group).toBe("Voor de soep");
    expect(r.warnings).toContain("Times are approximate.");
    expect(r.rawSourceText).toContain("spliterwten");

    const req = parse.mock.calls[0]![0];
    expect(req.model).toBe("claude-sonnet-5-5");
    expect(req.system[0].cache_control).toEqual({ type: "ephemeral" });
    expect(req.messages[0].content.at(-1).text).toContain("do not translate");
    await new Promise((r) => setTimeout(r, 0));
    const usage = [...fake.items.values()].filter((i) => i.entity === "Usage");
    expect(usage).toHaveLength(1);
    expect(usage[0]).toMatchObject({ inputTokens: 1200, outputTokens: 400, cacheReadTokens: 900, ok: true });
  });

  it("sends images before the text and asks for translation when requested", async () => {
    parse.mockResolvedValueOnce(reply(recipe));
    await parseRecipe({ images: [{ mediaType: "image/jpeg", data: "AAAA" }], translateToEnglish: true, meta: { sourceType: "photo" } }, ctx);
    const content = parse.mock.calls[0]![0].messages[0].content;
    expect(content[0].type).toBe("image");
    expect(content.at(-1).text).toContain("Translate the recipe into English");
  });

  it("reports not-a-recipe", async () => {
    parse.mockResolvedValueOnce(reply({ ...recipe, isRecipe: false, notRecipeReason: "This is a photo of a cat." }));
    const r = await parseRecipe({ text: "my cat is cute", meta: { sourceType: "text" } }, ctx);
    expect(r).toEqual({ status: "not_recipe", message: "This is a photo of a cat." });
  });

  it("retries once with the validation error, then succeeds", async () => {
    parse.mockResolvedValueOnce(reply({ title: 42 })).mockResolvedValueOnce(reply(recipe));
    const r = await parseRecipe({ text, meta: { sourceType: "text" } }, ctx);
    expect(r.status).toBe("ok");
    expect(parse).toHaveBeenCalledTimes(2);
    const retryMessages = parse.mock.calls[1]![0].messages;
    expect(retryMessages).toHaveLength(3);
    expect(retryMessages[2].content).toMatch(/didn't validate/);
  });

  it("falls back to whatever we got after a second failure", async () => {
    const broken = { ...recipe, isRecipe: "yes" };
    parse.mockResolvedValue(reply(broken));
    const r = await parseRecipe({ text, meta: { sourceType: "text" } }, ctx);
    expect(r.status).toBe("partial");
    if (r.status === "partial") expect(r.recipe.title).toBe("Erwtensoep");
  });

  it("enforces the daily household limit", async () => {
    parse.mockResolvedValue(reply(recipe));
    for (let i = 0; i < 3; i++) expect((await parseRecipe({ text, meta: { sourceType: "text" } }, ctx)).status).toBe("ok");
    const r = await parseRecipe({ text, meta: { sourceType: "text" } }, ctx);
    expect(r.status).toBe("limited");
    // Another household is unaffected.
    expect((await parseRecipe({ text, meta: { sourceType: "text" } }, { householdId: "h2", userId: "u9" })).status).toBe("ok");
  });

  it("handles refusals without retrying", async () => {
    parse.mockResolvedValueOnce(reply(null, "refusal"));
    const r = await parseRecipe({ text, meta: { sourceType: "text" } }, ctx);
    expect(r.status).toBe("error");
    expect(parse).toHaveBeenCalledTimes(1);
  });

  it("rejects empty input without calling the API", async () => {
    const r = await parseRecipe({ text: "  ", meta: { sourceType: "text" } }, ctx);
    expect(r.status).toBe("error");
    expect(parse).not.toHaveBeenCalled();
  });
});

describe("parseRecipe configuration", () => {
  it("explains a missing API key", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    resetEnvCache();
    const r = await parseRecipe({ text: "some recipe text here", meta: { sourceType: "text" } }, ctx);
    expect(r.status).toBe("error");
    if (r.status === "error") expect(r.message).toMatch(/API key/);
    expect(parse).not.toHaveBeenCalled();
  });
});
