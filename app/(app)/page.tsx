import { Suspense } from "react";
import { PlusIcon, SpinIcon } from "@/components/icons";
import { RecipeBrowser } from "@/components/recipes/recipe-browser";
import { ButtonLink } from "@/components/ui/button";
import { PageLoading } from "@/components/ui/spinner";
import { requireSession } from "@/lib/auth/session";
import { listRecipes } from "@/lib/db/recipes";
import { toSummary } from "@/lib/recipes/summary";

export default function HomePage() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-semibold">Recipes</h1>
        <ButtonLink href="/add" variant="secondary" size="sm" className="hidden sm:inline-flex">
          <PlusIcon width={18} height={18} /> Add recipe
        </ButtonLink>
      </div>
      <ButtonLink
        href="/roulette"
        size="lg"
        className="w-full justify-between rounded-3xl py-4 text-left shadow-md sm:w-auto sm:min-w-80"
      >
        <span>
          <span className="block font-display text-xl">Can&apos;t decide?</span>
          <span className="block text-sm font-normal opacity-90">Spin the rotation</span>
        </span>
        <SpinIcon width={36} height={36} />
      </ButtonLink>
      <Suspense fallback={<PageLoading label="Fetching the recipe box…" />}>
        <Recipes />
      </Suspense>
    </div>
  );
}

async function Recipes() {
  const session = await requireSession();
  const recipes = await listRecipes(session.householdId);
  return <RecipeBrowser recipes={recipes.map(toSummary)} />;
}
