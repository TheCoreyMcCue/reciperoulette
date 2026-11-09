import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { FRESH_COOKIE, freshCookieOptions, SESSION_COOKIE, sessionCookieOptions } from "./cookies";
import { createSession, destroySession, validateSession, type SessionIdentity } from "./session-core";
import { dynamoSessionStore } from "./store";

export type CurrentSession = {
  userId: string;
  householdId: string;
  sessionId: string;
};

/**
 * Validates the session cookie against DynamoDB. Memoised per request so a
 * page and its children share one lookup.
 */
export const getCurrentSession = cache(async (): Promise<CurrentSession | null> => {
  // Session checks are inherently per-request (they read the clock and the DB).
  await connection();
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const result = await validateSession(dynamoSessionStore, token);
  if (!result) return null;
  const { userId, householdId, sessionId } = result.session;
  return { userId, householdId, sessionId };
});

/** For pages and Server Actions: redirect to /login when signed out. */
export async function requireSession(): Promise<CurrentSession> {
  const s = await getCurrentSession();
  if (!s) redirect("/login");
  return s;
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Please sign in again.");
    this.name = "UnauthorizedError";
  }
}

/** For route handlers: throws UnauthorizedError (mapped to 401). */
export async function requireApiSession(): Promise<CurrentSession> {
  const s = await getCurrentSession();
  if (!s) throw new UnauthorizedError();
  return s;
}

/** Issues a new session + cookie. Call from Server Actions / route handlers only. */
export async function signIn(identity: SessionIdentity): Promise<void> {
  const ua = (await headers()).get("user-agent") ?? "";
  const { token } = await createSession(dynamoSessionStore, identity, ua);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, sessionCookieOptions);
  jar.set(FRESH_COOKIE, "1", freshCookieOptions);
}

export async function signOut(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await destroySession(dynamoSessionStore, token);
  jar.delete(SESSION_COOKIE);
  jar.delete(FRESH_COOKIE);
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-real-ip") ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}
