export function Logo({ className = "h-10 w-10" }: { className?: string }) {
  // A plate with a roulette-style pointer.
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <circle cx="24" cy="24" r="21" fill="var(--paprika)" />
      <circle cx="24" cy="24" r="14" fill="var(--card)" />
      <circle cx="24" cy="24" r="9" fill="none" stroke="var(--paprika-soft)" strokeWidth="3" />
      <path d="M24 24 L33 15" stroke="var(--paprika)" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="24" cy="24" r="3" fill="var(--paprika)" />
    </svg>
  );
}
