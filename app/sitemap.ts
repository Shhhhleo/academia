import type { MetadataRoute } from "next"
import { absoluteUrl } from "@/lib/site"

const UPDATED = new Date("2026-10-30")

/** Public, indexable pages only. The signed-in app is excluded (and noindexed). */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: absoluteUrl("/"), lastModified: UPDATED, changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/guides/ib-grading"), lastModified: UPDATED, changeFrequency: "monthly", priority: 0.8 },
    { url: absoluteUrl("/signup"), lastModified: UPDATED, changeFrequency: "yearly", priority: 0.6 },
    { url: absoluteUrl("/login"), lastModified: UPDATED, changeFrequency: "yearly", priority: 0.4 },
    { url: absoluteUrl("/privacy"), lastModified: UPDATED, changeFrequency: "yearly", priority: 0.3 },
    { url: absoluteUrl("/terms"), lastModified: UPDATED, changeFrequency: "yearly", priority: 0.3 },
  ]
}
