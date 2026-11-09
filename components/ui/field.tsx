import { useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "./cn";

export const inputClass =
  "w-full min-h-12 rounded-2xl border border-border bg-surface px-4 text-base text-ink " +
  "placeholder:text-muted/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40";

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={cn("block text-sm font-semibold text-ink", className)} {...props} />;
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
        className={cn(inputClass, error && "border-danger")}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...props}
      />
      {error ? (
        <p id={`${inputId}-err`} className="text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

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
    error: "border-danger/40 bg-danger/10 text-danger",
    info: "border-border bg-surface-2 text-ink",
    success: "border-herb/40 bg-herb-soft text-herb",
  };
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("rounded-2xl border px-4 py-3 text-sm", tones[tone], className)}>
      {children}
    </div>
  );
}
