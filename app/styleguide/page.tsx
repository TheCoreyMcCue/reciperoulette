import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Styleguide } from "./styleguide";

export const metadata: Metadata = { title: "Styleguide", robots: { index: false } };

/**
 * Dev-only: every theme token and shared component, in light and dark side by side.
 * Tokens live in app/globals.css; change them there and this page updates.
 */
export default function StyleguidePage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <Styleguide />;
}
