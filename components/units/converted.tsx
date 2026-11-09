"use client";

import { useState } from "react";
import { cn } from "@/components/ui/cn";
import type { Ingredient } from "@/lib/recipes/schema";
import type { UnitSystem } from "@/lib/units/constants";
import { convertIngredient } from "@/lib/units/convert";
import { convertTemperaturesInText } from "@/lib/units/temperature";
import { useUnits } from "./units-context";

/** One ingredient line in the chosen units; tap a converted amount to see it as written. */
export function IngredientLine({ ingredient, interactive = true }: { ingredient: Ingredient; interactive?: boolean }) {
  const { system } = useUnits();
  // "Show as written" applies to the current unit system only; switching resets it.
  const [revealedFor, setRevealedFor] = useState<UnitSystem | null>(null);
  const d = convertIngredient(ingredient, system);
  const showOriginal = d.converted && revealedFor === system;
  const amount = [d.quantity, d.unit].filter(Boolean).join(" ");
  const written = [ingredient.quantity, ingredient.unit].filter(Boolean).join(" ");

  const amountEl = !amount ? null : d.converted && interactive ? (
    <button
      type="button"
      onClick={() => setRevealedFor(showOriginal ? null : system)}
      aria-expanded={showOriginal}
      title={`As written: ${written}`}
      className="rounded-[3px] font-bold tabular-nums underline decoration-paprika/70 decoration-dotted decoration-2 underline-offset-[5px]"
    >
      {d.approx && !showOriginal && <span className="font-semibold text-sage-ink" aria-label="about">≈ </span>}
      {showOriginal ? written : amount}
    </button>
  ) : (
    <strong className={cn("tabular-nums", d.converted && "underline decoration-paprika/70 decoration-dotted decoration-2 underline-offset-[5px]")} title={d.converted ? `As written: ${written}` : undefined}>
      {d.approx && <span className="font-semibold text-sage-ink">≈ </span>}
      {amount}
    </strong>
  );

  return (
    <span>
      {amountEl}
      {amountEl && " "}
      {ingredient.item}
      {d.secondary && (
        <span className="text-muted" title="Approximate metric equivalent">
          {" "}
          (≈ {d.secondary.quantity} {d.secondary.unit})
        </span>
      )}
      {ingredient.note && <span className="text-muted">, {ingredient.note}</span>}
      {showOriginal && interactive && <span className="ml-1.5 text-xs text-muted">(as written)</span>}
    </span>
  );
}

/** Step text with oven temperatures converted; converted parts are subtly marked. */
export function StepText({ text }: { text: string }) {
  const { system } = useUnits();
  const segments = convertTemperaturesInText(text, system);
  return (
    <>
      {segments.map((s, i) =>
        s.original ? (
          <span key={i} title={`As written: ${s.original}`} className="underline decoration-paprika/70 decoration-dotted decoration-2 underline-offset-[5px]">
            {s.text}
          </span>
        ) : (
          <span key={i}>{s.text}</span>
        ),
      )}
    </>
  );
}
