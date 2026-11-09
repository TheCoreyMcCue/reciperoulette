import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;
const s = (props: P) => ({
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  width: 24,
  height: 24,
  ...props,
});

export const BookIcon = (p: P) => (
  <svg {...s(p)}><path d="M4 19.5V5a2 2 0 0 1 2-2h13v16H6.5A2.5 2.5 0 0 0 4 21.5v-2Z" /><path d="M8 7h7M8 11h5" /></svg>
);
export const SpinIcon = (p: P) => (
  <svg {...s(p)}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="2.5" /><path d="M12 3v4M12 17v4M3 12h4M17 12h4" /></svg>
);
export const PlusIcon = (p: P) => (
  <svg {...s(p)}><path d="M12 5v14M5 12h14" /></svg>
);
export const GearIcon = (p: P) => (
  <svg {...s(p)}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></svg>
);
export const ClockIcon = (p: P) => (
  <svg {...s(p)}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
);
export const RepeatIcon = (p: P) => (
  <svg {...s(p)}><path d="m17 2 4 4-4 4" /><path d="M3 11v-1a4 4 0 0 1 4-4h14" /><path d="m7 22-4-4 4-4" /><path d="M21 13v1a4 4 0 0 1-4 4H3" /></svg>
);
export const CheckIcon = (p: P) => (
  <svg {...s(p)}><path d="M20 6 9 17l-5-5" /></svg>
);
export const XIcon = (p: P) => (
  <svg {...s(p)}><path d="M18 6 6 18M6 6l12 12" /></svg>
);
export const SearchIcon = (p: P) => (
  <svg {...s(p)}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
);
export const CameraIcon = (p: P) => (
  <svg {...s(p)}><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" /><circle cx="12" cy="13" r="3.5" /></svg>
);
export const LinkIcon = (p: P) => (
  <svg {...s(p)}><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" /><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" /></svg>
);
export const TextIcon = (p: P) => (
  <svg {...s(p)}><path d="M4 6h16M4 12h16M4 18h10" /></svg>
);
export const PhoneShareIcon = (p: P) => (
  <svg {...s(p)}><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><path d="m16 6-4-4-4 4" /><path d="M12 2v13" /></svg>
);
export const TrashIcon = (p: P) => (
  <svg {...s(p)}><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>
);
export const EditIcon = (p: P) => (
  <svg {...s(p)}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
);
export const FlameIcon = (p: P) => (
  <svg {...s(p)}><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1-2.1-.2-4 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3.3.4 1.4 1.4 2.8 2.5 2.8Z" /></svg>
);
export const ExternalIcon = (p: P) => (
  <svg {...s(p)}><path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></svg>
);
export const ChevronLeftIcon = (p: P) => (
  <svg {...s(p)}><path d="m15 18-6-6 6-6" /></svg>
);
export const ChevronRightIcon = (p: P) => (
  <svg {...s(p)}><path d="m9 18 6-6-6-6" /></svg>
);
export const UsersIcon = (p: P) => (
  <svg {...s(p)}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" /></svg>
);
export const PotIcon = (p: P) => (
  <svg {...s(p)}><path d="M3 10h18M5 10v7a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-7M2 10h2M20 10h2M9 6c0-1 .5-2 1.5-2M13 6c0-1 .5-2 1.5-2" /></svg>
);
