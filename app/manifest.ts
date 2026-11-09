import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "reciperoulette",
    short_name: "Recipes",
    description: "Our recipe box, our rotation, and a button for when we can't decide.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fbf6ee",
    theme_color: "#b8461b",
    categories: ["food", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Spin", url: "/roulette?spin=1", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Add a recipe", url: "/add", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
    // Android: appears in the system share sheet once installed. Links usually arrive in `text`.
    share_target: {
      action: "/import",
      method: "GET",
      params: { title: "title", text: "text", url: "url" },
    },
  };
}
