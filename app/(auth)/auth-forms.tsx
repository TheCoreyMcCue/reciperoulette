"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Alert, TextField } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { FormState } from "@/lib/form-state";
import { joinAction, loginAction, signupAction } from "./actions";

const card = "space-y-5 rounded-3xl border border-border bg-surface p-6 shadow-sm";

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState<FormState, FormData>(loginAction, {});
  return (
    <form action={action} className={card} noValidate>
      <h1 className="font-display text-2xl font-semibold">Welcome back</h1>
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
      <p className="text-center text-sm text-muted">
        New here? Ask your household for an invite link, or{" "}
        <Link href="/signup" className="font-semibold text-primary underline-offset-2 hover:underline">
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
        <h1 className="font-display text-2xl font-semibold">Start a recipe box</h1>
        <p className="mt-1 text-sm text-muted">You can invite your household once you&apos;re in.</p>
      </div>
      {state.error && <Alert>{state.error}</Alert>}
      <TextField label="Your name" name="name" autoComplete="given-name" required defaultValue={state.values?.name} error={state.fieldErrors?.name} />
      <TextField label="Email" name="email" type="email" autoComplete="email" inputMode="email" required defaultValue={state.values?.email} error={state.fieldErrors?.email} />
      <TextField label="Password" name="password" type="password" autoComplete="new-password" required error={state.fieldErrors?.password} hint="At least 8 characters." />
      <TextField label="Household name (optional)" name="householdName" placeholder="e.g. The Kitchen on Prinsengracht" defaultValue={state.values?.householdName} error={state.fieldErrors?.householdName} />
      <SubmitButton className="w-full" size="lg" pendingText="Creating…">
        Create recipe box
      </SubmitButton>
      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-primary underline-offset-2 hover:underline">
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
        <h1 className="font-display text-2xl font-semibold">Join {householdName}</h1>
        <p className="mt-1 text-sm text-muted">You&apos;ll share one recipe box and one rotation.</p>
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
