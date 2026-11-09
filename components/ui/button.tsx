import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "./cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "herb";
type Size = "md" | "lg" | "sm" | "icon";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition select-none " +
  "disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-primary-ink shadow-sm hover:brightness-110",
  secondary: "bg-surface text-ink border border-border hover:bg-surface-2",
  ghost: "text-ink hover:bg-surface-2",
  danger: "bg-surface text-danger border border-border hover:bg-surface-2",
  herb: "bg-herb text-white dark:text-[#10180e] shadow-sm hover:brightness-110",
};

const sizes: Record<Size, string> = {
  sm: "min-h-10 px-4 text-sm",
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
