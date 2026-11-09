import {
  BookOpen,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  ClipboardPaste,
  Clock,
  CookingPot,
  ExternalLink,
  Flame,
  Link,
  PencilLine,
  Plus,
  Repeat,
  Search,
  Settings,
  Share,
  Shuffle,
  Trash2,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import type { SVGProps } from "react";

/**
 * The app's icon set: Lucide, wrapped so every icon shares one stroke weight
 * and is decorative (aria-hidden) by default. Import icons from here, not from
 * lucide-react directly.
 */
export const ICON_STROKE = 1.75;

type P = SVGProps<SVGSVGElement>;

function icon(Icon: LucideIcon, name: string) {
  const C = (props: P) => <Icon aria-hidden strokeWidth={ICON_STROKE} width={24} height={24} {...props} />;
  C.displayName = name;
  return C;
}

export const BookIcon = icon(BookOpen, "BookIcon");
export const SpinIcon = icon(Shuffle, "SpinIcon");
export const PlusIcon = icon(Plus, "PlusIcon");
export const GearIcon = icon(Settings, "GearIcon");
export const ClockIcon = icon(Clock, "ClockIcon");
export const RepeatIcon = icon(Repeat, "RepeatIcon");
export const CheckIcon = icon(Check, "CheckIcon");
export const XIcon = icon(X, "XIcon");
export const SearchIcon = icon(Search, "SearchIcon");
export const CameraIcon = icon(Camera, "CameraIcon");
export const LinkIcon = icon(Link, "LinkIcon");
export const TextIcon = icon(ClipboardPaste, "TextIcon");
export const PhoneShareIcon = icon(Share, "PhoneShareIcon");
export const TrashIcon = icon(Trash2, "TrashIcon");
export const EditIcon = icon(PencilLine, "EditIcon");
export const FlameIcon = icon(Flame, "FlameIcon");
export const ExternalIcon = icon(ExternalLink, "ExternalIcon");
export const ChevronLeftIcon = icon(ChevronLeft, "ChevronLeftIcon");
export const ChevronRightIcon = icon(ChevronRight, "ChevronRightIcon");
export const UsersIcon = icon(Users, "UsersIcon");
export const PotIcon = icon(CookingPot, "PotIcon");
export const AlertIcon = icon(CircleAlert, "AlertIcon");
