"use client"

import dynamic from "next/dynamic"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

const PolishedShader = dynamic(() => import("@/components/ui/old-television-shader"), { ssr: false })

/** The close: a dark band over the shader that resolves the page with one action. */
export function CtaBand() {
  return (
    <section aria-labelledby="cta-h" className="relative isolate overflow-hidden bg-[#0b0c10] text-white">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(60%_80%_at_50%_100%,rgba(79,70,229,0.45),transparent_70%)]" aria-hidden="true" />
      <PolishedShader colorA="#0b0c10" colorB="#2f2a8a" glow={0.05} speed={0.4} grain={0.15} className="-z-10 opacity-70" />
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-8 px-4 py-28 sm:px-6 sm:py-36">
        <h2 id="cta-h" className="max-w-3xl text-[clamp(2.25rem,5vw,4rem)] leading-[1.02] font-extrabold">
          Your next summative is coming. Know what it needs to be.
        </h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/signup"
            className="inline-flex h-12 items-center gap-2 rounded-[10px] bg-white px-6 text-base font-semibold text-[#0b0c10] transition-transform hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Get started free <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <Link href="/guides/ib-grading" className="inline-flex h-12 items-center rounded-[10px] border border-white/25 px-6 text-base font-semibold text-white hover:bg-white/10">
            Read the grading guide
          </Link>
        </div>
      </div>
    </section>
  )
}
