import { beforeEach, describe, expect, it } from "vitest";
import { installFakeDynamo, type FakeDynamo } from "@/dev/fake-dynamo";
import { RecipeInputSchema } from "@/lib/recipes/schema";
import { EmailTakenError } from "./errors";
import { hitRateLimit } from "./rate-limit";
import * as recipes from "./recipes";
import { createHouseholdWithOwner, createMember, getUserByEmail, listMembers, type User } from "./users";

let fake: FakeDynamo;
beforeEach(() => {
  fake = installFakeDynamo();
});

const user = (id: string, email: string, householdId: string): User => ({
  userId: id,
  name: id,
  email,
  passwordHash: "x",
  householdId,
  createdAt: "2026-01-01T00:00:00Z",
});

describe("users & households", () => {
  it("creates a household with its owner and looks users up by email", async () => {
    await createHouseholdWithOwner({ householdId: "h1", name: "Home", createdBy: "u1", createdAt: "t" }, user("u1", "a@x.nl", "h1"));
    await createMember(user("u2", "b@x.nl", "h1"));
    expect((await getUserByEmail("A@X.NL"))?.userId).toBe("u1");
    const members = await listMembers("h1");
    expect(members.map((m) => [m.userId, m.role])).toEqual([["u1", "owner"], ["u2", "member"]]);
  });

  it("enforces unique emails", async () => {
    await createHouseholdWithOwner({ householdId: "h1", name: "Home", createdBy: "u1", createdAt: "t" }, user("u1", "a@x.nl", "h1"));
    await expect(createMember(user("u2", "a@x.nl", "h1"))).rejects.toBeInstanceOf(EmailTakenError);
  });

  it("refuses to add members to a household that doesn't exist", async () => {
    await expect(createMember(user("u2", "b@x.nl", "nope"))).rejects.toThrow();
  });
});

describe("recipes repository", () => {
  const input = RecipeInputSchema.parse({ title: "Soup", tags: ["warm"] });

  it("scopes every operation to the household", async () => {
    const r = await recipes.createRecipe({ householdId: "h1", userId: "u1", input, rawSourceText: "raw soup text" });
    expect(await recipes.getRecipe("h2", r.id)).toBeNull();
    expect(await recipes.listRecipes("h2")).toEqual([]);
    await expect(recipes.setRotation("h2", r.id, true)).rejects.toThrow(/not found/i);
    await expect(recipes.updateRecipe("h2", r.id, input)).rejects.toThrow(/not found/i);
    expect((await recipes.getRecipe("h1", r.id))?.inRotation).toBe(false);
  });

  it("lists recipes without the raw source items", async () => {
    const r = await recipes.createRecipe({ householdId: "h1", userId: "u1", input, rawSourceText: "raw soup text" });
    const list = await recipes.listRecipes("h1");
    expect(list).toHaveLength(1);
    expect(await recipes.getRawSource("h1", r.id)).toBe("raw soup text");
  });

  it("marks cooked, toggles rotation, updates and deletes", async () => {
    const r = await recipes.createRecipe({ householdId: "h1", userId: "u1", input });
    const cooked = await recipes.markCooked("h1", r.id, "2026-03-01T18:00:00Z");
    expect(cooked.timesCooked).toBe(1);
    expect((await recipes.markCooked("h1", r.id)).timesCooked).toBe(2);
    expect((await recipes.setRotation("h1", r.id, true)).inRotation).toBe(true);
    const updated = await recipes.updateRecipe("h1", r.id, { ...input, title: "Better soup" });
    expect(updated.title).toBe("Better soup");
    expect(updated.timesCooked).toBe(2);
    await recipes.deleteRecipe("h1", r.id);
    expect(await recipes.getRecipe("h1", r.id)).toBeNull();
    expect(fake.items.size).toBe(0);
  });
});

describe("rate limit", () => {
  it("allows up to the limit within a window", async () => {
    const now = new Date("2026-01-01T00:00:10Z");
    const results = [];
    for (let i = 0; i < 4; i++) results.push(await hitRateLimit("t", 3, 60, now));
    expect(results.map((r) => r.allowed)).toEqual([true, true, true, false]);
    expect((await hitRateLimit("t", 3, 60, new Date("2026-01-01T00:01:10Z"))).allowed).toBe(true);
  });
});

describe("usage summary", () => {
  it("sums this household's usage since a date", async () => {
    const { logUsage, summarizeUsage } = await import("./usage");
    const base = { userId: "u1", model: "m", source: "text", cacheReadTokens: 0, cacheWriteTokens: 0, durationMs: 1, ok: true };
    await logUsage({ ...base, householdId: "h1", inputTokens: 100, outputTokens: 10 });
    await logUsage({ ...base, householdId: "h1", inputTokens: 50, outputTokens: 5 });
    await logUsage({ ...base, householdId: "h2", inputTokens: 999, outputTokens: 999 });
    await recipes.createRecipe({ householdId: "h1", userId: "u1", input: RecipeInputSchema.parse({ title: "x" }) });
    const s = await summarizeUsage("h1", "2000-01-01T00:00:00.000Z");
    expect(s).toMatchObject({ calls: 2, inputTokens: 150, outputTokens: 15 });
    expect((await summarizeUsage("h1", "2999-01-01T00:00:00.000Z")).calls).toBe(0);
  });
});
