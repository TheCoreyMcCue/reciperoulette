"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon, XIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { groupBy } from "@/lib/recipes/ingredients";
import { IngredientLine, StepText } from "@/components/units/converted";
import { UnitToggle } from "@/components/units/unit-toggle";
import type { Recipe } from "@/lib/recipes/schema";

type Tab = "ingredients" | "steps";
type StepMode = "single" | "checklist";

/** Keeps the screen awake while mounted (Screen Wake Lock API, where supported). */
function useWakeLock() {
  const [active, setActive] = useState(false);
  useEffect(() => {
    if (!("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const acquire = async () => {
      try {
        lock = await navigator.wakeLock.request("screen");
        if (cancelled) {
          await lock.release();
          return;
        }
        setActive(true);
        lock.addEventListener("release", () => setActive(false));
      } catch {
        setActive(false); // e.g. battery saver, or not allowed
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible" && (!lock || lock.released)) void acquire();
    };
    void acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release().catch(() => {});
    };
  }, []);
  return active;
}

function usePersistentSet(key: string) {
  const [set, setSet] = useState<Set<number>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      return new Set(JSON.parse(sessionStorage.getItem(key) ?? "[]") as number[]);
    } catch {
      return new Set();
    }
  });
  const toggle = (i: number) =>
    setSet((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      sessionStorage.setItem(key, JSON.stringify([...next]));
      return next;
    });
  return [set, toggle] as const;
}

