"use client"

import Image from "next/image"
import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

const STEPS = [
  {
    title: "One dashboard for the whole year",
    body: "Your average, total points, the next deadline and every subject against its target, the moment you sign in.",
    src: "/media/screens/dashboard-light.png",
    alt: "Academia dashboard showing average grade 5.25, total points 42 of 56, a grade trend chart and current-versus-target bars for eight MYP subjects",
  },
  {
    title: "Every subject, down to the criterion",
    body: "See each MYP criterion out of 8, your history after every task, and exactly what you need next to reach your target.",
    src: "/media/screens/subject-light.png",
    alt: "Mathematics subject page with an estimated grade of 5, criteria A to D, a grade history chart and a next-step target card",
  },
  {
    title: "Deadlines from ManageBac, in your calendar",
    body: "Month, week and agenda views with assessments, ManageBac deadlines and your own study plans, colour-coded by subject.",
    src: "/media/screens/calendar-light.png",
    alt: "Calendar month view for November 2026 with colour-coded assessments and events, a mini month and subject toggles",
  },
]

/** Pinned product tour: the screen stays put while each step scrolls past and swaps it. */
export function ProductTour() {
  const [active, setActive] = useState(0)
  const refs = useRef<(HTMLLIElement | null)[]>([])

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.step))
      },
      { rootMargin: "-45% 0px -45% 0px" },
    )
    refs.current.forEach((el) => el && io.observe(el))
    return () => io.disconnect()
  }, [])

  return (
    <div className="grid gap-10 lg:grid-cols-[0.9fr_1.4fr] lg:gap-16">
      <ol className="space-y-[30vh] lg:py-[18vh]">
        {STEPS.map((s, i) => (
          <li key={s.title} data-step={i} ref={(el) => void (refs.current[i] = el)} className="scroll-mt-24">
            <h3 className={cn("text-2xl font-bold transition-colors duration-300 sm:text-3xl", active === i ? "text-foreground" : "text-muted-foreground/60")}>{s.title}</h3>
            <p className="mt-3 max-w-md text-base text-muted-foreground">{s.body}</p>
            <div className="mt-6 overflow-hidden rounded-xl border shadow-card lg:hidden">
              <Image src={s.src} alt={s.alt} width={2880} height={1800} sizes="100vw" className="h-auto w-full" />
            </div>
          </li>
        ))}
      </ol>
      <div className="hidden lg:block">
        <div className="sticky top-24">
          <div className="relative aspect-[16/10] overflow-hidden rounded-[14px] border bg-card shadow-[0_40px_80px_-40px_rgb(23_23_23/0.35)]">
            {STEPS.map((s, i) => (
              <Image
                key={s.src}
                src={s.src}
                alt={active === i ? s.alt : ""}
                aria-hidden={active !== i}
                fill
                sizes="(min-width: 1024px) 60vw, 100vw"
                className={cn("object-cover object-top transition-opacity duration-500", active === i ? "opacity-100" : "opacity-0")}
                priority={i === 0}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
