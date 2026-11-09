import { SESSION_MAX_AGE_SECONDS } from "./session-core";

export const SESSION_COOKIE = "rr_session";
/**
 * Short-lived, non-secret marker meaning "the session was checked against the
 * database recently". While present, the proxy skips its DB round-trip.
 */
export const FRESH_COOKIE = "rr_fresh";
export const FRESH_MAX_AGE_SECONDS = 6 * 3600;

const secure = process.env.NODE_ENV === "production";

export const sessionCookieOptions = {
  httpOnly: true,
  secure,
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_MAX_AGE_SECONDS,
};

export const freshCookieOptions = {
  httpOnly: true,
  secure,
  sameSite: "lax" as const,
  path: "/",
  maxAge: FRESH_MAX_AGE_SECONDS,
};
