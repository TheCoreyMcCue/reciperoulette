import { useId, type ComponentProps, type ReactNode } from "react";
import { AlertIcon } from "@/components/icons";
import { cn } from "./cn";

/**
 * Text inputs look like writing on a ruled line: a soft border with a firmer
 * baseline, which turns paprika on focus.
 */
export const inputClass =
  "w-full min-h-12 rounded-control border border-line border-b-2 border-b-muted/45 bg-card px-4 text-base text-ink " +
  "transition-colors duration-200 ease-out placeholder:text-muted " +
  "focus:border-paprika/60 focus:border-b-paprika focus:outline-none focus:ring-3 focus:ring-paprika/20 " +
  "aria-invalid:border-danger/60 aria-invalid:border-b-danger";

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={cn("block text-sm font-bold text-ink", className)} {...props} />;
}

export function FieldError({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p id={id} className="flex items-start gap-1.5 text-sm font-semibold text-danger">
      <AlertIcon width={16} height={16} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

export function TextField({
  label,
  error,
  hint,
  className,
  id,
  ...props
}: ComponentProps<"input"> & { label: ReactNode; error?: string; hint?: ReactNode }) {
  const auto = useId();
  const inputId = id ?? auto;
  const describedBy = error ? `${inputId}-err` : hint ? `${inputId}-hint` : undefined;
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={inputId}>{label}</Label>
      <input
        id={inputId}
        className={inputClass}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...props}
      />
      {error ? (
        <FieldError id={`${inputId}-err`}>{error}</FieldError>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Ink text on a soft tint with a coloured edge, so every tone stays readable in both modes. */
export function Alert({
  tone = "error",
  children,
  className,
}: {
  tone?: "error" | "info" | "success";
  children: ReactNode;
  className?: string;
}) {
  const tones = {
    error: "border-danger bg-danger-soft",
    info: "border-mustard bg-kraft",
    success: "border-sage bg-sage-soft",
  };
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("rounded-card border-l-4 px-4 py-3 text-base text-ink", tones[tone], className)}
    >
      {children}
    </div>
  );
}
