import type { Metadata } from "next";
import { RecipeForm } from "@/components/recipes/recipe-form";
import { RecipeInputSchema } from "@/lib/recipes/schema";

export const metadata: Metadata = { title: "New recipe" };

export default function NewRecipePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="font-display text-3xl font-semibold">New recipe</h1>
      <RecipeForm initial={RecipeInputSchema.parse({ title: "Untitled recipe", sourceType: "manual" })} onCancelHref="/" />
    </div>
  );
}
