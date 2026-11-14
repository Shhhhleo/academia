import type { FeedUrlResult } from "@/lib/managebac/feed-url"

/**
 * Validates Google Calendar's "Secret address in iCal format" before the server fetches it (SSRF guard):
 * https only, host exactly calendar.google.com, path /calendar/ical/…/*.ics, no credentials or custom port.
 */
export function normalizeGoogleFeedUrl(input: string): FeedUrlResult {
  const raw = input.trim()
  if (!raw) return { ok: false, error: "Paste the secret iCal address from Google Calendar first." }
  let url: URL
  try {
    url = new URL(raw.replace(/^webcal:\/\//i, "https://"))
  } catch {
    return { ok: false, error: "That doesn’t look like a link. Copy it again from Google Calendar settings." }
  }
  if (url.protocol === "http:") url.protocol = "https:"
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) {
    return { ok: false, error: "That link can’t be used. Copy the https:// secret address from Google Calendar." }
  }
  if (url.hostname.toLowerCase() !== "calendar.google.com") {
    return { ok: false, error: "That link isn’t from Google Calendar. It should start with https://calendar.google.com/calendar/ical/." }
  }
  if (!/^\/calendar\/ical\/[^/]+\/[^/]+\/[^/]+\.ics$/i.test(url.pathname)) {
    return { ok: false, error: "Use the “Secret address in iCal format” (it ends in .ics), not the page address." }
  }
  url.hash = ""
  return { ok: true, url: url.toString(), host: "calendar.google.com" }
}
