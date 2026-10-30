"use client"

import dynamic from "next/dynamic"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

const PolishedShader = dynamic(() => import("@/components/ui/old-television-shader"), { ssr: false })

const PALETTES = {
  light: { colorA: "#fbfbf9", colorB: "#e3e6fd", glow: 0.04 },
  dark: { colorA: "#0e0f13", colorB: "#1f1d4a", glow: 0.02 },
} as const

/** Theme-aware shader with a static gradient underneath (shown while WebGL loads or if it is unavailable). */
export function ShaderBackground({ className }: { className?: string }) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const palette = PALETTES[mounted && resolvedTheme === "dark" ? "dark" : "light"]

  return (
    <div aria-hidden="true" className={cn("pointer-events-none absolute inset-0 -z-10", className)}>
      <div className="absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_0%,var(--primary-soft),transparent_70%),radial-gradient(60%_50%_at_100%_100%,color-mix(in_oklab,var(--lavender)_25%,transparent),transparent_70%)]" />
      {mounted && <PolishedShader {...palette} speed={0.35} grain={0.12} className="opacity-80" />}
    </div>
  )
}
