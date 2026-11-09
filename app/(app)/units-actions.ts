"use server";

import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { setUnitsPreference } from "@/lib/db/users";
import { UNIT_SYSTEMS, type UnitSystem } from "@/lib/units/constants";

export async function setUnitsPreferenceAction(units: UnitSystem): Promise<{ ok: boolean }> {
  const session = await requireSession();
  const parsed = z.enum(UNIT_SYSTEMS as [UnitSystem, ...UnitSystem[]]).safeParse(units);
  if (!parsed.success) return { ok: false };
  try {
    await setUnitsPreference(session.userId, parsed.data);
    return { ok: true };
  } catch (err) {
    console.error("[units] saving preference failed", err);
    return { ok: false };
  }
}
