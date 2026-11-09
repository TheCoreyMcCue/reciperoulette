import type { Metadata } from "next";
import { Logo } from "@/components/logo";

export const metadata: Metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <Logo className="h-16 w-16" />
      <h1 className="font-display text-3xl font-semibold">You&apos;re offline</h1>
      <p className="text-muted">The recipe box needs a connection. Check your Wi-Fi and try again.</p>
      {/* A full page load on purpose: this page is served by the service worker while offline. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a href="/" className="inline-flex min-h-12 items-center rounded-full bg-primary px-6 font-semibold text-primary-ink">
        Try again
      </a>
    </main>
  );
}
