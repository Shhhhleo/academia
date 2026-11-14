"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { ArrowRight } from "lucide-react"
import { DEFAULT_DP_BOUNDARIES, MYP_BOUNDARIES, mypGradeFromTotal, percentToGrade } from "@/lib/grades"
import { cn } from "@/lib/utils"

const CRITERIA = ["A", "B", "C", "D"] as const
const DP_PARTS = [
  { id: "p1", name: "Paper 1", weight: 40 },
  { id: "p2", name: "Paper 2", weight: 40 },
  { id: "ia", name: "Internal assessment", weight: 20 },
] as const

/** The landing page's signature: drag real criterion levels or scores and watch the real grade engine respond. */
export function GradeLab() {
  const [mode, setMode] = useState<"MYP" | "DP">("MYP")
  const [levels, setLevels] = useState<Record<(typeof CRITERIA)[number], number>>({ A: 6, B: 5, C: 7, D: 5 })
  const [parts, setParts] = useState<Record<(typeof DP_PARTS)[number]["id"], number>>({ p1: 68, p2: 74, ia: 85 })

  const result = useMemo(() => {
    if (mode === "MYP") {
      const total = CRITERIA.reduce((s, c) => s + levels[c], 0)
      return { grade: mypGradeFromTotal(total), value: total, max: 32, label: `${total}/32` }
    }
    const pct = DP_PARTS.reduce((s, p) => s + (parts[p.id] * p.weight) / 100, 0)
    return { grade: percentToGrade(pct, DEFAULT_DP_BOUNDARIES), value: pct, max: 100, label: `${pct.toFixed(1)}%` }
  }, [mode, levels, parts])

  const bands =
    mode === "MYP"
      ? [...MYP_BOUNDARIES].reverse().map((b, i, arr) => ({ grade: b.grade, from: b.min, to: (arr[i + 1]?.min ?? 33) - 1 }))
      : [...DEFAULT_DP_BOUNDARIES].reverse().map((b, i, arr) => ({ grade: b.grade, from: b.min, to: (arr[i + 1]?.min ?? 101) - 1 }))
  const span = mode === "MYP" ? 32 : 100

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
      <div className="rounded-[var(--radius-card)] border bg-card p-6 shadow-card sm:p-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <p className="text-sm font-medium text-muted-foreground">{mode === "MYP" ? "Criterion levels for one task" : "Your results by component"}</p>
          <div className="inline-flex rounded-lg border bg-muted p-0.5" role="group" aria-label="Programme">
            {(["MYP", "DP"] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                onClick={() => setMode(m)}
                className={cn(
                  "h-8 rounded-md px-3.5 text-sm font-semibold text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  mode === m && "bg-card text-foreground shadow-sm",
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          {mode === "MYP"
            ? CRITERIA.map((c) => (
                <Slider
                  key={c}
                  id={`lab-${c}`}
                  label={`Criterion ${c}`}
                  value={levels[c]}
                  max={8}
                  suffix="/8"
                  onChange={(v) => setLevels((l) => ({ ...l, [c]: v }))}
                />
              ))
            : DP_PARTS.map((p) => (
                <Slider
                  key={p.id}
                  id={`lab-${p.id}`}
                  label={`${p.name} · ${p.weight}%`}
                  value={parts[p.id]}
                  max={100}
                  suffix="%"
                  onChange={(v) => setParts((s) => ({ ...s, [p.id]: v }))}
                />
              ))}
        </div>
      </div>

      <div className="flex flex-col justify-center">
        <p className="text-sm font-medium text-muted-foreground">Your IB grade</p>
        <div className="mt-1 flex items-end gap-4" aria-live="polite" aria-atomic="true">
          <span key={result.grade} className="font-mono text-[clamp(6rem,14vw,10rem)] leading-none font-semibold tracking-tighter tabular motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95">
            {result.grade}
          </span>
          <span className="pb-4 font-mono text-2xl text-muted-foreground">/7</span>
          <span className="sr-only">
            Grade {result.grade} from {result.label}
          </span>
        </div>
        <p className="mt-2 font-mono text-sm tabular text-muted-foreground">
          {mode === "MYP" ? "Criteria total" : "Weighted score"} <span className="font-semibold text-foreground">{result.label}</span>
        </p>

        <div className="mt-8" aria-hidden="true">
          <div className="relative flex h-10 gap-0.5 overflow-hidden rounded-lg">
            {bands.map((b) => (
              <div
                key={b.grade}
                className={cn(
                  "grid place-items-center font-mono text-xs font-semibold transition-colors duration-300",
                  b.grade === result.grade ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                )}
                style={{ width: `${((b.to - b.from + 1) / (span + 1)) * 100}%` }}
              >
                {b.grade}
              </div>
            ))}
            <span
              className="absolute top-0 bottom-0 w-0.5 bg-foreground transition-[left] duration-300"
              style={{ left: `calc(${(result.value / span) * 100}% - 1px)` }}
            />
          </div>
          <div className="mt-1.5 flex justify-between font-mono text-[11px] text-muted-foreground tabular">
            <span>0</span>
            <span>{mode === "MYP" ? "32" : "100%"}</span>
          </div>
        </div>
        <p className="mt-6 max-w-md text-sm text-muted-foreground">
          {mode === "MYP"
            ? "MYP grades come from the four criterion levels added together and converted with the IB boundaries. In Academia, each criterion is combined across all your tasks."
            : "DP grades come from weighted components converted with grade boundaries. Academia lets you set the real boundaries for each subject."}
        </p>
        <Link href="/signup" className="mt-6 inline-flex h-11 w-fit items-center gap-2 rounded-[10px] bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none">
          Track your real grades <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  )
}

function Slider({ id, label, value, max, suffix, onChange }: { id: string; label: string; value: number; max: number; suffix: string; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        <span className="font-mono text-lg font-semibold tabular">
          {value}
          <span className="text-sm text-muted-foreground">{suffix}</span>
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-valuetext={`${value}${suffix === "%" ? " percent" : ` out of ${max}`}`}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-[var(--primary)] [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-card [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-md"
        style={{ background: `linear-gradient(90deg, var(--primary) ${(value / max) * 100}%, var(--muted) ${(value / max) * 100}%)` }}
      />
    </div>
  )
}
