import { describe, expect, it } from "vitest";
import { describeDevice } from "./device";
import { hashPassword, verifyPassword } from "./password";
import { LoginSchema, safeNextPath } from "./schemas";

describe("safeNextPath", () => {
  it("allows same-origin paths", () => {
    expect(safeNextPath("/recipes/abc?x=1")).toBe("/recipes/abc?x=1");
  });
  it.each(["https://evil.com", "//evil.com", "/\\evil.com", "javascript:alert(1)", undefined, 42])(
    "rejects %s",
    (v) => expect(safeNextPath(v)).toBe("/"),
  );
});

describe("LoginSchema", () => {
  it("normalises email", () => {
    expect(LoginSchema.parse({ email: "  Me@Example.COM ", password: "x" }).email).toBe("me@example.com");
  });
});

describe("password hashing", () => {
  it("verifies the right password only", async () => {
    const h = await hashPassword("correct horse");
    expect(h.startsWith("$argon2id$")).toBe(true);
    expect(await verifyPassword(h, "correct horse")).toBe(true);
    expect(await verifyPassword(h, "wrong")).toBe(false);
    expect(await verifyPassword("not-a-hash", "x")).toBe(false);
  });
});

describe("describeDevice", () => {
  it("labels common devices", () => {
    expect(
      describeDevice("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"),
    ).toBe("Safari on iPhone");
    expect(
      describeDevice("Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36"),
    ).toBe("Chrome on Android phone");
    expect(describeDevice("")).toBe("Unknown device");
  });
});
