"use client"

import { useEffect, useState } from "react"
import { Cpu, FolderOpen, Loader2, RotateCw, Square } from "lucide-react"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress"
import { deviceSupport, generate, stopAi, type Support } from "@/lib/grader/ai/client"
import { allowFolder, canChooseFolder, chooseFolder, forgetFolder, modelDownloaded, savedFolder, type SavedFolder } from "@/lib/grader/ai/folder"
import type { Mark } from "@/lib/grader/ai/hosted"
import { buildMarkMessages, MARK_PREFILL, MARK_TOKENS, parseMark, workForMarking, type MarkInput } from "@/lib/grader/ai/prompt"
import { CHAT_MODEL_MB } from "@/lib/grader/ai/protocol"

/** Who marks the work: an open-source AI on a server, the same kind of AI in the student's browser, or the checklist alone. */
export type Marker = "hosted" | "device" | "checklist"

export const MARKERS: Record<Marker, { label: string; note: string }> = {
  hosted: {
    label: "AI marker",
    note: "An open-source AI reads your work and marks each criterion in a few seconds. Nothing to download. Your work is sent to Groq, the service that runs the AI, to be marked.",
  },
  device: {
    label: "On this device",
    note: `An open-source AI runs in your browser, so your work is marked on this device. It needs a laptop with a graphics chip and a one-time ${(CHAT_MODEL_MB / 1000).toFixed(1)} GB download, which only starts when you say so.`,
  },
  checklist: {
    label: "Checklist",
    note: "No AI. A quick estimate from what each criterion rewards. It can't judge how good your ideas are, so it can be a few marks out.",
  },
}

// Per-device choice. A marker that isn't offered here falls back to the best one that is.
const PREF = "academia.grader.marker"
export function readMarker(hostedAi: boolean): Marker {
  try {
    const saved = localStorage.getItem(PREF)
    if (saved === "device" || saved === "checklist" || (saved === "hosted" && hostedAi)) return saved
  } catch {}
  return hostedAi ? "hosted" : "checklist"
}
export function writeMarker(marker: Marker) {
  try {
    localStorage.setItem(PREF, marker)
  } catch {}
}

type Phase =
  | { kind: "starting" }
  | { kind: "loading"; loaded: number; total: number }
  /** On this device: which criterion, and the share of the work read so far. */
  | { kind: "marking"; id: string; read: number }
  | { kind: "done" }
  /** The hosted marker's free allowance is used up for now. */
  | { kind: "busy"; retryAfter: number }
  | { kind: "error"; message: string }

const mb = (bytes: number) => Math.round(bytes / 1_000_000).toLocaleString()

function friendly(message: string) {
  if (/memory|alloc|device (was )?lost|OOM/i.test(message)) return "The AI ran out of memory on this device. Close other tabs and try again."
  if (/fetch|network|load/i.test(message)) return "The AI model couldn't be downloaded. Check your connection and try again."
  return "The AI couldn't run on this device."
}

/**
 * Marks the work with the chosen marker. Use once per grade and marker (remount for the next).
 * `input` is null when there is nothing an AI can mark.
 */
