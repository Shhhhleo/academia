"use client"

import { useMemo, useSyncExternalStore } from "react"

export interface StopwatchState {
  running: boolean
  /** Epoch ms when the current run started (null while paused). */
  runStartedAt: number | null
  /** Time banked from previous runs. */
  accumulatedMs: number
  /** Epoch ms of the very first start, kept for the logged session. */
  firstStartedAt: number | null
  subjectId: string
}

const KEY = "academia:stopwatch"
const EVENT = "academia:stopwatch"
export const EMPTY: StopwatchState = { running: false, runStartedAt: null, accumulatedMs: 0, firstStartedAt: null, subjectId: "" }

function read() {
  try {
    return localStorage.getItem(KEY) ?? ""
  } catch {
    return ""
  }
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb)
  window.addEventListener("storage", cb)
  return () => {
    window.removeEventListener(EVENT, cb)
    window.removeEventListener("storage", cb)
  }
}

export function writeStopwatch(next: StopwatchState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {}
  window.dispatchEvent(new Event(EVENT))
}

/** Stopwatch state persisted in localStorage so it survives navigation, refreshes and other tabs. */
export function useStopwatchState(): StopwatchState {
  const raw = useSyncExternalStore(subscribe, read, () => "")
  return useMemo(() => {
    if (!raw) return EMPTY
    try {
      return { ...EMPTY, ...(JSON.parse(raw) as Partial<StopwatchState>) }
    } catch {
      return EMPTY
    }
  }, [raw])
}

export function elapsedMs(s: StopwatchState, now: number) {
  return s.accumulatedMs + (s.running && s.runStartedAt ? Math.max(0, now - s.runStartedAt) : 0)
}

export function formatClock(ms: number) {
  const total = Math.floor(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const sec = total % 60
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${pad(h)}:${pad(m)}:${pad(sec)}`
}
