import "server-only"
import { normalizeFeedUrl } from "./feed-url"

const MAX_BYTES = 2 * 1024 * 1024
const MAX_REDIRECTS = 3
const TIMEOUT_MS = 10_000

export class FeedError extends Error {}

/**
 * Fetches a ManageBac iCal feed. Every hop (including redirects) is re-validated
 * against the ManageBac host allow-list, the response is capped at 2 MB, and the
 * whole request times out after 10 s.
 */
export async function fetchFeed(initialUrl: string): Promise<string> {
  let url = initialUrl
  const signal = AbortSignal.timeout(TIMEOUT_MS)

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const checked = normalizeFeedUrl(url)
    if (!checked.ok) throw new FeedError(checked.error)

    let res: Response
    try {
      res = await fetch(checked.url, {
        redirect: "manual",
        signal,
        cache: "no-store",
        headers: { Accept: "text/calendar, text/plain;q=0.9", "User-Agent": "Academia-Calendar-Sync/1.0" },
      })
    } catch (e) {
      throw new FeedError(
        e instanceof Error && e.name === "TimeoutError" ? "ManageBac took too long to respond. Try again shortly." : "We couldn’t reach ManageBac.",
      )
    }

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location")
      if (!location) throw new FeedError("ManageBac sent an invalid redirect.")
      url = new URL(location, checked.url).toString()
      continue
    }
    if (res.status === 401 || res.status === 403 || res.status === 404) {
      throw new FeedError("ManageBac rejected the link. It may have been reset. Copy a fresh one from ManageBac.")
    }
    if (!res.ok) throw new FeedError(`ManageBac responded with an error (${res.status}).`)

    const declared = Number(res.headers.get("content-length") ?? 0)
    if (declared > MAX_BYTES) throw new FeedError("That calendar is too large to import.")
    if (!res.body) throw new FeedError("ManageBac returned an empty calendar.")

    const reader = res.body.getReader()
    const chunks: Uint8Array[] = []
    let size = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > MAX_BYTES) {
        await reader.cancel()
        throw new FeedError("That calendar is too large to import.")
      }
      chunks.push(value)
    }
    const text = new TextDecoder().decode(Buffer.concat(chunks))
    if (!text.includes("BEGIN:VCALENDAR")) throw new FeedError("That link didn’t return a calendar. Check you copied the subscribe link.")
    return text
  }
  throw new FeedError("Too many redirects from ManageBac.")
}
