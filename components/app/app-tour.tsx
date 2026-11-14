"use client"

import { useRouter } from "next/navigation"
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  BookOpen,
  CalendarRange,
  ChartLine,
  Check,
  Link2,
  Plus,
  Search,
  Sparkles,
  Sunrise,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { TOUR_START_EVENT, padRect, placeCard, tourStorageKey, type Placement, type Rect } from "@/lib/tour"
import { cn } from "@/lib/utils"
import { useShell } from "./shell-context"

interface StepContext {
  firstName: string
  hasSubjects: boolean
  programme: string
}

interface TourStep {
  id: string
  icon: LucideIcon
  title: (ctx: StepContext) => string
  body: (ctx: StepContext) => ReactNode
  /** `data-tour` values to highlight; the first visible one wins. None = centred card. */
  targets?: string[]
  /** Shown when only a fallback target (not the first one) is visible, e.g. on phones. */
  fallbackNote?: string
  placement?: Placement
  /** Skip the step entirely when none of its targets is visible. */
  optional?: boolean
}

const MOBILE_MENU_NOTE = "On a phone, tap the menu button to open these pages."

const STEPS: TourStep[] = [
  {
    id: "welcome",
    icon: Sparkles,
    title: ({ firstName }) => (firstName ? `Welcome to Academia, ${firstName}` : "Welcome to Academia"),
    body: () => (
      <>
        Academia turns every summative and exam you get back into a live IB grade for each subject. This one-minute tour
        shows you where everything is. You can replay it any time from your account menu.
      </>
    ),
  },
  {
    id: "workspace",
    icon: BookOpen,
    title: () => "Your workspace",
    body: () => (
      <>
        <strong className="font-medium text-foreground">My Subjects</strong> is where you add your classes, so start
        there. <strong className="font-medium text-foreground">Assessments</strong> lists every graded task,{" "}
        <strong className="font-medium text-foreground">Calendar</strong> shows your deadlines, and the{" "}
        <strong className="font-medium text-foreground">Dashboard</strong> pulls it all together.
      </>
    ),
    targets: ["nav-workspace", "mobile-menu"],
    fallbackNote: MOBILE_MENU_NOTE,
    placement: "right",
  },
  {
    id: "quick-add",
    icon: Plus,
    title: () => "Add a grade in seconds",
    body: ({ programme }) => (
      <>
        Got a task back? Press this button, or <Kbd>N</Kbd> anywhere. Pick the subject and enter{" "}
        {programme === "DP" ? "your score and its weight" : "your criterion levels (A–D, out of 8)"}. That
        subject&apos;s grade, trend and goals update straight away.
      </>
    ),
    targets: ["quick-add"],
    placement: "left",
  },
  {
    id: "plan",
    icon: Sunrise,
    title: () => "Plan your week",
    body: () => (
      <>
        The <strong className="font-medium text-foreground">Daily Brief</strong> sums up what&apos;s due next.{" "}
        <strong className="font-medium text-foreground">Study Log</strong> times your revision and keeps your streak
        going. <strong className="font-medium text-foreground">To-do</strong> and{" "}
        <strong className="font-medium text-foreground">Reminders</strong> handle everything else.
      </>
    ),
    targets: ["nav-plan", "mobile-menu"],
    fallbackNote: MOBILE_MENU_NOTE,
    placement: "right",
  },
  {
    id: "insights",
    icon: ChartLine,
    title: () => "See where you stand",
    body: () => (
      <>
        The <strong className="font-medium text-foreground">Grade Calculator</strong> answers &ldquo;what do I need on the
        next test?&rdquo; <strong className="font-medium text-foreground">Goals</strong> track your target grades, and{" "}
        <strong className="font-medium text-foreground">Analytics</strong> shows how each subject is trending.
      </>
    ),
    targets: ["nav-insights", "mobile-menu"],
    fallbackNote: MOBILE_MENU_NOTE,
    placement: "right",
  },
  {
    id: "connect",
    icon: Link2,
    title: () => "Bring in ManageBac",
    body: () => (
      <>
        Paste your ManageBac calendar link and Academia imports your deadlines and matches them to your subjects. Google
        Calendar works too, in both directions. Academia never asks for your ManageBac password.
      </>
    ),
    targets: ["nav-connect", "mobile-menu"],
    fallbackNote: MOBILE_MENU_NOTE,
    placement: "right",
  },
  {
    id: "search",
    icon: Search,
    title: () => "Find anything",
    body: () => (
      <>
        Search your subjects, assessments and pages from here. Press <Kbd>Ctrl K</Kbd> (<Kbd>⌘K</Kbd> on a Mac) or{" "}
        <Kbd>/</Kbd> to jump straight to it.
      </>
    ),
    targets: ["search"],
    placement: "bottom",
  },
  {
    id: "year",
    icon: CalendarRange,
    title: () => "Switch academic years",
    body: () => <>Each school year keeps its own subjects and grades. Pick an earlier year here to look back at it.</>,
    targets: ["year"],
    placement: "bottom",
    optional: true,
  },
  {
    id: "notifications",
    icon: Bell,
    title: () => "Stay in the loop",
    body: () => <>Grade changes, reminders and ManageBac syncs show up here.</>,
    targets: ["notifications"],
    placement: "bottom",
  },
  {
    id: "account",
    icon: UserRound,
    title: () => "Make it yours",
    body: () => (
      <>
        Open <strong className="font-medium text-foreground">Settings</strong> from here to set your programme, theme,
        accent colour and density, or to export your data. <strong className="font-medium text-foreground">Take the tour</strong>{" "}
        replays this guide.
      </>
    ),
    targets: ["account"],
    placement: "bottom",
  },
  {
    id: "done",
    icon: Check,
    title: () => "You're all set",
    body: ({ hasSubjects }) =>
      hasSubjects ? (
        <>Log each grade as it comes back and Academia keeps every subject up to date. Good luck this term!</>
      ) : (
        <>
          Start by adding your subjects. Then log each grade as it comes back, and Academia keeps everything up to date.
        </>
      ),
  },
]

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border bg-muted px-1 py-px font-mono text-[11px] text-foreground/80">{children}</kbd>
  )
}

