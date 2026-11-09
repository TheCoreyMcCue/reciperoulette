"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { deleteRecipeAction, markCookedAction, setRotationAction } from "@/app/(app)/recipes/actions";
import { CheckIcon, EditIcon, FlameIcon, RepeatIcon, TrashIcon } from "@/components/icons";
import { Button, buttonClass } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { Alert } from "@/components/ui/field";
import { formatRelativeDay } from "@/lib/recipes/format";
import type { Recipe } from "@/lib/recipes/schema";
import { CookMode } from "./cook-mode";

type Stats = { inRotation: boolean; timesCooked: number; lastCookedAt: string | null };

export function RecipeActions({ recipe }: { recipe: Recipe }) {
  const [, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [cooking, setCooking] = useState(false);
  const [justCooked, setJustCooked] = useState(false);
  const [optimistic, apply] = useOptimistic<Stats, Partial<Stats>>(
    { inRotation: recipe.inRotation, timesCooked: recipe.timesCooked, lastCookedAt: recipe.lastCookedAt },
    (s, patch) => ({ ...s, ...patch }),
  );

  const toggleRotation = () =>
    start(async () => {
      setError(null);
      apply({ inRotation: !optimistic.inRotation });
      const res = await setRotationAction(recipe.id, !optimistic.inRotation);
      if (!res.ok) setError(res.error);
    });

  const markCooked = () =>
    start(async () => {
      setError(null);
      apply({ timesCooked: optimistic.timesCooked + 1, lastCookedAt: new Date().toISOString() });
      setJustCooked(true);
      const res = await markCookedAction(recipe.id);
      if (!res.ok) {
        setJustCooked(false);
        setError(res.error);
      }
    });

  const remove = () => {
    if (!confirm(`Delete “${recipe.title}”? This can't be undone.`)) return;
    start(async () => {
      try {
        await deleteRecipeAction(recipe.id);
      } catch {
        setError("Couldn't delete the recipe. Please try again.");
      }
    });
  };

  return (
    <div className="space-y-3">
      {error && <Alert>{error}</Alert>}
      <Button size="lg" className="w-full" onClick={() => setCooking(true)}>
        <FlameIcon /> Start cooking
      </Button>
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant={optimistic.inRotation ? "sage" : "secondary"}
          onClick={toggleRotation}
          aria-pressed={optimistic.inRotation}
        >
          <RepeatIcon width={20} height={20} />
          {optimistic.inRotation ? "In rotation" : "Add to rotation"}
        </Button>
        <Button variant="secondary" onClick={markCooked} disabled={justCooked}>
          <CheckIcon width={20} height={20} />
          {justCooked ? "Marked!" : "Mark as cooked"}
        </Button>
      </div>
      <p className="text-center text-sm text-muted">
        {optimistic.timesCooked > 0
          ? `Cooked ${optimistic.timesCooked} ${optimistic.timesCooked === 1 ? "time" : "times"}, last ${formatRelativeDay(optimistic.lastCookedAt)}`
          : "Not cooked yet"}
      </p>
      <div className="flex justify-center gap-2">
        <Link href={`/recipes/${recipe.id}/edit`} className={buttonClass("ghost", "sm")}>
          <EditIcon width={18} height={18} /> Edit
        </Link>
        <Button variant="ghost" size="sm" onClick={remove} className={cn("text-danger")}>
          <TrashIcon width={18} height={18} /> Delete
        </Button>
      </div>
      {cooking && (
        <CookMode
          recipe={recipe}
          onClose={() => setCooking(false)}
          onFinished={() => {
            setCooking(false);
            if (!justCooked) markCooked();
          }}
        />
      )}
    </div>
  );
}
