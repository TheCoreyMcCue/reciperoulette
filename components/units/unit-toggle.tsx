"use client";

import { cn } from "@/components/ui/cn";
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
    <div role="radiogroup" aria-label="Units" className={cn("inline-flex items-end gap-1 border-b-2 border-paprika", className)}>
      {(Object.keys(LABELS) as UnitSystem[]).map((s) => {
        const on = value === s;
        return (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(s)}
            className={cn(
              "-mb-0.5 rounded-t-[6px] border border-b-0 font-bold transition duration-200 ease-out",
              compact ? "px-3 text-sm" : "px-4 text-base",
              on
                ? "min-h-12 border-paprika bg-paprika text-on-paprika"
                : "min-h-11 border-line bg-kraft text-muted hover:text-ink",
            )}
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
