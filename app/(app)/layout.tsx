import { BottomNav, TopNav } from "./nav";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <TopNav />
      <div className="mx-auto w-full max-w-5xl px-4 pb-28 pt-4 md:px-6 md:pb-12 md:pt-8">{children}</div>
      <BottomNav />
    </>
  );
}
