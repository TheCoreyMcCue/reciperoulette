import type { SessionRecord } from "@/lib/db/sessions";
import { newId } from "@/lib/ids";
import { generateToken, hashToken } from "./tokens";

/**
 * Provider-agnostic session logic, independent of Next.js and DynamoDB so it
 * can be unit tested. Any sign-in method (password today; magic link or
 * Google later) ends by calling `createSession` for a resolved user.
 */

export const SESSION_MAX_AGE_SECONDS = 365 * 24 * 3600;
/** Sliding expiration: refresh lastSeenAt / ttl / cookie at most once a day. */
export const SESSION_TOUCH_INTERVAL_MS = 24 * 3600 * 1000;

export interface SessionStore {
  put(s: SessionRecord): Promise<void>;
  get(tokenHash: string): Promise<SessionRecord | null>;
  touch(tokenHash: string, lastSeenAt: string, ttl: number): Promise<void>;
  delete(tokenHash: string): Promise<void>;
}

export type SessionIdentity = { userId: string; householdId: string };

export function expiryFor(now: Date): number {
  return Math.floor(now.getTime() / 1000) + SESSION_MAX_AGE_SECONDS;
}

export async function createSession(
  store: SessionStore,
  identity: SessionIdentity,
  userAgent: string,
  now: Date = new Date(),
): Promise<{ token: string; session: SessionRecord }> {
  const token = generateToken();
  const iso = now.toISOString();
  const session: SessionRecord = {
    sessionId: newId(),
    tokenHash: hashToken(token, "session"),
    userId: identity.userId,
    householdId: identity.householdId,
    userAgent: userAgent.slice(0, 400),
    createdAt: iso,
    lastSeenAt: iso,
    ttl: expiryFor(now),
  };
  await store.put(session);
  return { token, session };
}

export function shouldTouch(session: Pick<SessionRecord, "lastSeenAt">, now: Date): boolean {
  return now.getTime() - new Date(session.lastSeenAt).getTime() > SESSION_TOUCH_INTERVAL_MS;
}

export type ValidatedSession = {
  session: SessionRecord;
  /** True when lastSeenAt/ttl were bumped and the cookie should be re-issued. */
  refreshed: boolean;
};

export async function validateSession(
  store: SessionStore,
  token: string | undefined | null,
  now: Date = new Date(),
): Promise<ValidatedSession | null> {
  if (!token || token.length < 20 || token.length > 200) return null;
  const tokenHash = hashToken(token, "session");
  const session = await store.get(tokenHash);
  if (!session) return null;
  if (session.ttl * 1000 <= now.getTime()) {
    await store.delete(tokenHash);
    return null;
  }
  if (!shouldTouch(session, now)) return { session, refreshed: false };

  const lastSeenAt = now.toISOString();
  const ttl = expiryFor(now);
  try {
    await store.touch(tokenHash, lastSeenAt, ttl);
  } catch (err) {
    // Session deleted concurrently (e.g. signed out from another device).
    if (err instanceof Error && err.name === "ConditionalCheckFailedException") return null;
    throw err;
  }
  return { session: { ...session, lastSeenAt, ttl }, refreshed: true };
}

export async function destroySession(store: SessionStore, token: string): Promise<void> {
  await store.delete(hashToken(token, "session"));
}
