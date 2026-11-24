// Browser side of the on-device AI. Import only from client components.
import { chunkText, cosine } from "./meaning"
import type { ChatMessage, WorkerRequest, WorkerResponse } from "./protocol"

type Request = WorkerRequest extends infer R ? (R extends WorkerRequest ? Omit<R, "id"> : never) : never

let worker: Worker | undefined
let nextId = 1
const listeners = new Map<number, (message: WorkerResponse) => void>()

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" })
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => listeners.get(event.data.id)?.(event.data)
  }
  return worker
}

function call(req: Request, onMessage?: (message: WorkerResponse) => void, signal?: AbortSignal) {
  const id = nextId++
  signal?.addEventListener("abort", () => worker?.postMessage({ id, type: "cancel" }), { once: true })
  return new Promise<Extract<WorkerResponse, { type: "done" }>>((resolve, reject) => {
    listeners.set(id, (message) => {
      if (message.type === "done") resolve(message)
      else if (message.type === "error") reject(new Error(message.message))
      else return onMessage?.(message)
      listeners.delete(id)
    })
    getWorker().postMessage({ ...req, id } as WorkerRequest)
  })
}

/** Stops everything the on-device AI is doing at once, a download included, by shutting its worker down. The next request starts a new one. */
export function stopAi() {
  worker?.terminate()
  worker = undefined
  for (const listener of [...listeners.values()]) listener({ id: 0, type: "error", message: "stopped" })
  listeners.clear()
}

export type Support = { ok: true } | { ok: false; reason: string }

/** Whether this device can run the on-device marking model (WebGPU with half precision, and enough memory). */
export async function deviceSupport(): Promise<Support> {
  type Adapter = { features: ReadonlySet<string> }
  const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<Adapter | null> } }).gpu
  if (!gpu) return { ok: false, reason: "This browser can't run the on-device AI: it needs WebGPU, which up-to-date Chrome, Edge, Safari and Firefox have." }
  const adapter = await gpu.requestAdapter().catch(() => null)
  if (!adapter) return { ok: false, reason: "This device's graphics chip isn't available to the browser, so the on-device AI can't run here." }
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
  if (memory !== undefined && memory < 8) return { ok: false, reason: "This device has too little memory for the on-device AI." }
  // The model's only browser build stores its numbers in half precision.
  if (!adapter.features.has("shader-f16")) return { ok: false, reason: "This device's graphics chip is too old for the on-device AI." }
  return { ok: true }
}

/**
 * Best similarity in meaning between the task and any paragraph of the work, from the small meaning model.
 * Null if it can't run in time; grading then falls back to matching the task's words.
 */
export async function matchTask(task: string, text: string, timeoutMs = 20_000): Promise<number | null> {
  const chunks = chunkText(text)
  if (!task.trim() || !chunks.length) return null
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs))
  const run = call({ type: "embed", texts: [task.trim(), ...chunks] }).then(({ vectors }) => {
    const [taskVector, ...rest] = vectors ?? []
    return taskVector && rest.length ? Math.max(...rest.map((v) => cosine(taskVector, v))) : null
  })
  return Promise.race([run, timeout]).catch(() => null)
}

/**
 * Streams the on-device model's answer, which continues `prefill`. The first run downloads the model (progress in bytes);
 * then it reads the prompt (reading, in tokens) and writes (token). Aborting `signal` stops it.
 */
export function generate(
  messages: ChatMessage[],
  prefill: string,
  maxTokens: number,
  on: { progress?: (loaded: number, total: number) => void; reading?: (done: number, total: number) => void; token?: (text: string) => void },
  signal?: AbortSignal,
) {
  return call(
    { type: "generate", messages, prefill, maxTokens },
    (message) => {
      if (message.type === "progress") on.progress?.(message.loaded, message.total)
      else if (message.type === "reading") on.reading?.(message.done, message.total)
      else if (message.type === "token") on.token?.(message.text)
    },
    signal,
  )
}
