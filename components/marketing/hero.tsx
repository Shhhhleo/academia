"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import MetroHero from "@/components/ui/scroll-locked-video-hero"

export function Hero() {
  return (
    <MetroHero
      videoSrc="/media/hero.mp4"
      mobileVideoSrc="/media/hero-mobile.mp4"
      poster="/media/hero-poster.webp"
      mobilePoster="/media/hero-mobile-poster.webp"
      title="Know exactly where you stand."
      scrollHint="SCROLL"
      tagline="Every grade. Every criterion. One clear picture of your IB year."
      skipTo="statement"
      scrubDistance={2600}
      actions={
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/signup"
            className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-white px-5 text-sm font-semibold text-[#0b0c10] transition-transform hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Get started free <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <Link
            href="/login"
            className="inline-flex h-11 items-center rounded-[10px] border border-white/25 bg-white/5 px-5 text-sm font-semibold text-white backdrop-blur hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Log in
          </Link>
        </div>
      }
    />
  )
}
