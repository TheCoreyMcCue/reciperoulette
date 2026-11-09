"use client";

import { createContext, use, useState, useTransition, type ReactNode } from "react";
import { setUnitsPreferenceAction } from "@/app/(app)/units-actions";
import type { UnitSystem } from "@/lib/units/constants";

type Ctx = { system: UnitSystem; setSystem: (s: UnitSystem) => void };
const UnitsContext = createContext<Ctx | null>(null);

/** Holds the current unit system; changes apply instantly and are saved to the user's profile. */
export function UnitsProvider({ initial, children }: { initial: UnitSystem; children: ReactNode }) {
  const [system, setLocal] = useState<UnitSystem>(initial);
  const [, start] = useTransition();
  const setSystem = (s: UnitSystem) => {
    setLocal(s);
    start(async () => {
      await setUnitsPreferenceAction(s);
    });
  };
  return <UnitsContext value={{ system, setSystem }}>{children}</UnitsContext>;
}

export function useUnits(): Ctx {
  const ctx = use(UnitsContext);
  // Outside a provider (shouldn't happen) fall back to showing recipes as written.
  return ctx ?? { system: "original", setSystem: () => {} };
}
