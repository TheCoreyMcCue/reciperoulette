import { z } from "zod";

/**
 * Server-side environment, validated with Zod on first access.
 *
 * Parsing is lazy so that `next build` and unit tests don't require a fully
 * populated environment; the first code path that actually needs a value
 * fails loudly with a readable message instead.
 */
const emptyToUndefined = (v: unknown) => (v === "" ? undefined : v);

const EnvSchema = z.object({
  DYNAMO_REGION: z.string().min(1),
  DYNAMO_ACCESS_KEY_ID: z.preprocess(emptyToUndefined, z.string().optional()),
  DYNAMO_SECRET_ACCESS_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  DYNAMO_TABLE_NAME: z.preprocess(emptyToUndefined, z.string().default("reciperoulette")),
  /** Optional, e.g. http://localhost:8000 for DynamoDB Local. */
  DYNAMO_ENDPOINT: z.preprocess(emptyToUndefined, z.url().optional()),

  ANTHROPIC_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  ANTHROPIC_MODEL: z.preprocess(emptyToUndefined, z.string().default("claude-sonnet-5-5")),
  AI_DAILY_PARSE_LIMIT: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().positive().default(50),
  ),

  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  APP_URL: z.preprocess(emptyToUndefined, z.url().default("http://localhost:3000")),

  /**
   * Comma-separated emails allowed to sign up *without* an invite (i.e. to
   * create a new household). Everyone else needs an invite link.
   */
  SIGNUP_ALLOWED_EMAILS: z.preprocess(emptyToUndefined, z.string().default("")),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | undefined;

export function env(): Env {
  if (cached) return cached;
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}\nSee .env.example.`);
  }
  cached = parsed.data;
  return cached;
}

export function signupAllowList(): Set<string> {
  return new Set(
    env()
      .SIGNUP_ALLOWED_EMAILS.split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

/** Test helper: forget the cached env so tests can change process.env. */
export function resetEnvCache(): void {
  cached = undefined;
}
