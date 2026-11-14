// Captures light-theme product screens for the landing page. Usage: node scripts/capture-light.mjs [baseUrl]
import { readFileSync, mkdirSync } from "node:fs"
import { chromium } from "playwright-core"

const base = process.argv[2] ?? "http://localhost:3000"
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
)
const out = "public/media/screens"
mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" })
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, colorScheme: "light", reducedMotion: "reduce" })
await ctx.addInitScript(() => localStorage.setItem("theme", "light"))
const page = await ctx.newPage()
await page.goto(`${base}/login`)
await page.fill('input[name="email"]', env.TEST_USER_EMAIL)
await page.fill('input[name="password"]', env.TEST_USER_PASSWORD)
await page.click('button[type="submit"]')
await page.waitForURL("**/dashboard", { timeout: 30000 })
const hide = "nextjs-portal, [data-sonner-toaster] { display: none !important; }"
async function shot(path, name) {
  await page.goto(`${base}${path}`)
  await page.waitForLoadState("networkidle")
  await page.addStyleTag({ content: hide })
  await page.mouse.move(2, 2)
  await page.waitForTimeout(1000)
  await page.screenshot({ path: `${out}/${name}.png` })
}
await shot("/dashboard", "dashboard-light")
await page.getByRole("link", { name: /Mathematics/ }).first().click()
await page.waitForURL("**/subjects/**")
await page.waitForLoadState("networkidle")
await page.addStyleTag({ content: hide })
await page.mouse.move(2, 2)
await page.waitForTimeout(1000)
await page.screenshot({ path: `${out}/subject-light.png` })
await shot("/calendar?view=month&date=2026-11-01", "calendar-light")
await shot("/analytics", "analytics-light")
await browser.close()
console.log("captured to", out)
