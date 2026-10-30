const ALLOWED_SUFFIXES = ["managebac.com", "managebac.cn"]

export type FeedUrlResult = { ok: true; url: string; host: string } | { ok: false; error: string }

export function isAllowedHost(host: string) {
  const h = host.toLowerCase().replace(/\.$/, "")
  return ALLOWED_SUFFIXES.some((s) => h === s || h.endsWith(`.${s}`))
}

/**
 * Validates a pasted ManageBac calendar link before the server ever fetches it (SSRF guard):
 * https only (webcal/http are upgraded), ManageBac hosts only, default port, no credentials.
 */
export function normalizeFeedUrl(input: string): FeedUrlResult {
  const raw = input.trim()
  if (!raw) return { ok: false, error: "Paste the calendar link from ManageBac first." }

  let url: URL
  try {
    url = new URL(raw.replace(/^webcal:\/\//i, "https://"))
  } catch {
    return { ok: false, error: "That doesn’t look like a link. Copy it again from ManageBac → Calendar → Subscribe." }
  }

  if (url.protocol === "http:") url.protocol = "https:"
  if (url.protocol !== "https:") return { ok: false, error: "Only https:// or webcal:// ManageBac links are supported." }
  if (url.username || url.password) return { ok: false, error: "Links with a username or password aren’t allowed." }
  if (url.port && url.port !== "443") return { ok: false, error: "That link uses an unusual port, so it can’t be a ManageBac calendar." }
  if (!isAllowedHost(url.hostname)) {
    return { ok: false, error: "That link isn’t from ManageBac. It should end in managebac.com (or managebac.cn)." }
  }
  url.hash = ""
  return { ok: true, url: url.toString(), host: url.hostname.toLowerCase() }
}

/** Safe to show in the UI: host only, never the private token in the path. */
export function maskFeedHost(host: string | null) {
  return host ? `${host}/…/•••••.ics` : null
}
