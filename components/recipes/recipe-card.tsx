import Link from "next/link";
import { ClockIcon } from "@/components/icons";
import { cardClass } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { DraftStamp, DRAFT_TAG, isDraft, RotationStamp, Tag } from "@/components/ui/tag";
import { formatMinutes } from "@/lib/recipes/format";
import type { RecipeSummary } from "@/lib/recipes/summary";
import { RecipeSnapshot } from "./recipe-image";

/**
 * An index card: title over a thin paprika line, faint ruled lines behind the
 * details, and the photo clipped on like a snapshot.
 */
export function RecipeCard({ recipe, priority }: { recipe: RecipeSummary; priority?: boolean }) {
  const draft = isDraft(recipe.tags);
  const tags = recipe.tags.filter((t) => t !== DRAFT_TAG).slice(0, 3);
  return (
    <Link
      href={`/recipes/${recipe.id}`}
      className={cn(cardClass, "card-lift group flex h-full flex-col", draft && "border-dashed border-mustard")}
    >
      <div className="flex items-start gap-3 px-4 pt-4">
        <div className="min-w-0 flex-1 pb-2">
          {draft && <DraftStamp className="mb-1.5" />}
          <h3 className="line-clamp-3 font-display text-xl font-semibold leading-snug">{recipe.title}</h3>
        </div>
        <RecipeSnapshot title={recipe.title} imageUrl={recipe.imageUrl} priority={priority} className="-mt-1 mb-2 h-20 w-20 sm:h-24 sm:w-24" />
      </div>
      <div className="title-rule mx-4" aria-hidden="true" />
      {/* Every row is exactly one rule step tall so the lines sit under the text. */}
      <div className="ruled flex flex-1 flex-col px-4 pb-2 [--rule-step:2rem]">
        <div className="flex min-h-8 flex-wrap items-center gap-x-3 text-sm text-muted">
          {recipe.totalTime != null && (
            <span className="inline-flex h-8 items-center gap-1 tabular-nums">
              <ClockIcon width={16} height={16} /> {formatMinutes(recipe.totalTime)}
            </span>
          )}
          {recipe.inRotation && (
            <span className="inline-flex h-8 items-center">
              <RotationStamp />
            </span>
          )}
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-1.5">
            {tags.map((t) => (
              <span key={t} className="inline-flex h-8 items-center">
                <Tag>{t}</Tag>
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
