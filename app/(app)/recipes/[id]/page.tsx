import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ChevronLeftIcon, ExternalIcon } from "@/components/icons";
import { RecipeActions } from "@/components/recipes/recipe-actions";
import { RecipeImage } from "@/components/recipes/recipe-image";
import { PageLoading } from "@/components/ui/spinner";
import { requireSession } from "@/lib/auth/session";
import { getRecipe } from "@/lib/db/recipes";
import { getUnitsPreference } from "@/lib/db/users";
import { IngredientLine, StepText } from "@/components/units/converted";
import { UnitToggle } from "@/components/units/unit-toggle";
import { UnitsProvider } from "@/components/units/units-context";
import { formatMinutes } from "@/lib/recipes/format";
import { groupBy } from "@/lib/recipes/ingredients";

export const metadata: Metadata = { title: "Recipe" };

export default function RecipePage({ params }: PageProps<"/recipes/[id]">) {
  return (
    <div className="space-y-4">
      <Link href="/" className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-muted hover:text-ink">
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
  const [recipe, units] = await Promise.all([
    /^[A-Za-z0-9_-]{1,64}$/.test(id) ? getRecipe(session.householdId, id) : null,
    getUnitsPreference(session.userId),
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

  return (
    <UnitsProvider initial={units}>
    <article className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] md:items-start">
      <div className="space-y-4 md:sticky md:top-24">
        <div className="aspect-[4/3] overflow-hidden rounded-3xl">
          <RecipeImage title={recipe.title} imageUrl={recipe.imageUrl} priority />
        </div>
        <div className="space-y-2">
          <h1 className="font-display text-3xl font-semibold leading-tight">{recipe.title}</h1>
          {recipe.description && <p className="text-muted">{recipe.description}</p>}
          <dl className="flex flex-wrap gap-2 text-sm">
            {recipe.servings != null && (
              <div className="rounded-2xl bg-surface-2 px-3 py-1.5">
                <dt className="sr-only">Servings</dt>
                <dd>Serves {recipe.servings}</dd>
              </div>
            )}
            {times.map(([label, v]) => (
              <div key={label} className="rounded-2xl bg-surface-2 px-3 py-1.5">
                <dt className="inline font-semibold">{label} </dt>
                <dd className="inline">{formatMinutes(v)}</dd>
              </div>
            ))}
          </dl>
          {(recipe.tags.length > 0 || recipe.cuisine) && (
            <ul className="flex flex-wrap gap-1.5" aria-label="Tags">
              {recipe.cuisine && <li className="rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary">{recipe.cuisine}</li>}
              {recipe.tags.map((t) => (
                <li key={t} className="rounded-full border border-border px-3 py-1 text-xs font-semibold">
                  {t}
                </li>
              ))}
            </ul>
          )}
          {recipe.sourceUrl && (
            <a
              href={recipe.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-primary underline-offset-2 hover:underline"
            >
              <ExternalIcon width={16} height={16} />
              {recipe.sourceAuthor ? `${recipe.sourceAuthor} · ` : ""}
              {sourceHost || "Original recipe"}
            </a>
          )}
          {!recipe.sourceUrl && recipe.sourceAuthor && <p className="text-sm text-muted">From {recipe.sourceAuthor}</p>}
        </div>
        <RecipeActions recipe={recipe} />
      </div>

      <div className="space-y-6">
        {recipe.notes && (
          <section className="rounded-3xl border border-herb/30 bg-herb-soft p-5">
            <h2 className="font-display text-lg font-semibold text-herb">Our notes</h2>
            <p className="mt-1 whitespace-pre-line">{recipe.notes}</p>
          </section>
        )}

        <section className="rounded-3xl border border-border bg-surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-2xl font-semibold">Ingredients</h2>
            <UnitToggle compact />
          </div>
          {recipe.ingredients.length === 0 && <p className="mt-2 text-muted">No ingredients yet.</p>}
          {groupBy(recipe.ingredients).map((g) => (
            <div key={g.group || "_"} className="mt-4">
              {g.group && <h3 className="mb-1 font-semibold text-primary">{g.group}</h3>}
              <ul className="space-y-1.5">
                {g.items.map((ing, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                    <IngredientLine ingredient={ing} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        <section className="rounded-3xl border border-border bg-surface p-5">
          <h2 className="font-display text-2xl font-semibold">Method</h2>
          {recipe.steps.length === 0 && <p className="mt-2 text-muted">No steps yet.</p>}
          {groupBy(numberedSteps).map((g) => (
            <div key={g.group || "_"} className="mt-4">
              {g.group && <h3 className="mb-2 font-semibold text-primary">{g.group}</h3>}
              <ol className="space-y-4">
                {g.items.map((s) => (
                  <li key={s.n} className="flex gap-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft font-bold text-primary" aria-hidden="true">
                      {s.n}
                    </span>
                    <p className="pt-0.5 leading-relaxed">
                      <StepText text={s.text} />
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </section>
      </div>
    </article>
    </UnitsProvider>
  );
}
