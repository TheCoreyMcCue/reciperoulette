import { describe, expect, it, vi } from "vitest";
import type { SessionRecord } from "@/lib/db/sessions";
import {
  createSession,
  destroySession,
  SESSION_MAX_AGE_SECONDS,
  shouldTouch,
  validateSession,
  type SessionStore,
} from "./session-core";
import { hashToken } from "./tokens";

function memoryStore() {
  const items = new Map<string, SessionRecord>();
  const store: SessionStore = {
    put: vi.fn(async (s) => void items.set(s.tokenHash, s)),
    get: vi.fn(async (h) => items.get(h) ?? null),
    touch: vi.fn(async (h, lastSeenAt, ttl) => {
      const s = items.get(h);
      if (!s) throw Object.assign(new Error("gone"), { name: "ConditionalCheckFailedException" });
      items.set(h, { ...s, lastSeenAt, ttl });
    }),
    delete: vi.fn(async (h) => void items.delete(h)),
  };
  return { store, items };
}

const identity = { userId: "u1", householdId: "h1" };
const day = 24 * 3600 * 1000;

describe("session core", () => {
  it("stores only the token hash, never the raw token", async () => {
    const { store, items } = memoryStore();
    const { token, session } = await createSession(store, identity, "UA");
    expect(token.length).toBeGreaterThanOrEqual(43);
    expect(items.has(token)).toBe(false);
    expect(session.tokenHash).toBe(hashToken(token, "session"));
    expect(JSON.stringify([...items.values()])).not.toContain(token);
  });

  it("sets a one-year ttl", async () => {
    const { store } = memoryStore();
    const now = new Date("2026-01-01T00:00:00Z");
    const { session } = await createSession(store, identity, "UA", now);
    expect(session.ttl).toBe(Math.floor(now.getTime() / 1000) + SESSION_MAX_AGE_SECONDS);
  });

  it("validates a fresh session without writing", async () => {
    const { store } = memoryStore();
    const now = new Date("2026-01-01T00:00:00Z");
    const { token } = await createSession(store, identity, "UA", now);
    const res = await validateSession(store, token, new Date(now.getTime() + 60_000));
    expect(res?.session.userId).toBe("u1");
    expect(res?.refreshed).toBe(false);
    expect(store.touch).not.toHaveBeenCalled();
  });

  it("slides expiry when last seen more than a day ago", async () => {
    const { store, items } = memoryStore();
    const start = new Date("2026-01-01T00:00:00Z");
    const { token, session } = await createSession(store, identity, "UA", start);
    const later = new Date(start.getTime() + 200 * day);
    const res = await validateSession(store, token, later);
    expect(res?.refreshed).toBe(true);
    const stored = items.get(session.tokenHash)!;
    expect(stored.lastSeenAt).toBe(later.toISOString());
    expect(stored.ttl).toBe(Math.floor(later.getTime() / 1000) + SESSION_MAX_AGE_SECONDS);
  });

  it("rejects expired sessions and cleans them up", async () => {
    const { store, items } = memoryStore();
    const start = new Date("2026-01-01T00:00:00Z");
    const { token } = await createSession(store, identity, "UA", start);
    const res = await validateSession(store, token, new Date(start.getTime() + 366 * day));
    expect(res).toBeNull();
    expect(items.size).toBe(0);
  });

  it("rejects unknown, missing and malformed tokens", async () => {
    const { store } = memoryStore();
    expect(await validateSession(store, undefined)).toBeNull();
    expect(await validateSession(store, "short")).toBeNull();
    expect(await validateSession(store, "x".repeat(43))).toBeNull();
  });

  it("treats a concurrently deleted session as signed out", async () => {
    const { store, items } = memoryStore();
    const start = new Date("2026-01-01T00:00:00Z");
    const { token } = await createSession(store, identity, "UA", start);
    vi.mocked(store.get).mockImplementationOnce(async (h) => {
      const s = items.get(h)!;
      items.delete(h);
      return s;
    });
    expect(await validateSession(store, token, new Date(start.getTime() + 2 * day))).toBeNull();
  });

  it("destroys sessions", async () => {
    const { store, items } = memoryStore();
    const { token } = await createSession(store, identity, "UA");
    await destroySession(store, token);
    expect(items.size).toBe(0);
  });

  it("shouldTouch respects the one-day interval", () => {
    const now = new Date("2026-01-02T00:00:01Z");
    expect(shouldTouch({ lastSeenAt: "2026-01-01T00:00:00Z" }, now)).toBe(true);
    expect(shouldTouch({ lastSeenAt: "2026-01-01T12:00:00Z" }, now)).toBe(false);
  });

  it("hashes are purpose-separated", () => {
    expect(hashToken("abc", "session")).not.toBe(hashToken("abc", "invite"));
  });
});
