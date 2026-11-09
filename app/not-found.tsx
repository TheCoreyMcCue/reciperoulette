import Link from "next/link";
import { BowlIllustration } from "@/components/illustrations";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70dvh] max-w-md flex-col items-center justify-center p-6">
      <EmptyState
        as="h1"
        Illustration={BowlIllustration}
        title="Nothing on this plate"
        action={
          <Link href="/" className={buttonClass("primary")}>
            Back to recipes
          </Link>
        }
      >
        We couldn&apos;t find that page or recipe. It may have been deleted.
      </EmptyState>
    </main>
  );
}
