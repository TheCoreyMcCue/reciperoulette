import { normalizeFractions, parseQuantityValue } from "@/lib/recipes/ingredients";

/** A parsed amount; `high` is set for ranges like "2-3" or "2 to 3". */
export type Amount = { low: number; high: number | null };

export function parseQuantity(raw: string | null | undefined): Amount | null {
  if (!raw) return null;
  const s = normalizeFractions(raw).trim().replace(/\s+/g, " ");
  if (!s) return null;
  const single = parseQuantityValue(s);
  if (single != null) return single > 0 ? { low: single, high: null } : null;
  const parts = s.split(/\s*(?:-|–|—|\bto\b|\btot\b|\bà\b|\bor\b|\bof\b)\s*/i).filter(Boolean);
  if (parts.length === 2) {
    const low = parseQuantityValue(parts[0]!);
    const high = parseQuantityValue(parts[1]!);
    if (low != null && high != null && low > 0 && high >= low) return { low, high: high === low ? null : high };
  }
  return null;
}

export function scaleAmount(a: Amount, factor: number): Amount {
  return { low: a.low * factor, high: a.high == null ? null : a.high * factor };
}

export const amountMax = (a: Amount) => a.high ?? a.low;
