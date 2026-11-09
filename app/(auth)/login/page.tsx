import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PageLoading } from "@/components/ui/spinner";
import { getCurrentSession } from "@/lib/auth/session";
import { safeNextPath } from "@/lib/auth/schemas";
import { LoginForm } from "../auth-forms";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <Login searchParams={searchParams} />
    </Suspense>
  );
}

async function Login({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const next = safeNextPath((await searchParams).next);
  if (await getCurrentSession()) redirect(next);
  return <LoginForm next={next} />;
}
