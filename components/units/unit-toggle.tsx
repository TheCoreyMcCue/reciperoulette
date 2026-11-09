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
  return (
    <div role="radiogroup" aria-label="Units" className={cn("inline-flex rounded-full border border-border bg-surface p-1", className)}>
      {(Object.keys(LABELS) as UnitSystem[]).map((s) => (
        <button
          key={s}
          type="button"
          role="radio"
          aria-checked={value === s}
          onClick={() => onChange(s)}
          className={cn(
            "rounded-full font-semibold transition",
            compact ? "min-h-9 px-3 text-xs" : "min-h-10 px-4 text-sm",
            value === s ? "bg-primary text-primary-ink" : "text-muted hover:text-ink",
          )}
        >
          {LABELS[s]}
        </button>
      ))}
    </div>
  );
}

/** Toggle bound to the surrounding UnitsProvider. */
export function UnitToggle({ compact, className }: { compact?: boolean; className?: string }) {
  const { system, setSystem } = useUnits();
  return <UnitToggleView value={system} onChange={setSystem} compact={compact} className={className} />;
}
