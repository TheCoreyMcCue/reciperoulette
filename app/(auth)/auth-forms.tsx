"use client";

import Link from "next/link";
import { useActionState } from "react";
import { cardClass } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { Alert, TextField } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { FormState } from "@/lib/form-state";
import { joinAction, loginAction, signupAction } from "./actions";

const card = cn(cardClass, "space-y-5 p-6 sm:p-8");
const title = "title-rule pb-2 font-display text-3xl font-semibold";
const link = "font-bold text-paprika underline-offset-4 hover:underline";

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState<FormState, FormData>(loginAction, {});
  return (
    <form action={action} className={card} noValidate>
      <h1 className={title}>Welcome back</h1>
      {state.error && <Alert>{state.error}</Alert>}
      <input type="hidden" name="next" value={next} />
      <TextField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        defaultValue={state.values?.email}
        error={state.fieldErrors?.email}
      />
      <TextField
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        error={state.fieldErrors?.password}
      />
      <SubmitButton className="w-full" size="lg" pendingText="Signing in…">
        Sign in
      </SubmitButton>
      <p className="text-center text-muted">
        New here? Ask your household for an invite link, or{" "}
        <Link href="/signup" className={link}>
          start a new recipe box
        </Link>
        .
      </p>
    </form>
  );
}

export function SignupForm() {
  const [state, action] = useActionState<FormState, FormData>(signupAction, {});
  return (
    <form action={action} className={card} noValidate>
      <div>
        <h1 className={title}>Start a recipe box</h1>
        <p className="mt-2 text-muted">You can invite your household once you&apos;re in.</p>
      </div>
      {state.error && <Alert>{state.error}</Alert>}
      <TextField label="Your name" name="name" autoComplete="given-name" required defaultValue={state.values?.name} error={state.fieldErrors?.name} />
      <TextField label="Email" name="email" type="email" autoComplete="email" inputMode="email" required defaultValue={state.values?.email} error={state.fieldErrors?.email} />
      <TextField label="Password" name="password" type="password" autoComplete="new-password" required error={state.fieldErrors?.password} hint="At least 8 characters." />
      <TextField label="Household name (optional)" name="householdName" placeholder="e.g. The Kitchen on Prinsengracht" defaultValue={state.values?.householdName} error={state.fieldErrors?.householdName} />
      <SubmitButton className="w-full" size="lg" pendingText="Creating…">
        Create recipe box
      </SubmitButton>
      <p className="text-center text-muted">
        Already have an account?{" "}
        <Link href="/login" className={link}>
          Sign in
        </Link>
      </p>
    </form>
  );
}

export function JoinForm({ code, householdName }: { code: string; householdName: string }) {
  const [state, action] = useActionState<FormState, FormData>(joinAction, {});
  return (
    <form action={action} className={card} noValidate>
      <div>
        <h1 className={title}>Join {householdName}</h1>
        <p className="mt-2 text-muted">You&apos;ll share one recipe box and one rotation.</p>
      </div>
      {state.error && <Alert>{state.error}</Alert>}
      <input type="hidden" name="code" value={code} />
      <TextField label="Your name" name="name" autoComplete="given-name" required defaultValue={state.values?.name} error={state.fieldErrors?.name} />
      <TextField label="Email" name="email" type="email" autoComplete="email" inputMode="email" required defaultValue={state.values?.email} error={state.fieldErrors?.email} />
      <TextField label="Password" name="password" type="password" autoComplete="new-password" required error={state.fieldErrors?.password} hint="At least 8 characters." />
      <SubmitButton className="w-full" size="lg" pendingText="Joining…">
        Join household
      </SubmitButton>
    </form>
  );
}
