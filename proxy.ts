import { NextResponse, type NextRequest } from "next/server";
import { FRESH_COOKIE, freshCookieOptions, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/cookies";
import { validateSession } from "@/lib/auth/session-core";
import { dynamoSessionStore } from "@/lib/auth/store";

/**
 * Runs before every app route (Node runtime).
 *  1. Signed-out visitors to protected pages are redirected to /login.
 *  2. Sliding expiration: when the short-lived "fresh" marker is missing, the
 *     session is checked in DynamoDB (bumping lastSeenAt/ttl if > 1 day old)
 *     and the session cookie is re-issued with a fresh 1-year expiry.
 *
 * This is only an optimistic gate. Every page, Server Action and route
 * handler still validates the session itself (requireSession / requireApiSession).
 */

const PUBLIC_PATHS = [/^\/login\/?$/, /^\/signup\/?$/, /^\/join\/[^/]+\/?$/, /^\/offline\/?$/];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((re) => re.test(pathname));
}

function unauthenticated(req: NextRequest, clearCookie: boolean) {
  const { pathname, search } = req.nextUrl;
  let res: NextResponse;
  if (pathname.startsWith("/api/")) {
    res = NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  } else {
    const url = new URL("/login", req.url);
    if (pathname !== "/") url.searchParams.set("next", pathname + search);
    // 303 so a POST (e.g. Android share target) becomes a GET on /login.
    res = NextResponse.redirect(url, 303);
  }
  if (clearCookie) {
    res.cookies.delete(SESSION_COOKIE);
    res.cookies.delete(FRESH_COOKIE);
  }
  return res;
}

export async function proxy(req: NextRequest) {
  if (isPublic(req.nextUrl.pathname)) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return unauthenticated(req, false);
  if (req.cookies.has(FRESH_COOKIE)) return NextResponse.next();

  try {
    const result = await validateSession(dynamoSessionStore, token);
    if (!result) return unauthenticated(req, true);
  } catch (err) {
    // Don't lock people out because of a transient DB error; the page-level
    // check will decide.
    console.error("[proxy] session check failed", err);
    return NextResponse.next();
  }

  const res = NextResponse.next();
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  res.cookies.set(FRESH_COOKIE, "1", freshCookieOptions);
  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|manifest.webmanifest|sw.js|robots.txt|.*\\.(?:png|svg|jpg|jpeg|webp|ico|txt)$).*)",
  ],
};
