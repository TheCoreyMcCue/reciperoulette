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

/** Pleasant placeholder colours for recipes without a photo. */
const PALETTE = [
  ["#f6d7c3", "#b8461b"],
  ["#dcebd5", "#3f6b3a"],
  ["#f7e6b5", "#8a5a00"],
  ["#e9d8ef", "#6b3d7a"],
  ["#d6e6f2", "#2f5d7c"],
  ["#f3d1d1", "#9b2c2c"],
] as const;

export function placeholderColors(seed: string): readonly [string, string] {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length]!;
}
