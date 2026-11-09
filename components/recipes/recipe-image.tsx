"use client";

/* eslint-disable @next/next/no-img-element -- images come from arbitrary recipe sites */
import { useState } from "react";
import { PotIcon } from "@/components/icons";
import { placeholderColors } from "@/lib/recipes/format";

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
        className={`h-full w-full object-cover ${className}`}
      />
    );
  }
  const [bg, fg] = placeholderColors(title);
  return (
    <div className={`flex h-full w-full items-center justify-center dark:brightness-[0.7] ${className}`} style={{ background: bg, color: fg }} aria-hidden="true">
      <PotIcon width={44} height={44} strokeWidth={1.5} />
    </div>
  );
}
