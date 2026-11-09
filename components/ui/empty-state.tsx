import type { ComponentType, ReactNode, SVGProps } from "react";
import { cn } from "./cn";

/**
 * A short handwritten line, a line illustration and (optionally) a way forward.
 * The script font is only used for the short headline; the explanation stays in the body font.
 */
export function EmptyState({
  Illustration,
  title,
  children,
  action,
  className,
  as: Heading = "h2",
}: {
  Illustration?: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
  as?: "h1" | "h2" | "p";
}) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-10 text-center", className)}>
      {Illustration && <Illustration className="mb-3 h-20 w-auto text-muted" />}
      <Heading className="font-script text-3xl leading-tight text-ink">{title}</Heading>
      {children && <div className="mx-auto mt-2 max-w-sm text-muted">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
