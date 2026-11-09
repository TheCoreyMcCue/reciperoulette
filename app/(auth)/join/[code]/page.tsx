import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { buttonClass } from "@/components/ui/button";
import { PageLoading } from "@/components/ui/spinner";
import { describeInvite } from "@/lib/auth/accounts";
import { InviteCodeSchema } from "@/lib/auth/schemas";
import { getCurrentSession } from "@/lib/auth/session";
import { JoinForm } from "../../auth-forms";

export const metadata: Metadata = { title: "Join a household" };

export default function JoinPage({ params }: PageProps<"/join/[code]">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <Join params={params} />
    </Suspense>
  );
}

async function Join({ params }: Pick<PageProps<"/join/[code]">, "params">) {
  const { code } = await params;
  const parsed = InviteCodeSchema.safeParse(code);
  const invite = parsed.success ? await describeInvite(parsed.data) : null;

  if (!invite) {
    return (
      <div className="space-y-4 rounded-3xl border border-border bg-surface p-6">
        <h1 className="font-display text-2xl font-semibold">This invite has expired</h1>
        <p className="text-muted">
          Invite links work once and last 7 days. Ask whoever sent it to create a new one from their Settings page.
        </p>
        <Link href="/login" className={buttonClass("secondary")}>
          Go to sign in
        </Link>
      </div>
    );
  }

  if (await getCurrentSession()) {
    return (
      <div className="space-y-4 rounded-3xl border border-border bg-surface p-6">
        <h1 className="font-display text-2xl font-semibold">You&apos;re already signed in</h1>
        <p className="text-muted">
          This invite is for someone new joining <strong>{invite.householdName}</strong>. Send the link to them, or sign
          out first if you want to create a separate account.
        </p>
        <Link href="/" className={buttonClass("primary")}>
          Back to recipes
        </Link>
      </div>
    );
  }

  return <JoinForm code={code} householdName={invite.householdName} />;
}
