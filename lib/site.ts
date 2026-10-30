export const site = {
  name: "Academia",
  tagline: "The IB grade tracker that shows exactly where you stand.",
  description:
    "Academia is a free IB grade tracker for MYP and DP students. Log summatives and exams, see your 1–7 grade update instantly, set target grades, and sync deadlines from ManageBac.",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://academia-ib.vercel.app").replace(/\/$/, ""),
  locale: "en",
  /** Public contact address for privacy and support requests. Set NEXT_PUBLIC_CONTACT_EMAIL before launch. */
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? null,
  keywords: [
    "IB grade tracker",
    "IB grade calculator",
    "MYP grade calculator",
    "MYP criteria grades",
    "DP grade boundaries",
    "IB predicted grade",
    "ManageBac grades",
    "IB student planner",
  ],
} as const

export function absoluteUrl(path = "/") {
  return `${site.url}${path.startsWith("/") ? path : `/${path}`}`
}
