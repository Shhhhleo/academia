"use client"

import { useEffect } from "react"

/** Applies the profile's accent and density to <html> and caches them for the pre-paint script in the root layout. */
export function PrefsSync({ accent, density }: { accent: string; density: string }) {
  useEffect(() => {
    const el = document.documentElement
    if (accent && accent !== "indigo") el.dataset.accent = accent
    else delete el.dataset.accent
    if (density === "compact") el.dataset.density = "compact"
    else delete el.dataset.density
    try {
      localStorage.setItem("academia:prefs", JSON.stringify({ accent, density }))
    } catch {}
  }, [accent, density])
  return null
}
