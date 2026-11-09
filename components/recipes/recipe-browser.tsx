"use client";

import { useMemo, useState } from "react";
import { RepeatIcon, SearchIcon, XIcon } from "@/components/icons";
import { RecipeBoxIllustration } from "@/components/illustrations";
import { ButtonLink } from "@/components/ui/button";
import { cardClass } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { EmptyState } from "@/components/ui/empty-state";
import { inputClass } from "@/components/ui/field";
import { chipClass } from "@/components/ui/tag";
import { matchesSearch, type RecipeSummary } from "@/lib/recipes/summary";
import { RecipeCard } from "./recipe-card";

export function RecipeBrowser({ recipes }: { recipes: RecipeSummary[] }) {
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const [rotationOnly, setRotationOnly] = useState(false);

  const topTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of recipes) for (const t of r.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 12).map(([t]) => t);
  }, [recipes]);

  const filtered = recipes.filter(
    (r) => (!rotationOnly || r.inRotation) && (!tag || r.tags.includes(tag)) && matchesSearch(r, query),
  );

  if (!recipes.length) {
    return (
      <EmptyState
        className={cn(cardClass, "border-dashed")}
        Illustration={RecipeBoxIllustration}
        title="No recipes yet… time to dig through the recipe box!"
        action={
          <ButtonLink href="/add" size="lg">
            Add your first recipe
          </ButtonLink>
        }
      >
        Snap a cookbook page, paste a recipe, or drop in a link. We&apos;ll do the typing.
      </EmptyState>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <label htmlFor="recipe-search" className="sr-only">
          Search recipes
        </label>
        <SearchIcon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" width={20} height={20} />
        <input
          id="recipe-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title, ingredient or tag"
          className={cn(inputClass, "pl-11")}
          enterKeyHint="search"
        />
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]" role="group" aria-label="Filters">
        <button type="button" className={chipClass(rotationOnly)} aria-pressed={rotationOnly} onClick={() => setRotationOnly((v) => !v)}>
          <RepeatIcon width={16} height={16} /> In rotation
        </button>
        {topTags.map((t) => (
          <button key={t} type="button" className={chipClass(tag === t)} aria-pressed={tag === t} onClick={() => setTag(tag === t ? null : t)}>
            {t}
          </button>
        ))}
      </div>

      <p className="flex min-h-11 flex-wrap items-center text-sm text-muted tabular-nums" aria-live="polite">
        {filtered.length === recipes.length ? `${recipes.length} recipes` : `${filtered.length} of ${recipes.length} recipes`}
        {(query || tag || rotationOnly) && (
          <button
            type="button"
            className="ml-2 inline-flex min-h-11 items-center gap-1 px-1 font-bold text-paprika"
            onClick={() => {
              setQuery("");
              setTag(null);
              setRotationOnly(false);
            }}
          >
            <XIcon width={14} height={14} /> Clear
          </button>
        )}
      </p>

      {filtered.length ? (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {filtered.map((r, i) => (
            <li key={r.id} className="animate-rise-in" style={{ animationDelay: `${Math.min(i, 8) * 35}ms` }}>
              <RecipeCard recipe={r} priority={i < 2} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="Nothing in the box matches that." as="p">
          Try another word, or clear the filters.
        </EmptyState>
      )}
    </div>
  );
}
