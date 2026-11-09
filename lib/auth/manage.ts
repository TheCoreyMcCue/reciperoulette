import "server-only";
import { deleteSession, listSessionsForUser } from "@/lib/db/sessions";
import { describeDevice } from "./device";

export type SessionView = {
  sessionId: string;
  device: string;
  createdAt: string;
  lastSeenAt: string;
  current: boolean;
};

export async function listMySessions(userId: string, currentSessionId: string): Promise<SessionView[]> {
  const sessions = await listSessionsForUser(userId);
  return sessions
    .map((s) => ({
      sessionId: s.sessionId,
      device: describeDevice(s.userAgent),
      createdAt: s.createdAt,
      lastSeenAt: s.lastSeenAt,
      current: s.sessionId === currentSessionId,
    }))
    .sort((a, b) => Number(b.current) - Number(a.current) || b.lastSeenAt.localeCompare(a.lastSeenAt));
}

/**
 * Revokes one of the *current user's* sessions by its public id. We look it
 * up within the user's own sessions, so one user can't revoke another's.
 */
export async function revokeMySession(userId: string, sessionId: string): Promise<boolean> {
  const sessions = await listSessionsForUser(userId);
  const target = sessions.find((s) => s.sessionId === sessionId);
  if (!target) return false;
  await deleteSession(target.tokenHash);
  return true;
}
