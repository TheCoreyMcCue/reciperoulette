import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { RecipeForm } from "@/components/recipes/recipe-form";
import { PageLoading } from "@/components/ui/spinner";
import { requireSession } from "@/lib/auth/session";
import { getRecipe } from "@/lib/db/recipes";
import { RecipeInputSchema } from "@/lib/recipes/schema";

export const metadata: Metadata = { title: "Edit recipe" };

export default function EditRecipePage({ params }: PageProps<"/recipes/[id]/edit">) {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="font-display text-3xl font-semibold">Edit recipe</h1>
      <Suspense fallback={<PageLoading />}>
        <Edit params={params} />
      </Suspense>
    </div>
  );
}

async function Edit({ params }: Pick<PageProps<"/recipes/[id]/edit">, "params">) {
  const session = await requireSession();
  const { id } = await params;
  const recipe = /^[A-Za-z0-9_-]{1,64}$/.test(id) ? await getRecipe(session.householdId, id) : null;
  if (!recipe) notFound();
  const input = RecipeInputSchema.parse(recipe);
  return <RecipeForm initial={input} recipeId={recipe.id} submitLabel="Save changes" onCancelHref={`/recipes/${recipe.id}`} />;
}
