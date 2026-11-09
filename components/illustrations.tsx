import type { SVGProps } from "react";

/**
 * Simple line illustrations (inline SVG, currentColor) for empty states and
 * recipes without a photo. Stroke matches the icon set's weight at this scale.
 */
type P = SVGProps<SVGSVGElement>;

const base = (props: P) => ({
  viewBox: "0 0 120 96",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  width: 120,
  height: 96,
  ...props,
});

/** A recipe tin with cards peeking out. */
export function RecipeBoxIllustration(props: P) {
  return (
    <svg {...base(props)}>
      <path d="M22 44 30 16h70l-6 28" />
      <path d="M34 44V30a2 2 0 0 1 2-2h8l2-3h12a2 2 0 0 1 2 2v17" />
      <path d="M52 44V24a2 2 0 0 1 2-2h22a2 2 0 0 1 2 2v20" />
      <path d="M58 30h14M58 35h10" opacity=".6" />
      <path d="M76 44V33a2 2 0 0 1 2-2h12" />
      <rect x="18" y="44" width="84" height="38" rx="4" />
      <rect x="47" y="56" width="26" height="12" rx="2" />
      <path d="M52 62h16" opacity=".6" />
    </svg>
  );
}

/** The same tin, lid open, nothing inside. */
export function EmptyTinIllustration(props: P) {
  return (
    <svg {...base(props)}>
      <path d="M22 44 30 16h70l-6 28" />
      <path d="M26 44h68" opacity=".5" />
      <rect x="18" y="44" width="84" height="38" rx="4" />
      <rect x="47" y="56" width="26" height="12" rx="2" />
      <path d="M52 62h16" opacity=".6" />
      <path d="M40 34c2-2 4 2 6 0M70 30c2-2 4 2 6 0" opacity=".45" />
    </svg>
  );
}

/** A steaming bowl. */
export function BowlIllustration(props: P) {
  return (
    <svg {...base(props)}>
      <path d="M46 36c-3-5 3-8 0-13M60 34c-3-5 3-8 0-13M74 36c-3-5 3-8 0-13" opacity=".6" />
      <path d="M22 46h76" />
      <path d="M24 46c2 18 16 28 36 28s34-10 36-28" />
      <path d="M48 78h24" />
      <path d="M84 40 100 18" />
    </svg>
  );
}

/** A lidded pot. */
export function PotIllustration(props: P) {
  return (
    <svg {...base(props)}>
      <path d="M56 26c0-3 2-5 4-5s4 2 4 5" />
      <path d="M30 36c4-6 16-10 30-10s26 4 30 10z" />
      <path d="M32 40v28a8 8 0 0 0 8 8h40a8 8 0 0 0 8-8V40" />
      <path d="M32 48H22M88 48h10" />
      <path d="M44 60h32" opacity=".45" />
    </svg>
  );
}

/** A lattice pie on a plate. */
export function PieIllustration(props: P) {
  return (
    <svg {...base(props)}>
      <ellipse cx="60" cy="48" rx="38" ry="14" />
      <path d="M22 48v8c0 8 17 14 38 14s38-6 38-14v-8" />
      <path d="M42 38l-6 22M58 35l-4 26M74 36l-4 25M34 44h52M30 52h60" opacity=".55" />
      <path d="M14 66c6 8 24 14 46 14s40-6 46-14" opacity=".5" />
    </svg>
  );
}

export const PLACEHOLDER_ILLUSTRATIONS = [BowlIllustration, PotIllustration, PieIllustration] as const;
