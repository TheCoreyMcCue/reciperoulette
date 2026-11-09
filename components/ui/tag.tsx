import type { ReactNode } from "react";
import { RepeatIcon } from "@/components/icons";
import { cn } from "./cn";

/** The tag the legacy importer puts on recipes that are missing ingredients or steps. */
export const DRAFT_TAG = "needs-details";

type Tone = "default" | "paprika" | "sage";

const tones: Record<Tone, string> = {
  default: "border-muted/50 text-muted",
  paprika: "border-paprika/60 text-paprika", // paper/card backgrounds only
  sage: "border-sage text-sage-ink",
};

/** A small rubber-stamp / kraft label: uppercase, letter-spaced, thin border. */
export function Tag({ children, tone = "default", className }: { children: ReactNode; tone?: Tone; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[3px] border px-1.5 py-px text-xs font-bold uppercase leading-5 tracking-[0.1em]",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** "In rotation", inked on like a little stamp. */
export function RotationStamp({ className, label = "Rotation" }: { className?: string; label?: string }) {
  return (
    <span
      className={cn(
        "inline-flex -rotate-3 items-center gap-1 rounded-[4px] border-2 border-sage bg-card px-1.5 py-px",
        "text-xs font-extrabold uppercase leading-5 tracking-[0.12em] text-sage-ink",
        className,
      )}
    >
      <RepeatIcon width={13} height={13} strokeWidth={2.25} />
      {label}
    </span>
  );
}

/** Mustard "draft" stamp for recipes that still need details. */
export function DraftStamp({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex rotate-2 items-center rounded-[4px] border-2 border-mustard bg-mustard-soft px-1.5 py-px",
        "text-xs font-extrabold uppercase leading-5 tracking-[0.14em] text-ink",
        className,
      )}
    >
      Draft
    </span>
  );
}

export const isDraft = (tags: string[]) => tags.includes(DRAFT_TAG);

/** Toggleable filter chip (tags, time limits). Pair with aria-pressed. */
export function chipClass(active: boolean) {
  return cn(
    "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-control border px-3.5 text-sm font-bold transition duration-200 ease-out active:translate-y-px",
    active ? "border-paprika bg-paprika text-on-paprika shadow-card" : "border-line bg-card text-ink hover:bg-kraft",
  );
}
