import type { MetadataRoute } from "next"
import { APP_ROUTES } from "@/lib/auth/routes"
import { absoluteUrl, site } from "@/lib/site"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [...APP_ROUTES, "/api/", "/auth/", "/reset-password", "/forgot-password"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: site.url,
  }
}
