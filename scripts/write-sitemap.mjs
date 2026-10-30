// Writes seo/sitemap.xml and seo/robots.txt for the production domain (for Google Search Console).
// Usage: node scripts/write-sitemap.mjs https://your-domain.vercel.app
import { mkdirSync, writeFileSync } from "node:fs"

const base = (process.argv[2] ?? process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "")
if (!/^https:\/\/[a-z0-9.-]+$/i.test(base)) {
  console.error("Pass the https:// production URL, e.g. node scripts/write-sitemap.mjs https://academia-ib.vercel.app")
  process.exit(1)
}

const today = new Date().toISOString().slice(0, 10)
const pages = [
  ["/", "weekly", "1.0"],
  ["/guides/ib-grading", "monthly", "0.8"],
  ["/signup", "yearly", "0.6"],
  ["/login", "yearly", "0.4"],
  ["/privacy", "yearly", "0.3"],
  ["/terms", "yearly", "0.3"],
]

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .map(([path, freq, priority]) => `  <url>\n    <loc>${base}${path}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${freq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`)
  .join("\n")}
</urlset>
`

mkdirSync("seo", { recursive: true })
writeFileSync("seo/sitemap.xml", xml)
writeFileSync(
  "seo/README.md",
  `# SEO files for Google Search Console

- Live sitemap (always up to date): ${base}/sitemap.xml
- Live robots.txt: ${base}/robots.txt
- Live llms.txt (for AI search engines): ${base}/llms.txt
- \`sitemap.xml\` in this folder is a static copy generated on ${today}.

## Submit to Google Search Console
1. Open https://search.google.com/search-console and add a **URL prefix** property for \`${base}/\`.
2. Verify ownership with the **HTML tag** method: copy the content value of the meta tag, set it as the
   \`GOOGLE_SITE_VERIFICATION\` environment variable in Vercel, redeploy, then click Verify.
3. Go to **Sitemaps**, enter \`sitemap.xml\` and press **Submit**.
`,
)
console.log(`wrote seo/sitemap.xml for ${base}`)
