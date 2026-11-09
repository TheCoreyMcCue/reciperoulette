import Link from "next/link";
import { ClockIcon, RepeatIcon } from "@/components/icons";
import { formatMinutes } from "@/lib/recipes/format";
import type { RecipeSummary } from "@/lib/recipes/summary";
import { RecipeImage } from "./recipe-image";

/** Compact row on phones, image-first card from `sm` up. */
export function RecipeCard({ recipe, priority }: { recipe: RecipeSummary; priority?: boolean }) {
  return (
    <Link
      href={`/recipes/${recipe.id}`}
      className="group flex h-full overflow-hidden rounded-3xl border border-border bg-surface shadow-sm transition hover:shadow-md sm:block"
    >
      <div className="relative aspect-square w-28 shrink-0 overflow-hidden sm:aspect-[4/3] sm:w-auto">
        <RecipeImage title={recipe.title} imageUrl={recipe.imageUrl} priority={priority} className="transition group-hover:scale-[1.02]" />
        {recipe.inRotation && (
          <span className="absolute left-3 top-3 hidden items-center gap-1 rounded-full bg-herb px-2.5 py-1 text-xs font-bold text-white shadow sm:inline-flex dark:text-[#10180e]">
            <RepeatIcon width={14} height={14} /> Rotation
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-1.5 p-3.5 sm:space-y-2 sm:p-4">
        <h3 className="line-clamp-2 font-display text-lg font-semibold leading-snug">{recipe.title}</h3>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
          {recipe.inRotation && (
            <span className="inline-flex items-center gap-1 font-semibold text-herb sm:hidden">
              <RepeatIcon width={14} height={14} /> Rotation
            </span>
          )}
          {recipe.totalTime != null && (
            <span className="inline-flex items-center gap-1">
              <ClockIcon width={16} height={16} /> {formatMinutes(recipe.totalTime)}
            </span>
          )}
        </div>
        {recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {recipe.tags.slice(0, 3).map((t) => (
              <span key={t} className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold text-muted">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
