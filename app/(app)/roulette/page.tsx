import type { Metadata } from "next";
import { Suspense } from "react";
import { Roulette } from "@/components/roulette/roulette";
import { PageLoading } from "@/components/ui/spinner";
import { requireSession } from "@/lib/auth/session";
import { listRecipes } from "@/lib/db/recipes";
import { toSummary } from "@/lib/recipes/summary";

export const metadata: Metadata = { title: "Spin" };

export default function RoulettePage({ searchParams }: PageProps<"/roulette">) {
  return (
    <div className="mx-auto max-w-xl space-y-5">
      <h1 className="font-display text-3xl font-semibold">What&apos;s for dinner?</h1>
      <Suspense fallback={<PageLoading label="Loading the rotation…" />}>
        <RouletteLoader searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function RouletteLoader({ searchParams }: Pick<PageProps<"/roulette">, "searchParams">) {
  const session = await requireSession();
  const [recipes, sp] = await Promise.all([listRecipes(session.householdId), searchParams]);
  return <Roulette recipes={recipes.map(toSummary)} autoSpin={sp.spin === "1"} />;
}
