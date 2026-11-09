export function formatMinutes(min: number | null | undefined): string {
  if (min == null) return "";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function formatRelativeDay(iso: string | null, now: Date = new Date()): string {
  if (!iso) return "";
  const days = Math.floor((startOfDay(now) - startOfDay(new Date(iso))) / 86400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 14) return "last week";
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** Stable pick of a placeholder illustration for recipes without a photo. */
export function placeholderIndex(seed: string, count: number): number {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % count;
}
