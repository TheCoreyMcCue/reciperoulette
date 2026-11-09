"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";
import { BookIcon, GearIcon, PlusIcon, SpinIcon } from "@/components/icons";
import { Logo } from "@/components/logo";
import { cn } from "@/components/ui/cn";

const ITEMS: { href: string; label: string; Icon: ComponentType<SVGProps<SVGSVGElement>>; match: RegExp }[] = [
  { href: "/", label: "Recipes", Icon: BookIcon, match: /^\/(recipes(\/|$)|$)/ },
  { href: "/roulette", label: "Spin", Icon: SpinIcon, match: /^\/roulette/ },
  { href: "/add", label: "Add", Icon: PlusIcon, match: /^\/(add|import)/ },
  { href: "/settings", label: "Settings", Icon: GearIcon, match: /^\/settings/ },
];

export function BottomNav() {
  return <BottomNavView pathname={usePathname()} />;
}

export function BottomNavView({ pathname }: { pathname: string }) {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-4">
        {ITEMS.map(({ href, label, Icon, match }) => {
          const active = match.test(pathname);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-semibold",
                  active ? "text-primary" : "text-muted",
                )}
              >
                <span className={cn("rounded-full px-4 py-1 transition", active && "bg-primary-soft")}>
                  <Icon width={22} height={22} />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function TopNav() {
  return <TopNavView pathname={usePathname()} />;
}

export function TopNavView({ pathname }: { pathname: string }) {
  return (
    <header className="sticky top-0 z-40 hidden border-b border-border bg-bg/90 backdrop-blur md:block">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <Logo className="h-8 w-8" />
          <span className="font-display text-xl font-semibold">reciperoulette</span>
        </Link>
        <nav aria-label="Main">
          <ul className="flex gap-1">
            {ITEMS.map(({ href, label, Icon, match }) => {
              const active = match.test(pathname);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold",
                      active ? "bg-primary-soft text-primary" : "text-muted hover:bg-surface-2",
                    )}
                  >
                    <Icon width={18} height={18} />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
