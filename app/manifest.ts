import type { MetadataRoute } from "next"
import { site } from "@/lib/site"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${site.name}: IB Grade Tracker`,
    short_name: site.name,
    description: site.description,
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#fafaf8",
    theme_color: "#4f46e5",
    categories: ["education", "productivity"],
    icons: [
      { src: "/icon.svg", type: "image/svg+xml", sizes: "any", purpose: "any" },
      { src: "/apple-icon", type: "image/png", sizes: "180x180" },
      { src: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { src: "/logo.png", type: "image/png", sizes: "512x512" },
    ],
  }
}