export function CookMode({ recipe, onClose, onFinished }: { recipe: Recipe; onClose: () => void; onFinished: () => void }) {
  const awake = useWakeLock();
  const [tab, setTab] = useState<Tab>(recipe.ingredients.length ? "ingredients" : "steps");
  const [mode, setMode] = useState<StepMode>("single");
  const [stepIdx, setStepIdx] = useState(0);
  const [checkedIng, toggleIng] = usePersistentSet(`cook:${recipe.id}:ing`);
  const [checkedSteps, toggleStep] = usePersistentSet(`cook:${recipe.id}:steps`);
  const dialogRef = useRef<HTMLDivElement>(null);

  const steps = recipe.steps;
  const last = steps.length - 1;
  const go = useCallback((d: number) => setStepIdx((i) => Math.min(Math.max(i + d, 0), Math.max(last, 0))), [last]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (tab === "steps" && mode === "single") {
        if (e.key === "ArrowRight") go(1);
        if (e.key === "ArrowLeft") go(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose, go, tab, mode]);

  const ingredients = recipe.ingredients.map((x, i) => ({ ...x, i }));
  const numberedSteps = steps.map((x, i) => ({ ...x, i }));

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Cook mode: ${recipe.title}`}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex flex-col bg-paper pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] outline-none"
    >
      <header className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b-2 border-paprika bg-card px-3 pt-2 sm:flex-nowrap sm:pb-0">
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Exit cook mode">
          <XIcon />
        </Button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-xl font-semibold">{recipe.title}</p>
          <p className="text-sm text-muted">{awake ? "Screen will stay on" : "Tip: keep your screen on while cooking"}</p>
        </div>
        <div className="flex w-full justify-end sm:w-auto">
          <UnitToggle compact className="-mb-0.5" />
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-2xl gap-2 px-4 pt-4" role="tablist" aria-label="Cook mode sections">
        {(["ingredients", "steps"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn(
              "min-h-14 flex-1 rounded-control border text-lg font-bold capitalize tabular-nums transition duration-200 ease-out",
              tab === t ? "border-paprika bg-paprika text-on-paprika shadow-card" : "border-line bg-card text-ink hover:bg-kraft",
            )}
          >
            {t} {t === "ingredients" ? `(${checkedIng.size}/${recipe.ingredients.length})` : ""}
          </button>
        ))}
      </div>

      <main className="flex-1 overflow-y-auto px-4 py-5 text-[1.375rem] leading-relaxed text-ink">
        {tab === "ingredients" ? (
          <div className="mx-auto max-w-2xl space-y-6">
            {groupBy(ingredients).map((g) => (
              <section key={g.group || "_"}>
                {g.group && <h3 className="mb-2 font-display text-2xl font-semibold text-paprika">{g.group}</h3>}
                <ul className="divide-y divide-line">
                  {g.items.map((ing) => {
                    const i = ing.i;
                    const done = checkedIng.has(i);
                    return (
                      <li key={i}>
                        <label
                          className={cn(
                            "flex min-h-16 cursor-pointer items-center gap-4 px-2 py-2 transition-opacity duration-200",
                            done && "text-muted line-through decoration-paprika/70 decoration-2 opacity-70",
                          )}
                        >
                          <input type="checkbox" checked={done} onChange={() => toggleIng(i)} className="h-8 w-8 shrink-0 accent-sage-ink" />
                          <IngredientLine ingredient={ing} interactive={false} />
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
            {!recipe.ingredients.length && <p className="text-muted">No ingredients listed.</p>}
            <Button size="lg" className="w-full" onClick={() => setTab("steps")}>
              On to the steps <ChevronRightIcon />
            </Button>
          </div>
        ) : !steps.length ? (
          <p className="text-muted">No steps listed.</p>
        ) : mode === "single" ? (
          <div className="mx-auto flex h-full max-w-2xl flex-col">
            <p className="text-lg font-bold text-muted tabular-nums" aria-live="polite">
              Step {stepIdx + 1} of {steps.length}
              {steps[stepIdx]?.group && <span className="text-paprika"> · {steps[stepIdx]!.group}</span>}
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-kraft">
              <div className="h-full rounded-full bg-paprika transition-all duration-200 ease-out" style={{ width: `${((stepIdx + 1) / steps.length) * 100}%` }} />
            </div>
            <p className="mt-6 flex-1 text-[1.75rem] leading-normal sm:text-4xl sm:leading-snug">
              <StepText text={steps[stepIdx]?.text ?? ""} />
            </p>
          </div>
        ) : (
          <ol className="mx-auto max-w-2xl space-y-3">
            {groupBy(numberedSteps).map((g) => (
              <li key={g.group || "_"} className="space-y-2">
                {g.group && <h3 className="font-display text-2xl font-semibold text-paprika">{g.group}</h3>}
                <ol className="space-y-2">
                  {g.items.map((s) => {
                    const i = s.i;
                    const done = checkedSteps.has(i);
                    return (
                      <li key={i}>
                        <label
                          className={cn(
                            "flex cursor-pointer gap-4 rounded-card border border-line bg-card p-4 shadow-card transition-opacity duration-200",
                            done && "text-muted opacity-70",
                          )}
                        >
                          <input type="checkbox" checked={done} onChange={() => toggleStep(i)} className="mt-1.5 h-8 w-8 shrink-0 accent-sage-ink" />
                          <span>
                            <span className="font-display font-semibold text-paprika tabular-nums">{i + 1}. </span>
                            <span className={cn(done && "line-through decoration-paprika/70 decoration-2")}>
                              <StepText text={s.text} />
                            </span>
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ol>
              </li>
            ))}
          </ol>
        )}
      </main>

      {tab === "steps" && steps.length > 0 && (
        <footer className="border-t border-line bg-card px-4 py-3 shadow-up">
          <div className="mx-auto max-w-2xl space-y-2">
          <div className="flex justify-center">
            <button
              type="button"
              className="min-h-11 px-3 text-base font-bold text-paprika underline-offset-4 hover:underline"
              onClick={() => setMode(mode === "single" ? "checklist" : "single")}
            >
              {mode === "single" ? "Show all steps as a checklist" : "Show one step at a time"}
            </button>
          </div>
          {mode === "single" ? (
            <div className="flex gap-3">
              <Button variant="secondary" size="lg" className="flex-1" onClick={() => go(-1)} disabled={stepIdx === 0}>
                <ChevronLeftIcon /> Back
              </Button>
              {stepIdx < last ? (
                <Button size="lg" className="flex-[2]" onClick={() => go(1)}>
                  Next <ChevronRightIcon />
                </Button>
              ) : (
                <Button size="lg" className="flex-[2]" onClick={onFinished}>
                  <CheckIcon /> Done, mark cooked
                </Button>
              )}
            </div>
          ) : (
            <Button size="lg" className="w-full" onClick={onFinished}>
              <CheckIcon /> Done, mark cooked
            </Button>
          )}
          </div>
        </footer>
      )}
    </div>
  );
}
