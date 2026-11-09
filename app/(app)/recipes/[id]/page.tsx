import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ChevronLeftIcon, ExternalIcon } from "@/components/icons";
import { RecipeActions } from "@/components/recipes/recipe-actions";
import { RecipeSnapshot } from "@/components/recipes/recipe-image";
import { cardClass } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { PageLoading } from "@/components/ui/spinner";
import { DraftStamp, DRAFT_TAG, isDraft, Tag } from "@/components/ui/tag";
import { requireSession } from "@/lib/auth/session";
import { getRecipe } from "@/lib/db/recipes";
import { getUnitsPreference, listMembers } from "@/lib/db/users";
import { IngredientLine, StepText } from "@/components/units/converted";
import { UnitToggle } from "@/components/units/unit-toggle";
import { UnitsProvider } from "@/components/units/units-context";
import { formatMinutes } from "@/lib/recipes/format";
import { groupBy } from "@/lib/recipes/ingredients";

export const metadata: Metadata = { title: "Recipe" };

export default function RecipePage({ params }: PageProps<"/recipes/[id]">) {
  return (
    <div className="space-y-3">
      <Link href="/" className="inline-flex min-h-11 items-center gap-1 text-sm font-bold text-muted transition-colors hover:text-ink">
        <ChevronLeftIcon width={18} height={18} /> All recipes
      </Link>
      <Suspense fallback={<PageLoading label="Opening the recipe…" />}>
        <RecipeDetail params={params} />
      </Suspense>
    </div>
  );
}

