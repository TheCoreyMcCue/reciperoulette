"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Alert, inputClass } from "@/components/ui/field";
import { createInviteAction, revokeSessionAction, type InviteState } from "./actions";

export function InviteCard() {
  const [state, setState] = useState<InviteState>({});
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);

  const share = async () => {
    if (!state.url) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Join our recipe box", text: "Join our reciperoulette recipe box:", url: state.url });
        return;
      } catch {
        /* user cancelled; fall through to copy */
      }
    }
    await navigator.clipboard.writeText(state.url);
    setCopied(true);
  };

  return (
    <div className="space-y-3">
      {state.error && <Alert>{state.error}</Alert>}
      {state.url ? (
        <>
          <label className="sr-only" htmlFor="invite-url">Invite link</label>
          <input id="invite-url" readOnly value={state.url} className={inputClass} onFocus={(e) => e.currentTarget.select()} />
          <div className="flex flex-wrap gap-2">
            <Button onClick={share}>{copied ? "Copied!" : "Share link"}</Button>
          </div>
          <p className="text-sm text-muted">
            Works once, expires {new Date(state.expiresAt!).toLocaleDateString(undefined, { day: "numeric", month: "long" })}.
          </p>
        </>
      ) : (
        <Button variant="secondary" disabled={pending} onClick={() => start(async () => setState(await createInviteAction()))}>
          {pending ? "Creating…" : "Create invite link"}
        </Button>
      )}
    </div>
  );
}

export function RevokeButton({ sessionId, current }: { sessionId: string; current: boolean }) {
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="danger"
      disabled={pending}
      onClick={() => {
        if (current && !confirm("Sign out on this device?")) return;
        start(() => revokeSessionAction(sessionId));
      }}
    >
      {pending ? "Signing out…" : current ? "Sign out" : "Sign out device"}
    </Button>
  );
}

type Theme = "system" | "light" | "dark";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading localStorage after hydration
    setTheme((localStorage.getItem("theme") as Theme | null) ?? "system");
  }, []);

  const apply = (t: Theme) => {
    setTheme(t);
    if (t === "system") localStorage.removeItem("theme");
    else localStorage.setItem("theme", t);
    const dark = t === "dark" || (t === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
  };

  return (
    <div role="radiogroup" aria-label="Appearance" className="inline-flex rounded-full border border-border bg-surface p-1">
      {(["system", "light", "dark"] as const).map((t) => (
        <button
          key={t}
          role="radio"
          aria-checked={theme === t}
          onClick={() => apply(t)}
          className={`min-h-10 rounded-full px-4 text-sm font-semibold capitalize ${theme === t ? "bg-primary text-primary-ink" : "text-muted"}`}
        >
          {t === "system" ? "Auto" : t}
        </button>
      ))}
    </div>
  );
}
