"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { setRotationAction, skipThisWeekAction } from "@/app/(app)/recipes/actions";
import { ClockIcon, PlusIcon, RepeatIcon, SpinIcon } from "@/components/icons";
import { RecipeImage } from "@/components/recipes/recipe-image";
import { Button, ButtonLink } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { Alert } from "@/components/ui/field";
import { formatMinutes, formatRelativeDay } from "@/lib/recipes/format";
import type { RecipeSummary } from "@/lib/recipes/summary";
import { buildPool, buildReel, pickWeighted, type RouletteFilters } from "@/lib/roulette";

const ITEM_H = 112; // px, height of one reel row
const SPIN_MS = 1800;
const TIME_OPTIONS = [null, 20, 30, 45, 60] as const;

type Phase = "idle" | "spinning" | "landed";

export function Roulette({ recipes: initial, autoSpin }: { recipes: RecipeSummary[]; autoSpin: boolean }) {
  const [recipes, setRecipes] = useState(initial);
  const [maxTime, setMaxTime] = useState<number | null>(null);
  const [tag, setTag] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [reel, setReel] = useState<RecipeSummary[]>([]);
  const [offset, setOffset] = useState(0);
  const [animate, setAnimate] = useState(false);
  const [pick, setPick] = useState<RecipeSummary | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();
  const [spinKey, setSpinKey] = useState(0);
  const [spinMs, setSpinMs] = useState(SPIN_MS);
  const autoSpun = useRef(false);

  const rotation = useMemo(() => recipes.filter((r) => r.inRotation), [recipes]);
  const rotationTags = useMemo(() => [...new Set(rotation.flatMap((r) => r.tags))].sort(), [rotation]);
  const filters: RouletteFilters = { maxTime, tag };
  const preview = buildPool(recipes, filters);

  const doSpin = (list = recipes, avoid?: string) => {
    setError(null);
    const pool = buildPool(list, { maxTime, tag, avoidIds: avoid ? [avoid] : [] });
    const chosen = pickWeighted(pool.entries);
    if (!chosen) {
      setPhase("idle");
      setPick(null);
      return;
    }
    setNotice(pool.relaxed ? "Everything's been cooked recently, so recent dinners are back in the mix." : null);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const sequence = buildReel(pool.entries.map((e) => e.recipe), chosen, reduceMotion ? 1 : 18);
    setPick(chosen);
    setReel(sequence);
    setAnimate(false);
    setOffset(0);
    setPhase("spinning");
    // Next frame: animate to the last row.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        setAnimate(!reduceMotion);
        setOffset((sequence.length - 1) * ITEM_H);
      }),
    );
    setSpinMs(reduceMotion ? 50 : SPIN_MS + 50);
    setSpinKey((k) => k + 1);
  };

  // Land when the reel animation finishes.
  useEffect(() => {
    if (phase !== "spinning") return;
    const t = setTimeout(() => {
      setPhase("landed");
      navigator.vibrate?.(30);
    }, spinMs);
    return () => clearTimeout(t);
  }, [phase, spinKey, spinMs]);
  useEffect(() => {
    if (autoSpin && !autoSpun.current && rotation.length) {
      autoSpun.current = true;
      doSpin();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  const notThisWeek = () => {
    if (!pick) return;
    const skipped = pick;
    const until = new Date(Date.now() + 7 * 86400_000).toISOString();
    const next = recipes.map((r) => (r.id === skipped.id ? { ...r, skipUntil: until } : r));
    setRecipes(next);
    start(async () => {
      const res = await skipThisWeekAction(skipped.id);
      if (!res.ok) setError(res.error);
    });
    doSpin(next);
    setNotice(`Okay, “${skipped.title}” is off the table until next week.`);
  };

  const addToRotation = (id: string) => {
    setRecipes((rs) => rs.map((r) => (r.id === id ? { ...r, inRotation: true } : r)));
    start(async () => {
      const res = await setRotationAction(id, true);
      if (!res.ok) {
        setError(res.error);
        setRecipes((rs) => rs.map((r) => (r.id === id ? { ...r, inRotation: false } : r)));
      }
    });
  };

  if (!rotation.length) return <EmptyRotation recipes={recipes} onAdd={addToRotation} error={error} />;

  const chip = (active: boolean) =>
    cn(
      "min-h-10 shrink-0 rounded-full border px-4 text-sm font-semibold",
      active ? "border-primary bg-primary text-primary-ink" : "border-border bg-surface",
    );

  return (
    <div className="space-y-5">
      {error && <Alert>{error}</Alert>}

      {/* Reel (replaced by the result card once it lands) */}
      <div
        hidden={phase === "landed"}
        className="relative overflow-hidden rounded-3xl border-4 border-primary bg-surface shadow-lg"
        style={{ height: ITEM_H }}
        aria-live="polite"
        aria-busy={phase === "spinning"}
      >
        {phase === "idle" ? (
          <div className="flex h-full items-center justify-center gap-3 px-6 text-center text-muted">
            <SpinIcon width={32} height={32} />
            <span>
              {preview.entries.length} {preview.entries.length === 1 ? "recipe" : "recipes"} ready to spin
            </span>
          </div>
        ) : (
          <>
            <ul
              aria-hidden={phase === "spinning"}
              style={{
                transform: `translateY(-${offset}px)`,
                transition: animate ? `transform ${SPIN_MS}ms cubic-bezier(0.12, 0.8, 0.22, 1)` : "none",
              }}
            >
              {reel.map((r, i) => (
                <li key={i} className="flex items-center gap-4 px-4" style={{ height: ITEM_H }}>
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl">
                    <RecipeImage title={r.title} imageUrl={r.imageUrl} />
                  </div>
                  <p className="line-clamp-2 font-display text-xl font-semibold">{r.title}</p>
                </li>
              ))}
            </ul>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-5 bg-gradient-to-b from-surface to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-5 bg-gradient-to-t from-surface to-transparent" />
          </>
        )}
      </div>

      {phase === "landed" && pick ? (
        <Landed pick={pick} notice={notice} onSpinAgain={() => doSpin(recipes, pick.id)} onSkip={notThisWeek} />
      ) : (
        <>
          <Button
            size="lg"
            className="h-20 w-full text-2xl"
            onClick={() => doSpin()}
            disabled={phase === "spinning" || preview.entries.length === 0}
          >
            <SpinIcon width={32} height={32} className={phase === "spinning" ? "animate-spin" : ""} />
            {phase === "spinning" ? "Spinning…" : "Spin"}
          </Button>
          {preview.emptyReason === "filters" && <Alert tone="info">Nothing in the rotation matches those filters.</Alert>}
          {preview.emptyReason === "all-skipped" && (
            <Alert tone="info">Everything that matches is on “not this week”. Loosen the filters or add more to the rotation.</Alert>
          )}
        </>
      )}

      {phase !== "spinning" && (
        <fieldset className="space-y-3 rounded-3xl border border-border bg-surface p-4">
          <legend className="sr-only">Filters</legend>
          <div>
            <p className="mb-2 text-sm font-semibold">Time</p>
            <div className="flex flex-wrap gap-2">
              {TIME_OPTIONS.map((t) => (
                <button key={t ?? "any"} type="button" className={chip(maxTime === t)} aria-pressed={maxTime === t} onClick={() => setMaxTime(t)}>
                  {t == null ? "Any time" : `≤ ${t} min`}
                </button>
              ))}
            </div>
          </div>
          {rotationTags.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold">Tag</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={chip(tag === null)} aria-pressed={tag === null} onClick={() => setTag(null)}>
                  Anything
                </button>
                {rotationTags.map((t) => (
                  <button key={t} type="button" className={chip(tag === t)} aria-pressed={tag === t} onClick={() => setTag(tag === t ? null : t)}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}
        </fieldset>
      )}

      <p className="text-center text-sm text-muted">
        {rotation.length} in the rotation · recipes cooked this week sit out a turn.{" "}
        <Link href="/" className="font-semibold text-primary underline-offset-2 hover:underline">
          Manage
        </Link>
      </p>
    </div>
  );
}

function Landed({
  pick,
  notice,
  onSpinAgain,
  onSkip,
}: {
  pick: RecipeSummary;
  notice: string | null;
  onSpinAgain: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="space-y-4 motion-safe:animate-[pop_300ms_ease-out]">
      {notice && <Alert tone="info">{notice}</Alert>}
      <div className="overflow-hidden rounded-3xl border border-border bg-surface shadow-md">
        <div className="aspect-[2/1]">
          <RecipeImage title={pick.title} imageUrl={pick.imageUrl} priority />
        </div>
        <div className="space-y-1 p-5">
          <p className="text-sm font-bold uppercase tracking-wide text-primary">Tonight&apos;s pick</p>
          <h2 className="font-display text-3xl font-semibold leading-tight" aria-live="polite">{pick.title}</h2>
          <p className="flex flex-wrap gap-x-4 text-sm text-muted">
            {pick.totalTime != null && (
              <span className="inline-flex items-center gap-1">
                <ClockIcon width={16} height={16} /> {formatMinutes(pick.totalTime)}
              </span>
            )}
            <span>{pick.lastCookedAt ? `Last cooked ${formatRelativeDay(pick.lastCookedAt)}` : "Never cooked yet"}</span>
          </p>
        </div>
      </div>
      <ButtonLink href={`/recipes/${pick.id}`} size="lg" className="h-16 w-full text-xl">
        Let&apos;s cook this
      </ButtonLink>
      <div className="grid grid-cols-2 gap-3">
        <Button variant="secondary" size="lg" onClick={onSpinAgain}>
          <SpinIcon /> <span className="whitespace-nowrap">Spin again</span>
        </Button>
        <Button variant="secondary" size="lg" onClick={onSkip}>
          Not this week
        </Button>
      </div>
    </div>
  );
}

function EmptyRotation({
  recipes,
  onAdd,
  error,
}: {
  recipes: RecipeSummary[];
  onAdd: (id: string) => void;
  error: string | null;
}) {
  return (
    <div className="space-y-5">
      {error && <Alert>{error}</Alert>}
      <div className="rounded-3xl border border-dashed border-border bg-surface p-6 text-center">
        <RepeatIcon width={40} height={40} className="mx-auto text-primary" />
        <h2 className="mt-3 font-display text-2xl font-semibold">The rotation is empty</h2>
        <p className="mx-auto mt-2 max-w-sm text-muted">
          Add your go-to dinners to the rotation and we&apos;ll pick one when you can&apos;t decide.
        </p>
        {!recipes.length && (
          <ButtonLink href="/add" className="mt-4">
            <PlusIcon /> Add a recipe
          </ButtonLink>
        )}
      </div>
      {recipes.length > 0 && (
        <section>
          <h3 className="mb-2 font-semibold">Quick add from your recipe box</h3>
          <ul className="divide-y divide-border rounded-3xl border border-border bg-surface">
            {recipes.slice(0, 12).map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-2">
                <span className="min-w-0 truncate font-semibold">{r.title}</span>
                <Button size="sm" variant="secondary" onClick={() => onAdd(r.id)}>
                  <PlusIcon width={16} height={16} /> Add
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
