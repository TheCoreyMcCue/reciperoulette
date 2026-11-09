import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { PageLoading } from "@/components/ui/spinner";
import { SubmitButton } from "@/components/ui/submit-button";
import { listMySessions } from "@/lib/auth/manage";
import { requireSession } from "@/lib/auth/session";
import { summarizeUsage } from "@/lib/db/usage";
import { getHousehold, getUserById, listMembers } from "@/lib/db/users";
import { env } from "@/lib/env";
import { signOutAction } from "./actions";
import { InviteCard, RevokeButton, ThemeToggle } from "./settings-client";

export const metadata: Metadata = { title: "Settings" };

function Section({ title, children, description }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-3xl border border-border bg-surface p-5">
      <div>
        <h2 className="font-display text-xl font-semibold">{title}</h2>
        {description && <p className="text-sm text-muted">{description}</p>}
      </div>
      {children}
    </section>
  );
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="font-display text-3xl font-semibold">Settings</h1>
      <Suspense fallback={<PageLoading />}>
        <SettingsContent />
      </Suspense>
    </div>
  );
}

async function SettingsContent() {
  const session = await requireSession();
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const [user, household, members, sessions, usage] = await Promise.all([
    getUserById(session.userId),
    getHousehold(session.householdId),
    listMembers(session.householdId),
    listMySessions(session.userId, session.sessionId),
    summarizeUsage(session.householdId, monthStart).catch(() => null),
  ]);
  // Approximate list prices for Claude Sonnet 5.5 (USD per million tokens).
  const cost = usage
    ? (usage.inputTokens * 2 + usage.cacheWriteTokens * 2.5 + usage.cacheReadTokens * 0.2 + usage.outputTokens * 10) / 1_000_000
    : 0;
  const me = members.find((m) => m.userId === session.userId);

  return (
    <div className="space-y-5">
      <p className="text-muted">
        Signed in as <strong className="text-ink">{user?.name}</strong> ({user?.email})
      </p>

      <Section title={household?.name ?? "Household"} description="Everyone here shares one recipe box.">
        <ul className="divide-y divide-border">
          {members.map((m) => (
            <li key={m.userId} className="flex items-center justify-between py-3">
              <div>
                <p className="font-semibold">{m.name}{m.userId === session.userId && " (you)"}</p>
                <p className="text-sm text-muted">{m.email}</p>
              </div>
              <span className="rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold capitalize text-muted">{m.role}</span>
            </li>
          ))}
        </ul>
        {me?.role === "owner" && (
          <div className="border-t border-border pt-4">
            <h3 className="mb-2 font-semibold">Invite someone</h3>
            <InviteCard />
          </div>
        )}
      </Section>

      <Section title="Signed-in devices" description="You stay signed in for a year after you last open the app.">
        <ul className="divide-y divide-border">
          {sessions.map((s) => (
            <li key={s.sessionId} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="font-semibold">
                  {s.device}
                  {s.current && <span className="ml-2 rounded-full bg-herb-soft px-2 py-0.5 text-xs text-herb">This device</span>}
                </p>
                <p className="text-sm text-muted">Last active {fmt(s.lastSeenAt)}</p>
              </div>
              <RevokeButton sessionId={s.sessionId} current={s.current} />
            </li>
          ))}
        </ul>
      </Section>

      {usage && (
        <Section title="AI imports this month" description={`Limit: ${env().AI_DAILY_PARSE_LIMIT} per day for the household.`}>
          <dl className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-2xl bg-surface-2 p-3">
              <dt className="text-xs text-muted">Imports</dt>
              <dd className="font-display text-2xl font-semibold">{usage.calls}</dd>
            </div>
            <div className="rounded-2xl bg-surface-2 p-3">
              <dt className="text-xs text-muted">Tokens</dt>
              <dd className="font-display text-2xl font-semibold">
                {Math.round((usage.inputTokens + usage.outputTokens + usage.cacheReadTokens + usage.cacheWriteTokens) / 1000)}k
              </dd>
            </div>
            <div className="rounded-2xl bg-surface-2 p-3">
              <dt className="text-xs text-muted">≈ Cost</dt>
              <dd className="font-display text-2xl font-semibold">${cost.toFixed(2)}</dd>
            </div>
          </dl>
          <p className="text-xs text-muted">Estimate based on Claude Sonnet 5.5 list prices. Each call is also logged on the server.</p>
        </Section>
      )}

      <Section title="Appearance">
        <ThemeToggle />
      </Section>

      <form action={signOutAction}>
        <SubmitButton variant="danger" className="w-full" size="lg" pendingText="Signing out…">
          Sign out
        </SubmitButton>
      </form>
    </div>
  );
}