function isVisible(el: Element) {
  const r = el.getBoundingClientRect()
  if (r.width === 0 && r.height === 0) return false
  const style = getComputedStyle(el)
  return style.visibility !== "hidden" && style.display !== "none"
}

/** Returns the first visible element for the step's targets, with its index in `targets`. */
function findTarget(step: TourStep): { el: Element; index: number } | null {
  if (!step.targets) return null
  for (const [index, id] of step.targets.entries()) {
    for (const el of document.querySelectorAll(`[data-tour="${id}"]`)) {
      if (isVisible(el)) return { el, index }
    }
  }
  return null
}

function readSeen(userId: string) {
  try {
    return localStorage.getItem(tourStorageKey(userId)) !== null
  } catch {
    // Storage blocked: don't auto-start on every page load.
    return true
  }
}

function writeSeen(userId: string) {
  try {
    localStorage.setItem(tourStorageKey(userId), new Date().toISOString())
  } catch {}
}

interface Layout {
  rect: Rect | null
  fallback: boolean
  vw: number
  vh: number
  cw: number
  ch: number
  /** Ids of optional steps with nothing to highlight on this screen. */
  skipped: string
}

const sameLayout = (a: Layout | null, b: Layout) =>
  !!a &&
  a.fallback === b.fallback &&
  a.vw === b.vw &&
  a.vh === b.vh &&
  a.cw === b.cw &&
  a.ch === b.ch &&
  a.skipped === b.skipped &&
  (a.rect === b.rect ||
    (!!a.rect &&
      !!b.rect &&
      a.rect.top === b.rect.top &&
      a.rect.left === b.rect.left &&
      a.rect.width === b.rect.width &&
      a.rect.height === b.rect.height))

const SPOT_PAD = 6

/**
 * First-run guided tour of the app shell. Starts once per account (remembered in
 * this browser) and again whenever `startTour()` is called. While it is open the
 * rest of the app is made inert by <AppShell>.
 */
