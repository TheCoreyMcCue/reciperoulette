import { cn } from "./cn";

export function Spinner({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg data-motion="essential" className={cn("animate-spin", className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" opacity="0.2" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

/** Route-level loading: a real spinner plus a short handwritten-style line. */
export function PageLoading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center gap-3 text-muted" role="status">
      <Spinner className="h-6 w-6 text-paprika" />
      <span className="font-script text-2xl">{label}</span>
    </div>
  );
}
