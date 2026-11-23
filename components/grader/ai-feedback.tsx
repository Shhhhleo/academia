"use client"

import { useEffect, useState } from "react"
import { Cpu, Loader2, Target, ThumbsUp, TrendingUp, type LucideIcon } from "lucide-react"
import { Panel } from "@/components/app/page-header"
import { Button } from "@/components/ui/button"
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress"
import { deviceSupport, generateFeedback, type Support } from "@/lib/grader/ai/client"
import { buildFeedbackMessages, feedbackTokens, parseFeedback, type FeedbackInput } from "@/lib/grader/ai/prompt"
import { CHAT_MODEL_MB } from "@/lib/grader/ai/protocol"

// Per-device choice: the model download is large, so it only happens after the student opts in.
const PREF = "academia.grader.ai"
function readPref() {
  try {
    return localStorage.getItem(PREF) === "on"
  } catch {
    return false
  }
}
function writePref(on: boolean) {
  try {
    if (on) localStorage.setItem(PREF, "on")
    else localStorage.removeItem(PREF)
  } catch {}
}

type Phase =
  | { kind: "reading" }
  | { kind: "loading"; loaded: number; total: number }
  | { kind: "writing" }
  | { kind: "done" }
  | { kind: "error"; message: string }

const mb = (bytes: number) => Math.round(bytes / 1_000_000).toLocaleString()

function friendly(message: string) {
  if (/memory|alloc|device (was )?lost|OOM/i.test(message)) return "The on-device AI ran out of memory on this device. Close other tabs and try again; the grade above still stands."
  if (/fetch|network|load/i.test(message)) return "The AI model couldn't be downloaded. Check your connection and grade again; the grade above still stands."
  return "The on-device AI couldn't run on this device. The grade above still stands."
}

function Row({ icon: Icon, tone, term, text }: { icon: LucideIcon; tone: string; term: string; text: string }) {
  return (
    <div className="flex gap-2.5">
      <Icon className={`mt-0.5 size-4 shrink-0 ${tone}`} aria-hidden="true" />
      <div>
        <dt className="font-medium">{term}</dt>
        <dd>{text}</dd>
      </div>
    </div>
  )
}

/** The model's answer as a card per criterion, or as plain text while it doesn't follow the layout. */
function FeedbackText({ text }: { text: string }) {
  const parsed = parseFeedback(text)
  if (!parsed) return <div className="text-sm leading-relaxed whitespace-pre-wrap">{text.trim()}</div>
  return (
    <div className="grid gap-3">
      {parsed.blocks.map((b, i) => (
        <div key={i} className="rounded-lg border p-3">
          {b.title && <p className="mb-2.5 text-sm font-semibold">{b.title}</p>}
          <dl className="grid gap-2.5 text-sm leading-relaxed">
            {b.strength && <Row icon={ThumbsUp} tone="text-success-text" term="Strength" text={b.strength} />}
            {b.improve && <Row icon={TrendingUp} tone="text-primary" term="Improve" text={b.improve} />}
          </dl>
        </div>
      ))}
      {parsed.next && (
        <p className="flex gap-2.5 rounded-lg bg-primary/10 p-3 text-sm leading-relaxed">
          <Target className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          <span>
            <span className="font-semibold">Next step: </span>
            {parsed.next}
          </span>
        </p>
      )}
    </div>
  )
}

/** Feedback written about this piece by an open-source model running in the browser. Mounted once per grade. */
export function AiFeedback({ input }: { input: FeedbackInput }) {
  const [support, setSupport] = useState<Support | null>(null)
  const [enabled, setEnabled] = useState(readPref)
  const [phase, setPhase] = useState<Phase>({ kind: "reading" })
  const [text, setText] = useState("")

  useEffect(() => {
    deviceSupport().then(setSupport)
  }, [])

  useEffect(() => {
    if (!enabled || !support?.ok) return
    let cancelled = false
    const fp16 = support.fp16
    let writing = false
    generateFeedback(buildFeedbackMessages(input), feedbackTokens(input.criteria.length), fp16, {
      progress: (loaded, total) => {
        if (!cancelled) setPhase(loaded >= total ? { kind: "reading" } : { kind: "loading", loaded, total })
      },
      token: (piece) => {
        if (cancelled) return
        if (!writing) {
          writing = true
          setPhase({ kind: "writing" })
        }
        setText((s) => s + piece)
      },
    })
      .then(() => !cancelled && setPhase({ kind: "done" }))
      .catch((err: Error) => {
        console.error("grader: on-device AI failed", err)
        if (!cancelled) setPhase({ kind: "error", message: friendly(err.message) })
      })
    return () => {
      cancelled = true
    }
  }, [enabled, support, input])

  function turnOff() {
    writePref(false)
    setEnabled(false)
  }

  return (
    <Panel title="Detailed feedback" description="Written by a free, open-source AI running on this device. Your work never leaves your computer.">
      {support === null ? (
        <p className="text-sm text-muted-foreground">Checking whether this device can run the AI…</p>
      ) : !support.ok ? (
        <p className="text-sm text-muted-foreground">{support.reason} The grade above is from the standard grader.</p>
      ) : !enabled ? (
        <div className="grid gap-3">
          <p className="text-sm">
            Get feedback written about your own work, criterion by criterion, from SmolLM2: an open-source AI that runs on your device. No account and no cost.
          </p>
          <p className="text-xs text-muted-foreground">
            The first time, your browser downloads the model (about {(CHAT_MODEL_MB / 1000).toFixed(1)} GB, so use Wi-Fi) and keeps it for next time. Feedback then takes about a minute.
          </p>
          <Button
            className="w-fit"
            onClick={() => {
              writePref(true)
              setEnabled(true)
            }}
          >
            <Cpu className="size-4" aria-hidden="true" />
            Turn on on-device AI
          </Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {phase.kind === "loading" && (
            <Progress value={phase.total ? Math.round((phase.loaded / phase.total) * 100) : null}>
              <ProgressLabel>Downloading the AI model (first time only)</ProgressLabel>
              <ProgressValue />
              <p className="w-full text-xs text-muted-foreground">
                {mb(phase.loaded)} of {mb(phase.total)} MB
              </p>
            </Progress>
          )}
          {phase.kind === "reading" && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Reading your work…
            </p>
          )}
          {text && <FeedbackText text={text} />}
          {phase.kind === "error" && (
            <p role="alert" className="text-sm text-destructive">
              {phase.message}
            </p>
          )}
          {(phase.kind === "done" || phase.kind === "error") && (
            <p className="text-xs text-muted-foreground">
              A small AI can make mistakes, so check its suggestions against your work; the scores above come from the grader.{" "}
              <button type="button" onClick={turnOff} className="underline underline-offset-2">
                Turn off on-device AI
              </button>
            </p>
          )}
        </div>
      )}
    </Panel>
  )
}
