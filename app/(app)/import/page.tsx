import type { Metadata } from "next";
import { Suspense } from "react";
import { ImportFlow } from "@/components/import/import-flow";
import { PageLoading } from "@/components/ui/spinner";
import { requireSession } from "@/lib/auth/session";
import { interpretShared } from "@/lib/importers/shared-input";

export const metadata: Metadata = { title: "Import" };

/**
 * Entry point for sharing into the app:
 *   - Android Web Share Target (manifest share_target → GET /import?title=&text=&url=)
 *   - iOS Shortcut → /import?url=… or /import?text=…
 */
export default function ImportPage({ searchParams }: PageProps<"/import">) {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="font-display text-3xl font-semibold">Add a recipe</h1>
      <Suspense fallback={<PageLoading label="Opening what you shared…" />}>
        <Shared searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Shared({ searchParams }: Pick<PageProps<"/import">, "searchParams">) {
  await requireSession();
  const shared = interpretShared(await searchParams);
  if (shared.kind === "url") return <ImportFlow key={shared.url} initialTab="url" initialUrl={shared.url} autoStart />;
  if (shared.kind === "text") return <ImportFlow key={shared.text.slice(0, 50)} initialTab="text" initialText={shared.text} autoStart />;
  return <ImportFlow />;
}
