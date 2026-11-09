import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/env";

/**
 * Shared Anthropic client (server/scripts only: it reads ANTHROPIC_API_KEY).
 * Deliberately not marked "server-only" so CLI scripts like the unit backfill
 * can use it; never import this from a Client Component.
 */
let client: Anthropic | undefined;

export function anthropic(): Anthropic {
  const key = env().ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not configured");
  client ??= new Anthropic({ apiKey: key, timeout: 55_000, maxRetries: 1 });
  return client;
}