async function RecipeDetail({ params }: Pick<PageProps<"/recipes/[id]">, "params">) {
  const session = await requireSession();
  const { id } = await params;
  const [recipe, units, members] = await Promise.all([
    /^[A-Za-z0-9_-]{1,64}$/.test(id) ? getRecipe(session.householdId, id) : null,
    getUnitsPreference(session.userId),
    // Only for the "From the kitchen of …" byline; never block the page on it.
    listMembers(session.householdId).catch(() => []),
  ]);
  if (!recipe) notFound();

  const times = [
    ["Prep", recipe.prepTime],
    ["Cook", recipe.cookTime],
    ["Total", recipe.totalTime],
  ].filter(([, v]) => v != null) as [string, number][];
  const numberedSteps = recipe.steps.map((s, i) => ({ ...s, n: i + 1 }));

  let sourceHost = "";
  try {
    sourceHost = recipe.sourceUrl ? new URL(recipe.sourceUrl).hostname.replace(/^www\./, "") : "";
  } catch {
    /* ignore */
  }

  // Byline: credit the source for imported recipes, otherwise whoever added it to the box.
  const adaptedFrom = recipe.sourceAuthor || sourceHost;
  const creator = members.find((m) => m.userId === recipe.createdBy)?.name;
  const byline = adaptedFrom ? `Adapted from ${adaptedFrom}` : creator ? `From the kitchen of ${creator}` : null;
  const draft = isDraft(recipe.tags);
  const tags = recipe.tags.filter((t) => t !== DRAFT_TAG);

  return (
    <UnitsProvider initial={units}>
      <article className={cn(cardClass, "px-5 pb-6 pt-6 sm:px-8 sm:pt-8")}>
        {/* Header: title, byline, the photo clipped to the corner. */}
        <header className="flex items-start gap-4 sm:gap-6">
          <div className="min-w-0 flex-1">
            {draft && <DraftStamp className="mb-2" />}
            <h1 className="font-display text-3xl font-semibold leading-tight sm:text-4xl">{recipe.title}</h1>
            {byline && <p className="mt-1 font-script text-2xl leading-snug text-muted">{byline}</p>}
          </div>
          <RecipeSnapshot
            title={recipe.title}
            imageUrl={recipe.imageUrl}
            priority
            className="h-24 w-24 sm:h-32 sm:w-40 md:h-36 md:w-48"
          />
        </header>
        <div className="title-rule mt-4" aria-hidden="true" />

        <div className="mt-5 grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] md:gap-10">
          {/* Left column: overview and actions (sticky on wide screens). */}
          <div className="space-y-5 md:sticky md:top-24 md:self-start">
            {recipe.description && <p className="text-muted">{recipe.description}</p>}
            {(recipe.servings != null || times.length > 0) && (
              <dl className="flex flex-wrap gap-x-6 gap-y-3">
                {recipe.servings != null && (
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-[0.1em] text-muted">Serves</dt>
                    <dd className="font-display text-xl font-semibold tabular-nums">{recipe.servings}</dd>
                  </div>
                )}
                {times.map(([label, v]) => (
                  <div key={label}>
                    <dt className="text-xs font-bold uppercase tracking-[0.1em] text-muted">{label}</dt>
                    <dd className="font-display text-xl font-semibold tabular-nums">{formatMinutes(v)}</dd>
                  </div>
                ))}
              </dl>
            )}
            {(tags.length > 0 || recipe.cuisine) && (
              <ul className="flex flex-wrap gap-1.5" aria-label="Tags">
                {recipe.cuisine && (
                  <li>
                    <Tag tone="paprika">{recipe.cuisine}</Tag>
                  </li>
                )}
                {tags.map((t) => (
                  <li key={t}>
                    <Tag>{t}</Tag>
                  </li>
                ))}
              </ul>
            )}
            <RecipeActions recipe={recipe} />
            {recipe.sourceUrl && (
              <a
                href={recipe.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-paprika underline-offset-4 hover:underline"
              >
                <ExternalIcon width={16} height={16} />
                {recipe.sourceAuthor ? `${recipe.sourceAuthor} · ` : ""}
                {sourceHost || "Original recipe"}
              </a>
            )}
            {!recipe.sourceUrl && recipe.sourceAuthor && <p className="text-sm text-muted">From {recipe.sourceAuthor}</p>}

            {recipe.notes && (
              // Kitchen notes: like a note tucked into the margin. Script for the heading only.
              <aside className="-rotate-[0.6deg] rounded-[4px] border border-mustard/60 bg-mustard-soft px-4 pb-4 pt-2 shadow-card">
                <h2 className="font-script text-2xl text-ink">Kitchen notes</h2>
                <p className="mt-0.5 whitespace-pre-line">{recipe.notes}</p>
              </aside>
            )}
          </div>

          {/* Right column: the recipe itself. */}
          <div className="space-y-10">
            <section aria-labelledby="ingredients-heading">
              <div className="flex flex-wrap items-end">
                <h2 id="ingredients-heading" className="title-rule flex-1 pb-2 font-display text-2xl font-semibold">
                  Ingredients
                </h2>
                <UnitToggle compact />
              </div>
              {recipe.ingredients.length === 0 && <p className="mt-3 text-muted">No ingredients yet.</p>}
              {groupBy(recipe.ingredients).map((g) => (
                <div key={g.group || "_"} className="mt-4">
                  {g.group && <h3 className="text-sm font-bold uppercase leading-8 tracking-[0.08em] text-paprika">{g.group}</h3>}
                  {/* Ruled lines match the 2rem line height, including wrapped lines. */}
                  <ul className="ruled leading-8 [--rule-step:2rem]">
                    {g.items.map((ing, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="mt-[0.95rem] h-px w-2.5 shrink-0 bg-paprika" aria-hidden="true" />
                        <IngredientLine ingredient={ing} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>

            <section aria-labelledby="method-heading">
              <h2 id="method-heading" className="title-rule pb-2 font-display text-2xl font-semibold">
                Method
              </h2>
              {recipe.steps.length === 0 && <p className="mt-3 text-muted">No steps yet.</p>}
              {/* No ruled lines behind the steps: wrapped prose never lines up neatly. */}
              {groupBy(numberedSteps).map((g) => (
                <div key={g.group || "_"} className="mt-4">
                  {g.group && <h3 className="mb-1 text-sm font-bold uppercase tracking-[0.08em] text-paprika">{g.group}</h3>}
                  <ol>
                    {g.items.map((s) => (
                      <li key={s.n} className="flex gap-4 border-b border-line py-4 last:border-b-0">
                        <span className="w-9 shrink-0 text-right font-display text-3xl font-semibold leading-none text-paprika tabular-nums" aria-hidden="true">
                          {s.n}
                        </span>
                        <p className="min-w-0 text-[1.0625rem] leading-7">
                          <StepText text={s.text} />
                        </p>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </section>
          </div>
        </div>
      </article>
    </UnitsProvider>
  );
}
