import { requireSession } from "@/lib/auth/session";

export default async function HomePage() {
  await requireSession();
  return <h1 className="font-display text-3xl font-semibold">Recipes</h1>;
}
