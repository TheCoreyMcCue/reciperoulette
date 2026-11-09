import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

/** 256-bit random token, URL-safe. Only ever stored client-side. */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/**
 * Keyed hash (HMAC-SHA256 with SESSION_SECRET). Only hashes are stored in
 * DynamoDB, so a leaked table dump can't be replayed as sessions or invites.
 */
export function hashToken(token: string, purpose: "session" | "invite"): string {
  return createHmac("sha256", env().SESSION_SECRET).update(`${purpose}:${token}`).digest("base64url");
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}
