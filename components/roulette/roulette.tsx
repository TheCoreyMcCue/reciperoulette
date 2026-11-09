"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { setRotationAction, skipThisWeekAction } from "@/app/(app)/recipes/actions";
import { ClockIcon, PlusIcon, SpinIcon } from "@/components/icons";
import { EmptyTinIllustration } from "@/components/illustrations";
import { RecipeSnapshot } from "@/components/recipes/recipe-image";
import { Button, ButtonLink } from "@/components/ui/button";
import { cardClass } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert } from "@/components/ui/field";
import { chipClass } from "@/components/ui/tag";
import { formatMinutes, formatRelativeDay } from "@/lib/recipes/format";
import type { RecipeSummary } from "@/lib/recipes/summary";
import { buildPool, buildReel, pickWeighted, type RouletteFilters } from "@/lib/roulette";

const ITEM_H = 128; // px, height of one card in the flip-through
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
  // Purely visual: the card that was just set aside with "Not this week", while it slides off.
  const [setAside, setSetAside] = useState<RecipeSummary | null>(null);

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
    setSetAside(skipped);
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

  return (
    <div className="space-y-5">
      {error && <Alert>{error}</Alert>}

      {/* The recipe tin: cards flip past in the window, then one is pulled out (replaced by the result card). */}
      <div hidden={phase === "landed"} className="relative mx-auto w-full max-w-md pt-2">
        <div
          className="relative overflow-hidden rounded-t-card border border-b-0 border-line bg-kraft px-4 [perspective:700px]"
          style={{ height: ITEM_H }}
          aria-live="polite"
          aria-busy={phase === "spinning"}
        >
          {phase === "idle" ? (
            <IdleStack />
          ) : (
            <>
              <ul
                aria-hidden={phase === "spinning"}
                className="[transform-style:preserve-3d]"
                style={{
                  transform: `translateY(-${offset}px)`,
                  transition: animate ? `transform ${SPIN_MS}ms cubic-bezier(0.12, 0.8, 0.22, 1)` : "none",
                }}
              >
                {reel.map((r, i) => (
                  <li key={i} className="pt-3 [transform:rotateX(14deg)]" style={{ height: ITEM_H }}>
                    <div className="h-full rounded-t-[6px] border border-b-0 border-line bg-card px-4 pt-3 shadow-card">
                      <p className="title-rule line-clamp-2 pb-1.5 font-display text-xl font-semibold leading-snug">{r.title}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-kraft to-transparent" />
            </>
          )}
        </div>
        {/* Front of the tin. */}
        <div className="relative z-[1] -mt-8 flex h-16 items-center justify-center rounded-b-card rounded-t-[3px] bg-sage shadow-card">
          {/* Label plate on the tin; blank while the cards flip (the button already says "Spinning…"). */}
          <span className="min-h-9 min-w-40 rounded-[3px] border border-line bg-card px-4 py-0.5 text-center font-script text-xl text-ink">
            {phase === "idle" && `${preview.entries.length} ${preview.entries.length === 1 ? "recipe" : "recipes"} ready to spin`}
          </span>
        </div>
        {setAside && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 z-10 animate-set-aside"
            onAnimationEnd={() => setSetAside(null)}
          >
            <PickCard pick={setAside} />
          </div>
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
            <SpinIcon width={30} height={30} />
            {phase === "spinning" ? "Spinning…" : "Spin"}
          </Button>
          {preview.emptyReason === "filters" && <Alert tone="info">Nothing in the rotation matches those filters.</Alert>}
          {preview.emptyReason === "all-skipped" && (
            <Alert tone="info">Everything that matches is on “not this week”. Loosen the filters or add more to the rotation.</Alert>
          )}
        </>
      )}

      {phase !== "spinning" && (
        <fieldset className={cn(cardClass, "space-y-4 p-4 sm:p-5")}>
          <legend className="sr-only">Filters</legend>
          <div>
            <p className="mb-2 text-sm font-bold">Time</p>
            <div className="flex flex-wrap gap-2">
              {TIME_OPTIONS.map((t) => (
                <button key={t ?? "any"} type="button" className={cn(chipClass(maxTime === t), "tabular-nums")} aria-pressed={maxTime === t} onClick={() => setMaxTime(t)}>
                  {t == null ? "Any time" : `≤ ${t} min`}
                </button>
              ))}
            </div>
          </div>
          {rotationTags.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-bold">Tag</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={chipClass(tag === null)} aria-pressed={tag === null} onClick={() => setTag(null)}>
                  Anything
                </button>
                {rotationTags.map((t) => (
                  <button key={t} type="button" className={chipClass(tag === t)} aria-pressed={tag === t} onClick={() => setTag(tag === t ? null : t)}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}
        </fieldset>
      )}

      <p className="text-center text-sm text-muted tabular-nums">
        {rotation.length} in the rotation · recipes cooked this week sit out a turn.{" "}
        <Link href="/" className="inline-flex min-h-11 items-center font-bold text-paprika underline-offset-4 hover:underline">
          Manage
        </Link>
      </p>
    </div>
  );
}

/** Idle: a few card tops standing in the tin. */
function IdleStack() {
  return (
    <div aria-hidden="true" className="absolute inset-x-4 bottom-0 top-3">
      <div className="absolute inset-x-6 bottom-0 top-0 rounded-t-[6px] border border-b-0 border-line bg-card" />
      <div className="absolute inset-x-3 bottom-0 top-4 rounded-t-[6px] border border-b-0 border-line bg-card" />
      <div className="absolute inset-x-0 bottom-0 top-8 rounded-t-[6px] border border-b-0 border-line bg-card shadow-card">
        <div className="title-rule mx-4 mt-6" />
      </div>
    </div>
  );
}

/** The drawn index card. */
function PickCard({ pick, live = false }: { pick: RecipeSummary; live?: boolean }) {
  return (
    <div className={cn(cardClass, "relative px-5 pb-3 pt-5")}>
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-paprika">Tonight&apos;s pick</p>
          <h2 className="mt-1 font-display text-3xl font-semibold leading-tight" aria-live={live ? "polite" : undefined}>
            {pick.title}
          </h2>
        </div>
        <div className="relative">
          <RecipeSnapshot title={pick.title} imageUrl={pick.imageUrl} priority className="h-24 w-24 sm:h-28 sm:w-28" />
          {/* The screen's one decorative detail: a strip of washi tape holding the photo on. */}
          <span aria-hidden="true" className="absolute -top-2 left-1/2 h-5 w-14 -translate-x-1/2 -rotate-6 rounded-[2px] bg-mustard/55" />
        </div>
      </div>
      <div className="title-rule mt-3" aria-hidden="true" />
      <p className="ruled flex flex-wrap items-center gap-x-4 text-sm leading-8 text-muted tabular-nums [--rule-step:2rem]">
        {pick.totalTime != null && (
          <span className="inline-flex items-center gap-1">
            <ClockIcon width={16} height={16} /> {formatMinutes(pick.totalTime)}
          </span>
        )}
        <span>{pick.lastCookedAt ? `Last cooked ${formatRelativeDay(pick.lastCookedAt)}` : "Never cooked yet"}</span>
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
    <div className="space-y-4">
      {notice && <Alert tone="info">{notice}</Alert>}
      {/* Pulled out of the tin; with reduced motion it simply fades in. */}
      <div className="animate-pull-card" data-motion="fade">
        <PickCard pick={pick} live />
      </div>
      <ButtonLink href={`/recipes/${pick.id}`} size="lg" className="h-16 w-full text-xl">
        Let&apos;s cook this
      </ButtonLink>
      <div className="grid grid-cols-2 gap-3">
        <Button variant="secondary" size="lg" className="px-3" onClick={onSpinAgain}>
          <SpinIcon /> <span className="whitespace-nowrap">Spin again</span>
        </Button>
        <Button variant="secondary" size="lg" className="whitespace-nowrap px-3" onClick={onSkip}>
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
      <EmptyState
        className={cn(cardClass, "border-dashed")}
        Illustration={EmptyTinIllustration}
        title="The recipe tin is empty…"
        action={
          !recipes.length && (
            <ButtonLink href="/add">
              <PlusIcon /> Add a recipe
            </ButtonLink>
          )
        }
      >
        Add your go-to dinners to the rotation and we&apos;ll pick one when you can&apos;t decide.
      </EmptyState>
      {recipes.length > 0 && (
        <section>
          <h3 className="mb-2 font-bold">Quick add from your recipe box</h3>
          <ul className={cn(cardClass, "divide-y divide-line")}>
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
