"use server";

import { redirect } from "next/navigation";
import { loginWithPassword, signupNewHousehold, signupWithInvite, type AuthResult } from "@/lib/auth/accounts";
import { InviteCodeSchema, LoginSchema, safeNextPath, SignupSchema } from "@/lib/auth/schemas";
import { clientIp, signIn } from "@/lib/auth/session";
import { fieldErrorsFrom, formValues, GENERIC_ERROR, type FormState } from "@/lib/form-state";

async function finish(result: AuthResult, values: Record<string, string>, next: string): Promise<FormState> {
  if (!result.ok) return { error: result.error, values };
  await signIn(result.identity);
  redirect(next);
}

export async function loginAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const values = formValues(fd, ["email"]);
  const parsed = LoginSchema.safeParse({ email: fd.get("email"), password: fd.get("password") });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values };

  let result: AuthResult;
  try {
    result = await loginWithPassword(parsed.data.email, parsed.data.password, await clientIp());
  } catch (err) {
    console.error("[auth] login failed", err);
    return { error: GENERIC_ERROR, values };
  }
  return finish(result, values, safeNextPath(fd.get("next")));
}

export async function signupAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const values = formValues(fd, ["name", "email", "householdName"]);
  const parsed = SignupSchema.safeParse({
    name: fd.get("name"),
    email: fd.get("email"),
    password: fd.get("password"),
    householdName: fd.get("householdName") || undefined,
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values };

  let result: AuthResult;
  try {
    result = await signupNewHousehold(parsed.data, await clientIp());
  } catch (err) {
    console.error("[auth] signup failed", err);
    return { error: GENERIC_ERROR, values };
  }
  return finish(result, values, "/");
}

export async function joinAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const values = formValues(fd, ["name", "email"]);
  const code = InviteCodeSchema.safeParse(fd.get("code"));
  if (!code.success) return { error: "This invite link looks broken. Ask for a new one.", values };
  const parsed = SignupSchema.omit({ householdName: true }).safeParse({
    name: fd.get("name"),
    email: fd.get("email"),
    password: fd.get("password"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values };

  let result: AuthResult;
  try {
    result = await signupWithInvite(code.data, parsed.data, await clientIp());
  } catch (err) {
    console.error("[auth] join failed", err);
    return { error: GENERIC_ERROR, values };
  }
  return finish(result, values, "/");
}
