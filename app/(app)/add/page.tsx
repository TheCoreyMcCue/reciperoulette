import type { Metadata } from "next";
import { ImportFlow } from "@/components/import/import-flow";

export const metadata: Metadata = { title: "Add a recipe" };

export default function AddPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="font-display text-3xl font-semibold">Add a recipe</h1>
      <ImportFlow />
    </div>
  );
}
