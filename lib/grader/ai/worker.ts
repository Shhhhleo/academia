// Runs open-source models on the student's device (Web Worker), so the page stays responsive and nothing leaves the browser.
import { env, InterruptableStoppingCriteria, pipeline, TextStreamer, type DynamicCache } from "@huggingface/transformers"
import { folderCache, savedFolder } from "./folder"
import { CHAT_MODEL, EMBED_MODEL, type WorkerRequest, type WorkerResponse } from "./protocol"

env.allowLocalModels = false
// Development only: load the models from another host (for example a local copy) instead of Hugging Face, without caching them.
const modelHost = process.env.NEXT_PUBLIC_AI_MODEL_HOST
if (modelHost) {
  env.remoteHost = modelHost
  env.remotePathTemplate = "{model}/"
  env.useBrowserCache = false
}

const ctx = self as unknown as { postMessage(message: WorkerResponse): void; onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null }

const loadEmbedder = () => pipeline("feature-extraction", EMBED_MODEL, { dtype: "q8" })
let embedder: ReturnType<typeof loadEmbedder> | undefined

// Download progress goes to whichever request is waiting for the model.
let progressId = 0
const loadGenerator = () =>
  pipeline("text-generation", CHAT_MODEL, {
    dtype: "q4f16",
    device: "webgpu",
    progress_callback: (p) => {
      if (p.status === "progress_total") ctx.postMessage({ id: progressId, type: "progress", loaded: p.loaded, total: p.total })
    },
  })
let generator: ReturnType<typeof loadGenerator> | undefined

// The model scores its whole vocabulary for every token it is fed, so a long prompt read in one pass overflows a 4 GB graphics card.
const READ_CHUNK = 256

// One request at a time: the GPU session can't run two generations at once.
let queue: Promise<void> = Promise.resolve()

// Requests the page no longer wants (the student graded again or left): skipped if queued, stopped if running.
const cancelled = new Set<number>()
const stopper = new InterruptableStoppingCriteria()

ctx.onmessage = (event) => {
  const req = event.data
  if (req.type === "cancel") {
    cancelled.add(req.id)
    if (req.id === progressId) stopper.interrupt()
    return
  }
  queue = queue.then(() => handle(req))
}

/** Models are kept in the folder the student chose, when there is one and the browser still allows it; otherwise in the browser's own storage. */
async function applyChosenFolder() {
  const folder = await savedFolder()
  env.useCustomCache = !!folder?.granted
  env.customCache = folder?.granted ? folderCache(folder.handle) : null
}

async function handle(req: Exclude<WorkerRequest, { type: "cancel" }>) {
  try {
    await applyChosenFolder()
    if (req.type === "embed") {
      embedder ??= loadEmbedder()
      const embed = await embedder
      const out = await embed(req.texts, { pooling: "mean", normalize: true })
      ctx.postMessage({ id: req.id, type: "done", vectors: out.tolist() as number[][] })
      return
    }
    progressId = req.id
    stopper.reset()
    if (cancelled.has(req.id)) return ctx.postMessage({ id: req.id, type: "done" })
    generator ??= loadGenerator()
    // A failed load (for example a dropped download) is retried by the next request.
    const { model, tokenizer } = await generator.catch((err) => {
      generator = undefined
      throw err
    })
    const prompt = tokenizer.apply_chat_template(req.messages, { add_generation_prompt: true, tokenize: false }) as string
    const { input_ids, attention_mask } = tokenizer(prompt + req.prefill, { add_special_tokens: false })
    const total: number = input_ids.dims[1]
    // The model's memory of what it has read so far, kept on the GPU and extended by each call.
    let past: DynamicCache | null = null
    try {
      for (let end = READ_CHUNK; end < total && !cancelled.has(req.id); end += READ_CHUNK) {
        const read = (await model.generate({
          input_ids: input_ids.slice(null, [0, end]),
          attention_mask: attention_mask.slice(null, [0, end]),
          past_key_values: past,
          max_new_tokens: 1,
          do_sample: false,
          return_dict_in_generate: true,
        })) as unknown as { past_key_values: DynamicCache }
        past = read.past_key_values
        ctx.postMessage({ id: req.id, type: "reading", done: end, total })
      }
      // A cancelled request stops here: writing now would read the rest of the prompt in one pass.
      if (!cancelled.has(req.id)) {
        const streamer = new TextStreamer(tokenizer, {
          skip_prompt: true,
          skip_special_tokens: true,
          callback_function: (text: string) => ctx.postMessage({ id: req.id, type: "token", text }),
        })
        const written = (await model.generate({
          input_ids,
          attention_mask,
          past_key_values: past,
          stopping_criteria: stopper,
          max_new_tokens: req.maxTokens,
          do_sample: false,
          repetition_penalty: 1.1,
          streamer,
          return_dict_in_generate: true,
        })) as unknown as { past_key_values: DynamicCache }
        past = written.past_key_values
      }
    } finally {
      await past?.dispose()
    }
    ctx.postMessage({ id: req.id, type: "done" })
  } catch (err) {
    // Let the next request try loading again (for example after a dropped download).
    if (req.type === "embed") embedder = undefined
    ctx.postMessage({ id: req.id, type: "error", message: err instanceof Error ? err.message : String(err) })
  }
}
