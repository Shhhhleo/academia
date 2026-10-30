# SEO files for Google Search Console

- Live sitemap (always up to date): https://academia-ib.vercel.app/sitemap.xml
- Live robots.txt: https://academia-ib.vercel.app/robots.txt
- Live llms.txt (for AI search engines): https://academia-ib.vercel.app/llms.txt
- `sitemap.xml` in this folder is a static copy generated on 2026-10-30.

## Submit to Google Search Console
1. Open https://search.google.com/search-console and add a **URL prefix** property for `https://academia-ib.vercel.app/`.
2. Verify ownership with the **HTML tag** method: copy the content value of the meta tag, set it as the
   `GOOGLE_SITE_VERIFICATION` environment variable in Vercel, redeploy, then click Verify.
3. Go to **Sitemaps**, enter `sitemap.xml` and press **Submit**.
