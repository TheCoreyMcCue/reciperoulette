import Link from "next/link";
import { buttonClass } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70dvh] max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="font-display text-5xl">🍽️</p>
      <h1 className="font-display text-3xl font-semibold">Nothing on this plate</h1>
      <p className="text-muted">We couldn&apos;t find that page or recipe. It may have been deleted.</p>
      <Link href="/" className={buttonClass("primary")}>
        Back to recipes
      </Link>
    </main>
  );
}
