import { z } from "zod";
import { MIN_PASSWORD_LENGTH } from "./password";

const email = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address").max(254));

export const LoginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password").max(200),
});

export const SignupSchema = z.object({
  name: z.string().trim().min(1, "What should we call you?").max(60),
  email,
  password: z
    .string()
    .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters`)
    .max(200),
  householdName: z.string().trim().max(60).optional(),
});

export const InviteCodeSchema = z.string().regex(/^[A-Za-z0-9_-]{16,64}$/);

/** Only allow same-origin relative redirects after login. */
export function safeNextPath(next: unknown): string {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return "/";
  }
  return next.slice(0, 2000);
}
