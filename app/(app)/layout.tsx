import { Suspense } from "react";
import { BottomNav, BottomNavView, TopNav, TopNavView } from "./nav";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      {/* The active-tab highlight depends on the URL, so it streams in; the fallback is the same nav without it. */}
      <Suspense fallback={<TopNavView pathname="" />}>
        <TopNav />
      </Suspense>
      <div className="mx-auto w-full max-w-5xl px-4 pb-28 pt-4 md:px-6 md:pb-12 md:pt-8">{children}</div>
      <Suspense fallback={<BottomNavView pathname="" />}>
        <BottomNav />
      </Suspense>
    </>
  );
}
