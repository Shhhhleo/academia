// Messages between the page and the on-device AI worker.

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string }

export type WorkerRequest =
  | { id: number; type: "embed"; texts: string[] }
  /** `prefill` is the start of the model's answer, written for it; the reply continues from there. */
  | { id: number; type: "generate"; messages: ChatMessage[]; prefill: string; maxTokens: number }
  /** Stops the generate request with this id, running or still queued. */
  | { id: number; type: "cancel" }

export type WorkerResponse =
  | { id: number; type: "progress"; loaded: number; total: number }
  /** How much of the prompt the model has read, in tokens. */
  | { id: number; type: "reading"; done: number; total: number }
  | { id: number; type: "token"; text: string }
  | { id: number; type: "done"; vectors?: number[][] }
  | { id: number; type: "error"; message: string }

// Open-source models (Apache-2.0), downloaded once from Hugging Face and cached by the browser.
export const EMBED_MODEL = "Xenova/all-MiniLM-L6-v2"
/** The marker. Its only browser build (q4f16) needs a graphics chip with half-precision support. */
export const CHAT_MODEL = "onnx-community/Qwen3-4B-ONNX"
/** Download size of the chat model, shown before the student opts in. */
export const CHAT_MODEL_MB = 2833
