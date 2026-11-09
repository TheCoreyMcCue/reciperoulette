import "server-only";
import { EmailTakenError } from "@/lib/db/errors";
import { deleteInvite, getInvite, putInvite } from "@/lib/db/invites";
import { hitRateLimit } from "@/lib/db/rate-limit";
import {
  createHouseholdWithOwner,
  createMember,
  getHousehold,
  getMember,
  getUserByEmail,
  type User,
} from "@/lib/db/users";
import { env, signupAllowList } from "@/lib/env";
import { epochSeconds, newId, nowIso } from "@/lib/ids";
import { getDummyHash, hashPassword, verifyPassword } from "./password";
import type { SessionIdentity } from "./session-core";
import { generateToken, hashToken } from "./tokens";

/**
 * Account operations. Each sign-in method resolves to a SessionIdentity which
 * the caller turns into a session via signIn(). Adding magic links or Google
 * later means adding another resolver here (and an IDENTITY item kind), not
 * touching sessions.
 */

export type AuthResult = { ok: true; identity: SessionIdentity } | { ok: false; error: string };

const FIFTEEN_MIN = 15 * 60;
const HOUR = 3600;

export async function loginWithPassword(email: string, password: string, ip: string): Promise<AuthResult> {
  const [byEmail, byIp] = await Promise.all([
    hitRateLimit(`login:email:${email}`, 10, FIFTEEN_MIN),
    hitRateLimit(`login:ip:${ip}`, 50, FIFTEEN_MIN),
  ]);
  if (!byEmail.allowed || !byIp.allowed) {
    const mins = Math.ceil(Math.max(byEmail.retryAfter, byIp.retryAfter) / 60);
    return { ok: false, error: `Too many attempts. Try again in about ${mins} minute${mins === 1 ? "" : "s"}.` };
  }

  const user = await getUserByEmail(email);
  // Always run a hash verification so response time doesn't reveal whether the email exists.
  const valid = await verifyPassword(user?.passwordHash ?? (await getDummyHash()), password);
  if (!user || !valid) return { ok: false, error: "That email and password don't match." };
  return { ok: true, identity: { userId: user.userId, householdId: user.householdId } };
}

async function signupRateLimit(ip: string): Promise<string | null> {
  const r = await hitRateLimit(`signup:ip:${ip}`, 10, HOUR);
  return r.allowed ? null : "Too many sign-ups from this network. Try again later.";
}

function newUser(input: { name: string; email: string }, passwordHash: string, householdId: string): User {
  return {
    userId: newId(),
    name: input.name,
    email: input.email,
    passwordHash,
    householdId,
    createdAt: nowIso(),
  };
}

/** First user: creates a brand-new household. Restricted to SIGNUP_ALLOWED_EMAILS. */
export async function signupNewHousehold(
  input: { name: string; email: string; password: string; householdName?: string },
  ip: string,
): Promise<AuthResult> {
  if (!signupAllowList().has(input.email)) {
    return {
      ok: false,
      error: "Sign-up is invite-only. Ask someone in your household to send you an invite link.",
    };
  }
  const limited = await signupRateLimit(ip);
  if (limited) return { ok: false, error: limited };

  const householdId = newId();
  const user = newUser(input, await hashPassword(input.password), householdId);
  try {
    await createHouseholdWithOwner(
      {
        householdId,
        name: input.householdName || `${input.name}'s kitchen`,
        createdBy: user.userId,
        createdAt: user.createdAt,
      },
      user,
    );
  } catch (err) {
    if (err instanceof EmailTakenError) return { ok: false, error: "There's already an account with that email. Try signing in." };
    throw err;
  }
  return { ok: true, identity: { userId: user.userId, householdId } };
}

export async function signupWithInvite(
  code: string,
  input: { name: string; email: string; password: string },
  ip: string,
): Promise<AuthResult> {
  const limited = await signupRateLimit(ip);
  if (limited) return { ok: false, error: limited };

  const codeHash = hashToken(code, "invite");
  const invite = await getInvite(codeHash);
  if (!invite) return { ok: false, error: "This invite link has expired or was already used. Ask for a new one." };

  const user = newUser(input, await hashPassword(input.password), invite.householdId);
  try {
    await createMember(user);
  } catch (err) {
    if (err instanceof EmailTakenError) return { ok: false, error: "There's already an account with that email. Try signing in." };
    throw err;
  }
  await deleteInvite(codeHash); // single use
  return { ok: true, identity: { userId: user.userId, householdId: invite.householdId } };
}

export const INVITE_TTL_DAYS = 7;

export async function createInvite(session: SessionIdentity): Promise<{ url: string; expiresAt: string }> {
  const member = await getMember(session.householdId, session.userId);
  if (member?.role !== "owner") throw new Error("Only the household owner can invite people.");
  const code = generateToken(18);
  const now = new Date();
  const expires = new Date(now.getTime() + INVITE_TTL_DAYS * 86400_000);
  await putInvite({
    codeHash: hashToken(code, "invite"),
    householdId: session.householdId,
    createdBy: session.userId,
    createdAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    ttl: epochSeconds(expires),
  });
  return { url: new URL(`/join/${code}`, env().APP_URL).toString(), expiresAt: expires.toISOString() };
}

export async function describeInvite(code: string): Promise<{ householdName: string } | null> {
  const invite = await getInvite(hashToken(code, "invite"));
  if (!invite) return null;
  const household = await getHousehold(invite.householdId);
  return household ? { householdName: household.name } : null;
}
