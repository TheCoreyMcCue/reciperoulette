import { cn } from "./cn";

/**
 * Index-card divider tabs standing on a paprika baseline. Used for small radio
 * groups (units, appearance); pair with role="radiogroup" / role="radio".
 */
export const dividerTabsClass = "inline-flex items-end gap-1 border-b-2 border-paprika";

export function dividerTabClass(on: boolean, compact = false) {
  return cn(
    "-mb-0.5 rounded-t-[6px] border border-b-0 font-bold transition duration-200 ease-out",
    compact ? "px-3 text-sm" : "px-4 text-base",
    on ? "min-h-12 border-paprika bg-paprika text-on-paprika" : "min-h-11 border-line bg-kraft text-muted hover:text-ink",
  );
}
