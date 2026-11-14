// Captures real Academia screens (dark theme) for the hero film.
// Usage: node scripts/capture-screens.mjs [baseUrl]   (dev server must be running; uses TEST_USER_* from .env.local)
import { readFileSync, mkdirSync } from "node:fs"
import { chromium } from "playwright-core"

const base = process.argv[2] ?? "http://localhost:3000"
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
)
const out = "video/academia-hero/assets"
mkdirSync(out, { recursive: true })

const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" })

async function session(viewport, deviceScaleFactor, isMobile = false) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor, isMobile, hasTouch: isMobile, colorScheme: "dark", reducedMotion: "reduce" })
  await ctx.addInitScript(() => {
    localStorage.setItem("theme", "dark")
    localStorage.setItem("academia:sidebar-collapsed", "0")
  })
  const page = await ctx.newPage()
  await page.goto(`${base}/login`)
  await page.fill('input[name="email"]', env.TEST_USER_EMAIL)
  await page.fill('input[name="password"]', env.TEST_USER_PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL("**/dashboard", { timeout: 30000 })
  await page.waitForLoadState("networkidle")
  // Hide dev-only overlays (Next.js indicator, toasts) so the capture is the product alone.
  await page.addStyleTag({ content: "nextjs-portal, [data-sonner-toaster], [data-nextjs-toast] { display: none !important; }" })
  await page.mouse.move(2, 2)
  await page.waitForTimeout(1200)
  return { ctx, page }
}

{
  const { ctx, page } = await session({ width: 1440, height: 900 }, 2)
  await page.screenshot({ path: `${out}/dashboard-dark.png` })
  await page.goto(`${base}/subjects`)
  await page.waitForLoadState("networkidle")
  await page.addStyleTag({ content: "nextjs-portal, [data-sonner-toaster] { display: none !important; }" })
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${out}/subjects-dark.png` })
  await ctx.close()
}
{
  const { ctx, page } = await session({ width: 390, height: 844 }, 3, true)
  await page.screenshot({ path: `${out}/dashboard-mobile-dark.png` })
  await ctx.close()
}

await browser.close()
console.log("captured to", out)
