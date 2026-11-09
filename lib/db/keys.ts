/**
 * Single-table key layout. Every key is built here so the shape of the table
 * is documented in one place.
 *
 *  PK                         SK                      What
 *  ─────────────────────────  ──────────────────────  ─────────────────────────────
 *  USER#<userId>              PROFILE                 user profile + password hash
 *  EMAIL#<email>              IDENTITY                email → userId (uniqueness)
 *  HOUSEHOLD#<hid>            META                    household
 *  HOUSEHOLD#<hid>            MEMBER#<userId>         membership + role
 *  HOUSEHOLD#<hid>            RECIPE#<rid>            recipe (no raw source)
 *  HOUSEHOLD#<hid>            RECIPESRC#<rid>         raw source text for re-parsing
 *  HOUSEHOLD#<hid>            USAGE#<iso>#<rand>      AI token usage log (TTL 90d)
 *  INVITE#<codeHash>          META                    invite (TTL 7d)
 *  SESSION#<tokenHash>        META                    session (TTL, sliding)
 *                             GSI1: USER#<userId> / SESSION#<createdAt>
 *  RATE#<bucket>              WINDOW#<n>              rate-limit counter (TTL)
 *
 * Everything user-visible lives under HOUSEHOLD#<hid>, so a household's data
 * is a single partition and cross-household access is impossible as long as
 * the householdId comes from the session (never from the request).
 */

export const k = {
  user: (userId: string) => ({ PK: `USER#${userId}`, SK: "PROFILE" }),
  email: (email: string) => ({ PK: `EMAIL#${email.toLowerCase()}`, SK: "IDENTITY" }),
  household: (hid: string) => ({ PK: `HOUSEHOLD#${hid}`, SK: "META" }),
  member: (hid: string, userId: string) => ({ PK: `HOUSEHOLD#${hid}`, SK: `MEMBER#${userId}` }),
  recipe: (hid: string, rid: string) => ({ PK: `HOUSEHOLD#${hid}`, SK: `RECIPE#${rid}` }),
  recipeSource: (hid: string, rid: string) => ({ PK: `HOUSEHOLD#${hid}`, SK: `RECIPESRC#${rid}` }),
  usage: (hid: string, iso: string, rand: string) => ({
    PK: `HOUSEHOLD#${hid}`,
    SK: `USAGE#${iso}#${rand}`,
  }),
  invite: (codeHash: string) => ({ PK: `INVITE#${codeHash}`, SK: "META" }),
  session: (tokenHash: string) => ({ PK: `SESSION#${tokenHash}`, SK: "META" }),
  sessionGsi: (userId: string, createdAt: string) => ({
    GSI1PK: `USER#${userId}`,
    GSI1SK: `SESSION#${createdAt}`,
  }),
  rate: (bucket: string, window: number) => ({ PK: `RATE#${bucket}`, SK: `WINDOW#${window}` }),
} as const;

export const householdPk = (hid: string) => `HOUSEHOLD#${hid}`;

export const GSI1 = "GSI1";

/** Strip key/index attributes before handing items to the app. */
export function stripKeys<T extends Record<string, unknown>>(
  item: T,
): Omit<T, "PK" | "SK" | "GSI1PK" | "GSI1SK" | "ttl" | "entity"> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { PK, SK, GSI1PK, GSI1SK, ttl, entity, ...rest } = item;
  return rest;
}
