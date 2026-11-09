/**
 * Dev-only in-memory DynamoDB, seeded with demo data: `pnpm dev:memory`.
 * Loaded from instrumentation.ts when RR_MEMORY_DB=1 in development. Data is
 * lost when the server restarts. Handy for UI work without AWS credentials.
 */
import { installFakeDynamo } from "./fake-dynamo";

export async function startMemoryDb(): Promise<void> {
  process.env.DYNAMO_REGION ||= "local";
  process.env.SESSION_SECRET ||= "dev-memory-secret-dev-memory-secret-1234";
  process.env.SIGNUP_ALLOWED_EMAILS ||= "you@example.com";
  const g = globalThis as unknown as { __rrMemorySeeded?: boolean };
  if (g.__rrMemorySeeded) return;
  g.__rrMemorySeeded = true;
  installFakeDynamo("memory");
  const { seedDemo } = await import("../scripts/db-seed");
  await seedDemo();
  console.log("[dev] in-memory DynamoDB ready");
}
