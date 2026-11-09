import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "./cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "sage";
type Size = "md" | "lg" | "sm" | "icon";

const base =
  "inline-flex items-center justify-center gap-2 rounded-control font-bold select-none " +
  "transition duration-200 ease-out active:translate-y-px " +
  "disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  /** Solid paprika. One per view, the thing you most likely want to do. */
  primary: "bg-paprika text-on-paprika shadow-card hover:brightness-[1.06] active:shadow-press",
  /** Outlined ink. */
  secondary: "border-[1.5px] border-ink/75 bg-transparent text-ink hover:bg-kraft active:bg-kraft",
  ghost: "text-ink hover:bg-kraft active:bg-kraft",
  /** Destructive but calm: oxblood outline, never a solid red slab. */
  danger: "border-[1.5px] border-danger/60 bg-transparent text-danger hover:bg-danger-soft active:bg-danger-soft",
  /** "On" state for toggles like In rotation: sage fill with dark ink (ink on solid sage fails AA). */
  sage: "border-[1.5px] border-sage bg-sage-soft text-ink hover:brightness-[0.98]",
};

const sizes: Record<Size, string> = {
  sm: "min-h-11 px-4 text-sm",
  md: "min-h-12 px-5 text-base",
  lg: "min-h-14 px-7 text-lg",
  icon: "h-12 w-12",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

export function Button({
  variant,
  size,
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button type={type} className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant,
  size,
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}