export function useAiMarks(input: MarkInput | null, marker: Marker) {
  const [phase, setPhase] = useState<Phase>({ kind: "starting" })
  const [hosted, setHosted] = useState<Record<string, Mark>>({})
  const [attempt, setAttempt] = useState(0)

  // ── Hosted: one request, every criterion ──
  useEffect(() => {
    if (marker !== "hosted" || !input) return
    const abort = new AbortController()
    fetch("/api/grader/mark", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input), signal: abort.signal })
      .then(async (res) => {
        const json = await res.json().catch(() => null)
        if (abort.signal.aborted) return
        if (res.ok && json?.marks) {
          setHosted(json.marks)
          setPhase({ kind: "done" })
        } else if (res.status === 429) setPhase({ kind: "busy", retryAfter: Number(json?.retryAfter) || 60 })
        else setPhase({ kind: "error", message: res.status === 503 ? "The AI marker isn't switched on for this site yet." : "The AI marker couldn't mark this just now." })
      })
      .catch(() => {
        if (!abort.signal.aborted) setPhase({ kind: "error", message: "The AI marker couldn't be reached. Check your connection." })
      })
    return () => abort.abort()
  }, [marker, input, attempt])

  // ── On this device ──
  const [support, setSupport] = useState<Support | null>(null)
  /** The model's answer so far for each criterion it has started on. */
  const [replies, setReplies] = useState<Record<string, string>>({})
  /** The folder the student keeps the model in: null for the browser's own storage, undefined while that is being looked up. */
  const [folder, setFolder] = useState<SavedFolder | null | undefined>(undefined)
  // The browser may ask again before a chosen folder can be used, and only a click can answer it.
  const needsAccess = !!folder && !folder.granted
  /** The model is already on this device, so using it downloads nothing. Undefined while that is being looked up. */
  const [downloaded, setDownloaded] = useState<boolean | undefined>(undefined)
  /** The student clicked to start it during this grade, knowing what it downloads. */
  const [consent, setConsent] = useState(false)
  const [stopped, setStopped] = useState(false)
  // A download only ever follows a click: the AI starts by itself only when the model is already here.
  const running = marker === "device" && !stopped && (downloaded === true || consent) && !!support?.ok && !!input && folder !== undefined && !needsAccess

  const lookUp = async (next: SavedFolder | null) => {
    setFolder(next)
    setDownloaded(await modelDownloaded(next))
  }
  useEffect(() => {
    if (marker !== "device") return
    deviceSupport().then(setSupport)
    savedFolder().then(lookUp)
  }, [marker])

  useEffect(() => {
    if (!running || !input) return
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
  }, [running, input])

  const marks: Record<string, Mark> =
    marker === "hosted" ? hosted : Object.fromEntries((input?.criteria ?? []).flatMap((c) => (replies[c.id] === undefined ? [] : [[c.id, parseMark(replies[c.id], c.max)]])))

  return {
    marker,
    input,
    phase,
    marks,
    replies,
    /** An AI is marking this grade, or has, or tried to. */
    on: !!input && (marker === "hosted" || running),
    /** No more marks are coming. */
    settled: phase.kind === "done" || phase.kind === "busy" || phase.kind === "error",
    retry() {
      setPhase({ kind: "starting" })
      setAttempt((n) => n + 1)
    },
    support,
    folder,
    needsAccess,
    downloaded,
    async pickFolder() {
      const picked = await chooseFolder()
      if (picked) await lookUp(picked)
    },
    async allowFolder() {
      if (folder) await lookUp(await allowFolder(folder))
    },
    async keepInBrowser() {
      await forgetFolder()
      await lookUp(null)
    },
    /** The student's click, so it may download the model. */
    start() {
      setPhase({ kind: "starting" })
      setReplies({})
      setStopped(false)
      setConsent(true)
    },
    /** Stops a download or a mark in progress at once. */
    stop() {
      stopAi()
      setStopped(true)
      setConsent(false)
      setPhase({ kind: "starting" })
      setReplies({})
    },
  }
}
type Ai = ReturnType<typeof useAiMarks>

