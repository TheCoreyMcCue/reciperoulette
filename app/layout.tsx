import type { Metadata, Viewport } from "next";
import { Fraunces, Nunito } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/sw-register";
import "./globals.css";

const heading = Fraunces({ variable: "--font-heading", subsets: ["latin"] });
const body = Nunito({ variable: "--font-body", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "reciperoulette", template: "%s · reciperoulette" },
  description: "Our recipe box, our rotation, and a button for when we can't decide.",
  applicationName: "reciperoulette",
  appleWebApp: { capable: true, title: "reciperoulette", statusBarStyle: "default" },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf6ee" },
    { media: "(prefers-color-scheme: dark)", color: "#17120e" },
  ],
};

/**
 * Applies the dark class before first paint to avoid a flash. Preference is
 * stored in localStorage ("light" | "dark" | absent = follow the OS).
 */
const themeScript = `(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${heading.variable} ${body.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full font-sans">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
