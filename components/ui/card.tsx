import type { ComponentProps } from "react";
import { cn } from "./cn";

/** Index-card stock: the base surface for panels, forms and recipe cards. */
export const cardClass = "rounded-card border border-line bg-card shadow-card";

export function Card({ className, ...props }: ComponentProps<"section">) {
  return <section className={cn(cardClass, "p-5", className)} {...props} />;
}

/** Card heading with the index card's red line underneath. */
export function CardTitle({ className, ...props }: ComponentProps<"h2">) {
  return <h2 className={cn("title-rule pb-2 font-display text-xl font-semibold", className)} {...props} />;
}
