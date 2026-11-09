import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))]">
      <div className="mb-8 flex items-center gap-3">
        <Logo className="h-12 w-12" />
        <span className="font-display text-3xl font-semibold tracking-tight">reciperoulette</span>
      </div>
      {children}
    </main>
  );
}
