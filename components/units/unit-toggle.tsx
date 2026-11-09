"use client";

import { cn } from "@/components/ui/cn";
import { dividerTabClass, dividerTabsClass } from "@/components/ui/divider-tabs";
import type { UnitSystem } from "@/lib/units/constants";
import { useUnits } from "./units-context";

const LABELS: Record<UnitSystem, string> = { original: "Original", metric: "Metric", us: "US" };

export function UnitToggleView({
  value,
  onChange,
  compact = false,
  className,
}: {
  value: UnitSystem;
  onChange: (s: UnitSystem) => void;
  compact?: boolean;
  className?: string;
}) {
  // Styled like index-card divider tabs standing on a baseline; still a plain, labelled radio group.
  return (
    <div role="radiogroup" aria-label="Units" className={cn(dividerTabsClass, className)}>
      {(Object.keys(LABELS) as UnitSystem[]).map((s) => {
        const on = value === s;
        return (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(s)}
            className={dividerTabClass(on, compact)}
          >
            {LABELS[s]}
          </button>
        );
      })}
    </div>
  );
}

/** Toggle bound to the surrounding UnitsProvider. */
export function UnitToggle({ compact, className }: { compact?: boolean; className?: string }) {
  const { system, setSystem } = useUnits();
  return <UnitToggleView value={system} onChange={setSystem} compact={compact} className={className} />;
}
