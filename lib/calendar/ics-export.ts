export type ExportItem =
  | { uid: string; title: string; allDay: true; date: string; /** Inclusive last day of a multi-day event. */ endDate?: string | null; description?: string | null }
  | { uid: string; title: string; allDay: false; start: string; end: string | null; description?: string | null }

/** RFC 5545 TEXT escaping (a lone CR counts as a line break, so it can't start a new property). */
export function escapeText(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r\n|\r|\n/g, "\\n")
}

/** Folds a content line to 75 octets with CRLF + space continuation. */
export function foldLine(line: string) {
  const bytes = new TextEncoder().encode(line)
  if (bytes.length <= 75) return line
  const out: string[] = []
  let chunk = ""
  let size = 0
  for (const ch of line) {
    const n = new TextEncoder().encode(ch).length
    const limit = out.length === 0 ? 75 : 74
    if (size + n > limit) {
      out.push(chunk)
      chunk = ""
      size = 0
    }
    chunk += ch
    size += n
  }
  out.push(chunk)
  return out.map((c, i) => (i === 0 ? c : ` ${c}`)).join("\r\n")
}

const utc = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")
const dateOnly = (d: string) => d.replace(/-/g, "")
const nextDay = (d: string) => new Date(Date.parse(`${d}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10)

export function buildIcs({ name, stamp, items }: { name: string; stamp: string; items: ExportItem[] }) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Academia//IB Grade Tracker//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(name)}`,
    "X-PUBLISHED-TTL:PT6H",
    "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
  ]
  for (const it of items) {
    lines.push("BEGIN:VEVENT", `UID:${it.uid}@academia`, `DTSTAMP:${utc(stamp)}`)
    if (it.allDay) {
      const last = it.endDate && it.endDate > it.date ? it.endDate : it.date
      lines.push(`DTSTART;VALUE=DATE:${dateOnly(it.date)}`, `DTEND;VALUE=DATE:${dateOnly(nextDay(last))}`)
    } else {
      const end = it.end ?? new Date(Date.parse(it.start) + 30 * 60_000).toISOString()
      lines.push(`DTSTART:${utc(it.start)}`, `DTEND:${utc(end)}`)
    }
    lines.push(`SUMMARY:${escapeText(it.title)}`)
    if (it.description) lines.push(`DESCRIPTION:${escapeText(it.description)}`)
    lines.push("END:VEVENT")
  }
  lines.push("END:VCALENDAR")
  return lines.map(foldLine).join("\r\n") + "\r\n"
}
