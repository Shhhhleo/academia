const BASE = "https://academia.invalid"

/**
 * Returns `next` only when it is a same-origin relative path; anything that could
 * redirect off-site (protocol-relative, backslash, encoded slashes, schemes,
 * control characters) falls back. Prevents open redirects after sign-in.
 */
export function safeNextPath(next: string | null | undefined, fallback = "/dashboard"): string {
  if (!next || !next.startsWith("/")) return fallback
  if (/[\u0000-\u001f\u007f\\]/.test(next)) return fallback
  if (next.startsWith("//")) return fallback

  let decoded: string
  try {
    decoded = decodeURIComponent(next)
  } catch {
    return fallback
  }
  if (decoded.startsWith("//") || /[\\\u0000-\u001f]/.test(decoded)) return fallback

  try {
    const url = new URL(next, BASE)
    if (url.origin !== BASE) return fallback
    // Dot-segments ("/..//evil.com") normalise to "//evil.com", which a later redirect would treat as off-site.
    if (url.pathname.startsWith("//") || url.pathname.startsWith("/\\")) return fallback
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return fallback
  }
}
