"use client";

/* eslint-disable @next/next/no-img-element -- images come from arbitrary recipe sites */
import { useState } from "react";
import { PLACEHOLDER_ILLUSTRATIONS } from "@/components/illustrations";
import { cn } from "@/components/ui/cn";
import { placeholderIndex } from "@/lib/recipes/format";

export function RecipeImage({
  title,
  imageUrl,
  className = "",
  priority = false,
}: {
  title: string;
  imageUrl: string;
  className?: string;
  priority?: boolean;
}) {
  // Social CDN thumbnails expire; fall back to the placeholder when an image breaks.
  const [failed, setFailed] = useState<string | null>(null);
  if (imageUrl && failed !== imageUrl) {
    return (
      <img
        src={imageUrl}
        alt=""
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailed(imageUrl)}
        className={cn("h-full w-full object-cover", className)}
      />
    );
  }
  // No photo: a simple line drawing on card stock.
  const Illustration = PLACEHOLDER_ILLUSTRATIONS[placeholderIndex(title, PLACEHOLDER_ILLUSTRATIONS.length)]!;
  return (
    <div className={cn("flex h-full w-full items-center justify-center bg-kraft text-muted", className)} aria-hidden="true">
      <Illustration className="h-auto w-3/4 max-w-40" />
    </div>
  );
}

/**
 * The recipe photo shown like a snapshot clipped to the card: a thin card-stock
 * border, a soft shadow and a slight tilt. Not a full-bleed hero.
 */
export function RecipeSnapshot({
  title,
  imageUrl,
  priority,
  className,
  tilt = "right",
}: {
  title: string;
  imageUrl: string;
  priority?: boolean;
  className?: string;
  tilt?: "left" | "right" | "none";
}) {
  return (
    <div
      className={cn(
        "shrink-0 rounded-[3px] border border-line bg-card p-1 shadow-card",
        tilt === "right" && "rotate-2",
        tilt === "left" && "-rotate-2",
        className,
      )}
    >
      <div className="h-full w-full overflow-hidden rounded-[2px]">
        <RecipeImage title={title} imageUrl={imageUrl} priority={priority} />
      </div>
    </div>
  );
}
