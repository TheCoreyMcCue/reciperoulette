"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createInvite } from "@/lib/auth/accounts";
import { revokeMySession } from "@/lib/auth/manage";
import { requireSession, signOut } from "@/lib/auth/session";

export type InviteState = { url?: string; expiresAt?: string; error?: string };

export async function createInviteAction(): Promise<InviteState> {
  const session = await requireSession();
  try {
    return await createInvite(session);
  } catch (err) {
    console.error("[settings] invite failed", err);
    return { error: err instanceof Error && err.message.startsWith("Only") ? err.message : "Couldn't create an invite. Try again." };
  }
}

export async function revokeSessionAction(sessionId: string): Promise<void> {
  const session = await requireSession();
  const id = z.string().min(1).max(64).parse(sessionId);
  if (id === session.sessionId) {
    await signOut();
    redirect("/login");
  }
  await revokeMySession(session.userId, id);
  refresh();
}

export async function signOutAction(): Promise<void> {
  await signOut();
  redirect("/login");
}