export function AppTour({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { profile, subjects } = useShell()
  const router = useRouter()
  const [index, setIndex] = useState(0)
  const [layout, setLayout] = useState<Layout | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const primaryRef = useRef<HTMLButtonElement>(null)
  const returnFocus = useRef<Element | null>(null)
  const titleId = useId()
  const bodyId = useId()

  const begin = useCallback(() => {
    returnFocus.current = document.activeElement
    setIndex(0)
    setLayout(null)
    onOpenChange(true)
  }, [onOpenChange])

  const finish = useCallback(() => {
    writeSeen(profile.id)
    onOpenChange(false)
    const back = returnFocus.current
    requestAnimationFrame(() => {
      if (back instanceof HTMLElement && back.isConnected && back !== document.body) back.focus()
      else document.getElementById("main")?.focus()
    })
  }, [onOpenChange, profile.id])

  // Auto-start for accounts that haven't seen the tour in this browser; listen for replays.
  useEffect(() => {
    const onStart = () => begin()
    window.addEventListener(TOUR_START_EVENT, onStart)
    const timer = readSeen(profile.id) ? undefined : window.setTimeout(begin, 700)
    return () => {
      window.removeEventListener(TOUR_START_EVENT, onStart)
      window.clearTimeout(timer)
    }
  }, [begin, profile.id])

  /** Next/previous step index, skipping optional steps whose target isn't on screen. */
  const step = useCallback(
    (from: number, dir: 1 | -1) => {
      let i = from + dir
      while (i > 0 && i < STEPS.length - 1 && STEPS[i].optional && !findTarget(STEPS[i])) i += dir
      return Math.max(0, Math.min(i, STEPS.length - 1))
    },
    [],
  )

  const current = STEPS[index]
  const isLast = index === STEPS.length - 1

  const go = useCallback(
    (dir: 1 | -1) => {
      if (dir === 1 && index === STEPS.length - 1) return finish()
      setIndex((i) => step(i, dir))
    },
    [finish, index, step],
  )

  // Track the highlighted element and the card size every frame while open, so the
  // spotlight follows scrolling, resizing and the sidebar collapsing.
  useEffect(() => {
    if (!open) return
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    let found = findTarget(STEPS[index])
    if (found) {
      const r = found.el.getBoundingClientRect()
      if (r.top < 64 || r.bottom > window.innerHeight - 16) {
        found.el.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" })
      }
    }
    let frame = 0
    const tick = () => {
      if (found && !found.el.isConnected) found = findTarget(STEPS[index])
      const r = found?.el.getBoundingClientRect()
      const next: Layout = {
        rect: r ? { top: r.top, left: r.left, width: r.width, height: r.height } : null,
        fallback: !!found && found.index > 0,
        vw: window.innerWidth,
        vh: window.innerHeight,
        cw: cardRef.current?.offsetWidth ?? 0,
        ch: cardRef.current?.offsetHeight ?? 0,
        skipped: STEPS.filter((s) => s.optional && !findTarget(s))
          .map((s) => s.id)
          .join(","),
      }
      setLayout((prev) => (sameLayout(prev, next) ? prev : next))
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [open, index])

  // Move focus into the card on every step so keyboard and screen-reader users follow along.
  useEffect(() => {
    if (open) primaryRef.current?.focus({ preventScroll: true })
  }, [open, index])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        e.stopPropagation()
        finish()
      } else if (e.key === "ArrowRight") {
        e.preventDefault()
        go(1)
      } else if (e.key === "ArrowLeft") {
        e.preventDefault()
        go(-1)
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        // Keep the app's search shortcut from firing behind the tour.
        e.preventDefault()
        e.stopPropagation()
      }
    }
    window.addEventListener("keydown", onKey, true)
    return () => window.removeEventListener("keydown", onKey, true)
  }, [open, finish, go])

  if (!open) return null

  const ctx: StepContext = {
    firstName: profile.display_name.trim().split(/\s+/)[0] ?? "",
    hasSubjects: subjects.length > 0,
    programme: profile.programme,
  }
  const spot = layout?.rect ? padRect(layout.rect, SPOT_PAD) : null
  const measured = !!layout && layout.cw > 0
  const pos = measured
    ? placeCard(spot, { width: layout.cw, height: layout.ch }, { width: layout.vw, height: layout.vh }, current.placement)
    : null
  const Icon = current.icon
  // Count only steps that will actually be shown on this screen (the year picker is hidden on phones).
  const skipped = layout?.skipped.split(",") ?? []
  const visibleSteps = STEPS.filter((s) => !skipped.includes(s.id))
  const position = visibleSteps.indexOf(current) + 1

  return createPortal(
    <div className="fixed inset-0 z-[60]" data-tour-overlay="">
      {/* Click shield: the app underneath is inert while the tour is open. */}
      <div className={cn("absolute inset-0", !spot && "bg-black/55 dark:bg-black/65")} aria-hidden="true" />
      {spot && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute rounded-xl ring-2 ring-primary shadow-[0_0_0_9999px_rgb(0_0_0/0.55)] motion-safe:transition-[top,left,width,height] motion-safe:duration-200 motion-safe:ease-out dark:shadow-[0_0_0_9999px_rgb(0_0_0/0.65)]"
          style={{ top: spot.top, left: spot.left, width: spot.width, height: spot.height }}
        />
      )}

      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className={cn(
          "absolute w-[min(22rem,calc(100vw-2rem))] rounded-xl border bg-popover p-5 text-popover-foreground shadow-2xl",
          "motion-safe:transition-[top,left,opacity] motion-safe:duration-200 motion-safe:ease-out",
          pos ? "opacity-100" : "opacity-0",
        )}
        style={{ top: pos?.top ?? 0, left: pos?.left ?? 0 }}
      >
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary" aria-hidden="true">
            <Icon className="size-[18px]" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[11px] tracking-wide text-muted-foreground tabular">
              {position} of {visibleSteps.length}
            </p>
            <h2 id={titleId} className="font-display text-base leading-snug font-semibold">
              {current.title(ctx)}
            </h2>
          </div>
          <button
            type="button"
            onClick={finish}
            className="-mt-1 -mr-1 grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            aria-label="Close tour"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div id={bodyId} className="mt-3 text-sm leading-relaxed text-muted-foreground">
          <p>{current.body(ctx)}</p>
          {layout?.fallback && current.fallbackNote && <p className="mt-2 text-xs">{current.fallbackNote}</p>}
        </div>

        <div className="mt-4 flex items-center gap-1" aria-hidden="true">
          {visibleSteps.map((s) => (
            <span
              key={s.id}
              className={cn(
                "h-1 rounded-full motion-safe:transition-all motion-safe:duration-200",
                s === current ? "w-5 bg-primary" : "w-1.5 bg-border",
              )}
            />
          ))}
        </div>

        <div className="mt-4 flex items-center gap-2">
          {!isLast && (
            <Button variant="ghost" size="sm" onClick={finish} className="-ml-2 text-muted-foreground">
              Skip tour
            </Button>
          )}
          <div className="ml-auto flex items-center gap-2">
            {index > 0 && (
              <Button variant="outline" size="lg" onClick={() => go(-1)} aria-label="Previous step">
                <ArrowLeft aria-hidden="true" /> Back
              </Button>
            )}
            {isLast && !ctx.hasSubjects ? (
              <Button
                size="lg"
                ref={primaryRef}
                onClick={() => {
                  finish()
                  router.push("/subjects")
                }}
              >
                Add your subjects <ArrowRight aria-hidden="true" />
              </Button>
            ) : (
              <Button size="lg" ref={primaryRef} onClick={() => go(1)}>
                {index === 0 ? "Show me around" : isLast ? "Finish" : "Next"}
                {!isLast && <ArrowRight aria-hidden="true" />}
              </Button>
            )}
          </div>
        </div>

        <p className="sr-only" aria-live="polite">
          Step {position} of {visibleSteps.length}: {current.title(ctx)}
        </p>
      </div>
    </div>,
    document.body,
  )
}
