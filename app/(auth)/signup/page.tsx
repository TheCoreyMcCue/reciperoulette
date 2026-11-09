import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PageLoading } from "@/components/ui/spinner";
import { getCurrentSession } from "@/lib/auth/session";
import { SignupForm } from "../auth-forms";

export const metadata: Metadata = { title: "Start a recipe box" };

export default function SignupPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Signup />
    </Suspense>
  );
}

async function Signup() {
  if (await getCurrentSession()) redirect("/");
  return <SignupForm />;
}
