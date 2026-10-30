import { useSyncExternalStore } from "react"

const noopSubscribe = () => () => {}

/** false during SSR and hydration, true after; avoids hydration mismatches for client-only values (theme, storage). */
export function useMounted() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  )
}

/** Current minute as a number (null on the server); re-renders once a minute. */
export function useMinuteClock() {
  return useSyncExternalStore(
    (cb) => {
      const t = setInterval(cb, 30_000)
      return () => clearInterval(t)
    },
    () => Math.floor(Date.now() / 60_000),
    () => null,
  )
}
