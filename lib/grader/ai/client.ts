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

function call(req: Request, onMessage?: (message: WorkerResponse) => void) {
  const id = nextId++
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

export type Support = { ok: true; fp16: boolean } | { ok: false; reason: string }

/** Whether this device can run the on-device feedback model (WebGPU and enough memory). */
export async function deviceSupport(): Promise<Support> {
  type Adapter = { features: ReadonlySet<string> }
  const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<Adapter | null> } }).gpu
  if (!gpu) return { ok: false, reason: "This browser can't run the on-device AI: it needs WebGPU, which up-to-date Chrome, Edge, Safari and Firefox have." }
  const adapter = await gpu.requestAdapter().catch(() => null)
  if (!adapter) return { ok: false, reason: "This device's graphics chip isn't available to the browser, so the on-device AI can't run here." }
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
  if (memory !== undefined && memory < 4) return { ok: false, reason: "This device has too little memory for the on-device AI." }
  return { ok: true, fp16: adapter.features.has("shader-f16") }
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

/** Streams feedback from the on-device model; the first run downloads it (progress in bytes). */
export function generateFeedback(
  messages: ChatMessage[],
  maxTokens: number,
  fp16: boolean,
  on: { progress?: (loaded: number, total: number) => void; token?: (text: string) => void },
) {
  return call({ type: "generate", messages, maxTokens, fp16 }, (message) => {
    if (message.type === "progress") on.progress?.(message.loaded, message.total)
    else if (message.type === "token") on.token?.(message.text)
  })
}