/** The marker choice, shown before the work is sent: a radio group with what the selected marker does with the work. */
export function MarkerChoice({ value, onChange, hostedAi }: { value: Marker; onChange: (marker: Marker) => void; hostedAi: boolean }) {
  const options = (Object.keys(MARKERS) as Marker[]).filter((m) => m !== "hosted" || hostedAi)
  return (
    <fieldset>
      <legend className="mb-1.5 block text-sm font-medium">Marked by</legend>
      <div className="grid gap-1 rounded-lg bg-muted p-1 sm:grid-flow-col sm:auto-cols-fr">
        {options.map((m) => (
          <label
            key={m}
            className={cn(
              "flex min-h-11 cursor-pointer items-center justify-center rounded-md px-3 text-center text-sm transition-colors has-focus-visible:ring-2 has-focus-visible:ring-ring",
              value === m ? "bg-card font-medium text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <input type="radio" name="marker" value={m} checked={value === m} onChange={() => onChange(m)} className="sr-only" />
            {MARKERS[m].label}
          </label>
        ))}
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground" aria-live="polite">
        {MARKERS[value].note}
      </p>
    </fieldset>
  )
}

/** Where the on-device model is kept, with the choice of a folder where the browser offers one (Chrome and Edge on a computer). */
function ModelPlace({ ai }: { ai: Ai }) {
  if (!canChooseFolder() || ai.folder === undefined) return null
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
      <span>
        {ai.folder ? (
          <>
            Kept in your folder <span className="font-medium text-foreground">{ai.folder.name}</span>.
          </>
        ) : (
          "Kept in your browser's storage, on the drive your browser is installed on."
        )}
      </span>
      <span className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={ai.pickFolder}>
          <FolderOpen aria-hidden="true" />
          {ai.folder ? "Change folder" : "Choose a folder instead"}
        </Button>
        {ai.folder && (
          <Button variant="ghost" size="sm" onClick={ai.keepInBrowser}>
            Use the browser&apos;s storage
          </Button>
        )}
      </span>
    </div>
  )
}

const Working = ({ children }: { children: string }) => (
  <p className="flex items-center gap-2 text-sm text-muted-foreground">
    <Loader2 className="size-4 shrink-0 animate-spin motion-reduce:animate-none" aria-hidden="true" />
    {children}
  </p>
)

/** What the marker is doing, and what the student can do about it. Sits inside the mark panel; renders nothing when there is nothing to say. */
export function MarkerStatus({ ai }: { ai: Ai }) {
  const { input, phase, marker } = ai
  if (!input || marker === "checklist") return null
  const fallback = "Until then, the marks here are checklist estimates."

  if (marker === "hosted") {
    if (phase.kind === "starting") return <Working>The AI marker is reading your work…</Working>
    if (phase.kind === "busy" || phase.kind === "error")
      return (
        <div className="grid gap-2" role="status">
          <p className="text-sm">
            {phase.kind === "busy"
              ? `The AI marker has used up its free allowance for the moment. Try again in ${phase.retryAfter >= 90 ? `${Math.round(phase.retryAfter / 60)} minutes` : "about a minute"}.`
              : phase.message}{" "}
            <span className="text-muted-foreground">{fallback}</span>
          </p>
          <Button variant="outline" className="w-fit" onClick={ai.retry}>
            <RotateCw aria-hidden="true" />
            Try the AI marker again
          </Button>
        </div>
      )
    return null
  }

  // On this device.
  if (ai.support === null || ai.folder === undefined || ai.downloaded === undefined) return <Working>Checking what this device can run…</Working>
  if (!ai.support.ok)
    return (
      <p className="text-sm">
        {ai.support.reason} <span className="text-muted-foreground">Choose another marker above the Grade button. The marks here are checklist estimates.</span>
      </p>
    )
  if (ai.needsAccess)
    return (
      <div className="grid gap-2">
        <p className="text-sm">
          Your browser needs your OK before it can use your model folder <span className="font-medium">{ai.folder?.name}</span> again. <span className="text-muted-foreground">{fallback}</span>
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={ai.allowFolder}>
            <FolderOpen aria-hidden="true" />
            Allow access
          </Button>
          <Button variant="ghost" onClick={ai.keepInBrowser}>
            Use the browser&apos;s storage
          </Button>
        </div>
      </div>
    )
  if (!ai.on)
    return (
      <div className="grid gap-3">
        <p className="text-sm">
          {ai.downloaded
            ? "The AI model is already on this device, so nothing more is downloaded."
            : `The AI on this device needs a one-time download of ${(CHAT_MODEL_MB / 1000).toFixed(1)} GB. Use Wi-Fi, and keep 3 GB of disk space free.`}{" "}
          <span className="text-muted-foreground">{fallback}</span>
        </p>
        <ModelPlace ai={ai} />
        <Button className="w-fit" onClick={ai.start}>
          <Cpu aria-hidden="true" />
          {ai.downloaded ? "Mark my work on this device" : `Download ${(CHAT_MODEL_MB / 1000).toFixed(1)} GB and mark my work`}
        </Button>
      </div>
    )

  const at = phase.kind === "marking" ? input.criteria.findIndex((c) => c.id === phase.id) : -1
  return (
    <div className="grid gap-3">
      {phase.kind === "loading" && (
        <Progress value={phase.total ? Math.round((phase.loaded / phase.total) * 100) : null}>
          <ProgressLabel>Downloading the AI model</ProgressLabel>
          <ProgressValue />
          <p className="w-full text-xs text-muted-foreground">
            {mb(phase.loaded)} of {mb(phase.total)} MB
          </p>
        </Progress>
      )}
      {phase.kind === "starting" && <Working>Getting the AI ready…</Working>}
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
          {phase.message} <span className="text-muted-foreground">Marks it didn&apos;t reach are checklist estimates.</span>
        </p>
      )}
      {!ai.settled && (
        <Button variant="outline" className="w-fit" onClick={ai.stop}>
          <Square aria-hidden="true" />
          {phase.kind === "loading" ? "Stop the download" : "Stop"}
        </Button>
      )}
      {workForMarking(input.text).cut && <p className="text-xs text-muted-foreground">Your work is long, so the AI reads its first 1,800 and last 600 words.</p>}
    </div>
  )
}
