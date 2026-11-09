import { randomBytes } from "node:crypto";

/** URL-safe random id. 12 bytes → 16 chars, ~96 bits of entropy. */
export function newId(bytes = 12): string {
  return randomBytes(bytes).toString("base64url");
}

export function nowIso(): string {
  return new Date().toISOString();
}

/** Seconds since epoch, as DynamoDB TTL expects. */
export function epochSeconds(date: Date = new Date()): number {
  return Math.floor(date.getTime() / 1000);
}
