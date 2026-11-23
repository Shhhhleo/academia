// Runs open-source models on the student's device (Web Worker), so the page stays responsive and nothing leaves the browser.
import { env, pipeline, TextStreamer } from "@huggingface/transformers"
import { CHAT_MODEL, EMBED_MODEL, type WorkerRequest, type WorkerResponse } from "./protocol"

env.allowLocalModels = false

const ctx = self as unknown as { postMessage(message: WorkerResponse): void; onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null }

const loadEmbedder = () => pipeline("feature-extraction", EMBED_MODEL, { dtype: "q8" })
let embedder: ReturnType<typeof loadEmbedder> | undefined

// Download progress goes to whichever request is waiting for the model.
let progressId = 0
const loadGenerator = (fp16: boolean) =>
  pipeline("text-generation", CHAT_MODEL, {
    // q4f16 needs GPU half-precision support; plain q4 works everywhere WebGPU does.
    dtype: fp16 ? "q4f16" : "q4",
    device: "webgpu",
    progress_callback: (p) => {
      if (p.status === "progress_total") ctx.postMessage({ id: progressId, type: "progress", loaded: p.loaded, total: p.total })
    },
  })
let generator: ReturnType<typeof loadGenerator> | undefined

// One request at a time: the GPU session can't run two generations at once.
let queue: Promise<void> = Promise.resolve()

ctx.onmessage = (event) => {
  const req = event.data
  queue = queue.then(() => handle(req))
}

async function handle(req: WorkerRequest) {
  try {
    if (req.type === "embed") {
      embedder ??= loadEmbedder()
      const embed = await embedder
      const out = await embed(req.texts, { pooling: "mean", normalize: true })
      ctx.postMessage({ id: req.id, type: "done", vectors: out.tolist() as number[][] })
      return
    }
    progressId = req.id
    generator ??= loadGenerator(req.fp16)
    const generate = await generator
    const streamer = new TextStreamer(generate.tokenizer, {
      skip_prompt: true,
      skip_special_tokens: true,
      callback_function: (text: string) => ctx.postMessage({ id: req.id, type: "token", text }),
    })
    await generate(req.messages, { max_new_tokens: req.maxTokens, do_sample: false, repetition_penalty: 1.1, streamer })
    ctx.postMessage({ id: req.id, type: "done" })
  } catch (err) {
    // Let the next request try loading again (for example after a dropped download).
    if (req.type === "embed") embedder = undefined
    else generator = undefined
    ctx.postMessage({ id: req.id, type: "error", message: err instanceof Error ? err.message : String(err) })
  }
}
