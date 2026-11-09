"use client";

import { useEffect } from "react";
import { PotIllustration } from "@/components/illustrations";
import { Button } from "@/components/ui/button";
import { cardClass } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { EmptyState } from "@/components/ui/empty-state";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <EmptyState
      as="h1"
      className={cn(cardClass, "mx-auto max-w-md")}
      Illustration={PotIllustration}
      title="Something boiled over"
      action={<Button onClick={reset}>Try again</Button>}
    >
      <p>We hit a problem loading this page. It&apos;s probably temporary. Try again in a moment.</p>
      {error.digest && <p className="mt-2 text-sm tabular-nums">Reference: {error.digest}</p>}
    </EmptyState>
  );
}
