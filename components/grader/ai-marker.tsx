"use client"

import { useEffect, useState } from "react"
import { Cpu, Loader2 } from "lucide-react"
import { Panel } from "@/components/app/page-header"
import { Button } from "@/components/ui/button"
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress"
import { deviceSupport, generate, type Support } from "@/lib/grader/ai/client"
import { buildMarkMessages, MARK_PREFILL, MARK_TOKENS, workForMarking, type MarkInput } from "@/lib/grader/ai/prompt"
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
  | { kind: "starting" }
  | { kind: "loading"; loaded: number; total: number }
  /** `read` is the share of the work the model has read so far. */
  | { kind: "marking"; id: string; read: number }
  | { kind: "done" }
  | { kind: "error"; message: string }

const mb = (bytes: number) => Math.round(bytes / 1_000_000).toLocaleString()

function friendly(message: string) {
  if (/memory|alloc|device (was )?lost|OOM/i.test(message)) return "The on-device AI ran out of memory on this device. Close other tabs and try again."
  if (/fetch|network|load/i.test(message)) return "The AI model couldn't be downloaded. Check your connection and grade again."
  return "The on-device AI couldn't run on this device."
}

/**
 * Marks the work criterion by criterion with an open-source model running in the browser.
 * Use once per grade (remount for the next one). `input` is null when there is nothing the AI can mark.
 */
export function useAiMarks(input: MarkInput | null) {
  const [support, setSupport] = useState<Support | null>(null)
  const [enabled, setEnabled] = useState(readPref)
  const [phase, setPhase] = useState<Phase>({ kind: "starting" })
  /** The model's answer so far for each criterion it has started on. */
  const [replies, setReplies] = useState<Record<string, string>>({})

  useEffect(() => {
    deviceSupport().then(setSupport)
  }, [])

  useEffect(() => {
    if (!enabled || !support?.ok || !input) return
    // Aborting also tells the worker to stop, so the next grade isn't queued behind this one.
    const abort = new AbortController()
    const run = async () => {
      for (const c of input.criteria) {
        if (abort.signal.aborted) return
        let text = ""
        const on: Parameters<typeof generate>[3] = {
          progress: (loaded, total) => {
            if (!abort.signal.aborted) setPhase(loaded >= total ? { kind: "starting" } : { kind: "loading", loaded, total })
          },
          reading: (done, total) => {
            if (!abort.signal.aborted) setPhase({ kind: "marking", id: c.id, read: done / total })
          },
          token: (piece) => {
            if (abort.signal.aborted) return
            text += piece
            setReplies((r) => ({ ...r, [c.id]: text }))
          },
        }
        await generate(buildMarkMessages(input, c), MARK_PREFILL, MARK_TOKENS, on, abort.signal)
      }
      if (!abort.signal.aborted) setPhase({ kind: "done" })
    }
    run().catch((err: Error) => {
      console.error("grader: on-device AI failed", err)
      if (!abort.signal.aborted) setPhase({ kind: "error", message: friendly(err.message) })
    })
    return () => abort.abort()
  }, [enabled, support, input])

  const on = enabled && !!support?.ok && !!input
  return {
    input,
    support,
    enabled,
    phase,
    replies,
    /** The AI is marking this grade, or has. */
    on,
    /** No more answers are coming. */
    settled: phase.kind === "done" || phase.kind === "error",
    setEnabled(next: boolean) {
      writePref(next)
      // Turning it back on marks again from the start.
      setPhase({ kind: "starting" })
      setReplies({})
      setEnabled(next)
    },
  }
}

/** The on-device AI's opt-in, progress and caveats. */
export function AiPanel({ ai }: { ai: ReturnType<typeof useAiMarks> }) {
  const { input, support, phase } = ai
  if (!input) return null
  const at = phase.kind === "marking" ? input.criteria.findIndex((c) => c.id === phase.id) : -1
  return (
    <Panel title="AI marking" description="By a free, open-source AI that reads your work on this device.">
      {support === null ? (
        <p className="text-sm text-muted-foreground">Checking whether this device can run the AI…</p>
      ) : !support.ok ? (
        <p className="text-sm text-muted-foreground">{support.reason} The marks here are estimates from a checklist of what each criterion rewards.</p>
      ) : !ai.enabled ? (
        <div className="grid gap-3">
          <p className="text-sm">
            Have your work read and marked against each criterion by Qwen3, an open-source AI that runs on your device. No account and no cost. The marks here are estimates from a checklist until you turn it on.
          </p>
          <p className="text-xs text-muted-foreground">
            The first time, your browser downloads the model (about {(CHAT_MODEL_MB / 1000).toFixed(1)} GB, so use Wi-Fi and keep 3 GB of disk space free) and keeps it for next time. After that, each mark takes about a minute on a laptop with a graphics chip, and its comment a few minutes more for long work.
          </p>
          <Button className="w-fit" onClick={() => ai.setEnabled(true)}>
            <Cpu className="size-4" aria-hidden="true" />
            Turn on AI marking
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
          {phase.kind === "starting" && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Getting the AI ready…
            </p>
          )}
          {phase.kind === "marking" && (
            <Progress value={Math.round(phase.read * 100)}>
              <ProgressLabel>
                Criterion {phase.id}: {ai.replies[phase.id] === undefined ? "reading your work" : "writing its comment"}
              </ProgressLabel>
              <span className="ml-auto text-sm text-muted-foreground tabular-nums">
                {at + 1} of {input.criteria.length}
              </span>
            </Progress>
          )}
          {phase.kind === "error" && (
            <p role="alert" className="text-sm text-destructive">
              {phase.message} Marks the AI didn&apos;t reach are estimates from the checklist.
            </p>
          )}
          {workForMarking(input.text).cut && <p className="text-xs text-muted-foreground">Your work is long, so the AI reads its first 1,800 and last 600 words.</p>}
          {ai.settled && (
            <p className="text-xs text-muted-foreground">
              An AI this size is often a mark or two out, so use its marks as a guide and check its comments against your work.{" "}
              <button type="button" onClick={() => ai.setEnabled(false)} className="underline underline-offset-2">
                Turn off AI marking
              </button>
            </p>
          )}
        </div>
      )}
    </Panel>
  )
}
