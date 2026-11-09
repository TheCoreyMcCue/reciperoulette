import { afterEach, describe, expect, it } from "vitest";
import { env, resetEnvCache, signupAllowList } from "./env";

describe("env", () => {
  afterEach(() => resetEnvCache());

  it("applies defaults", () => {
    const e = env();
    expect(e.ANTHROPIC_MODEL).toMatch(/^claude-/);
    expect(e.AI_DAILY_PARSE_LIMIT).toBe(50);
  });

  it("normalises the signup allow list", () => {
    process.env.SIGNUP_ALLOWED_EMAILS = " A@Example.com, b@example.com ,,";
    expect([...signupAllowList()]).toEqual(["a@example.com", "b@example.com"]);
    delete process.env.SIGNUP_ALLOWED_EMAILS;
  });

  it("rejects a short session secret", () => {
    const prev = process.env.SESSION_SECRET;
    process.env.SESSION_SECRET = "short";
    expect(() => env()).toThrow(/SESSION_SECRET/);
    process.env.SESSION_SECRET = prev;
  });
});
