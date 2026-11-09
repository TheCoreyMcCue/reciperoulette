"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="mx-auto max-w-md space-y-4 rounded-3xl border border-border bg-surface p-6 text-center">
      <h1 className="font-display text-2xl font-semibold">Something boiled over</h1>
      <p className="text-muted">
        We hit a problem loading this page. It&apos;s probably temporary. Try again in a moment.
      </p>
      {error.digest && <p className="text-xs text-muted">Reference: {error.digest}</p>}
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
