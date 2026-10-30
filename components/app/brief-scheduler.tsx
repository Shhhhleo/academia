"use client"

import { useRouter } from "next/navigation"
import { useEffect, useRef } from "react"
import { toast } from "sonner"
import { syncTimezone } from "@/lib/data/planner-actions"

interface Props {
  enabled: boolean
  /** HH:MM[:SS] in the student's time zone */
  time: string
  timezone: string
  reminders: { id: string; title: string; remind_at: string }[]
}

const SHOWN_KEY = "academia:brief-shown"
const REMINDED_KEY = "academia:reminded"

function nowIn(timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date())
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00"
  return { day: `${get("year")}-${get("month")}-${get("day")}`, hm: `${get("hour")}:${get("minute")}` }
}

function notify(title: string, body: string, onClick: () => void) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return
  try {
    const n = new Notification(title, { body, icon: "/icon.svg", tag: title })
    n.onclick = () => {
      window.focus()
      onClick()
      n.close()
    }
  } catch {
    // Some browsers only allow notifications from a service worker; the toast still shows.
  }
}

/** While Academia is open, shows the daily brief at the chosen time and fires due reminders. */
export function BriefScheduler({ enabled, time, timezone, reminders }: Props) {
  const router = useRouter()
  const tzSynced = useRef(false)

  useEffect(() => {
    // First visit: adopt the browser's time zone so "today", streaks and the brief time are local.
    if (tzSynced.current || timezone !== "UTC") return
    tzSynced.current = true
    const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (browserTz && browserTz !== "UTC") void syncTimezone(browserTz).then(() => router.refresh())
  }, [timezone, router])

  useEffect(() => {
    const check = () => {
      let zone = timezone
      try {
        nowIn(zone)
      } catch {
        zone = "UTC"
      }
      const { day, hm } = nowIn(zone)

      if (enabled && hm >= time.slice(0, 5)) {
        let shown = ""
        try {
          shown = localStorage.getItem(SHOWN_KEY) ?? ""
        } catch {}
        if (shown !== day) {
          try {
            localStorage.setItem(SHOWN_KEY, day)
          } catch {}
          const open = () => router.push("/brief")
          toast("Your daily brief is ready", { description: "Reminders, tasks and assessments for the next few days.", action: { label: "Open", onClick: open }, duration: 10_000 })
          notify("Your daily brief is ready", "Tap to see what’s coming up.", open)
        }
      }

      let reminded: string[] = []
      try {
        reminded = JSON.parse(localStorage.getItem(REMINDED_KEY) ?? "[]")
      } catch {}
      const now = Date.now()
      const due = reminders.filter((r) => {
        const t = new Date(r.remind_at).getTime()
        return t <= now && now - t < 6 * 3_600_000 && !reminded.includes(r.id)
      })
      if (due.length) {
        for (const r of due) {
          const open = () => router.push("/reminders")
          toast(`Reminder: ${r.title}`, { action: { label: "View", onClick: open }, duration: 15_000 })
          notify("Academia reminder", r.title, open)
        }
        try {
          localStorage.setItem(REMINDED_KEY, JSON.stringify([...reminded, ...due.map((r) => r.id)].slice(-200)))
        } catch {}
      }
    }
    check()
    const t = setInterval(check, 20_000)
    return () => clearInterval(t)
  }, [enabled, time, timezone, reminders, router])

  return null
}
