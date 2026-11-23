// Messages between the page and the on-device AI worker.

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string }

export type WorkerRequest =
  | { id: number; type: "embed"; texts: string[] }
  | { id: number; type: "generate"; messages: ChatMessage[]; maxTokens: number; fp16: boolean }

export type WorkerResponse =
  | { id: number; type: "progress"; loaded: number; total: number }
  | { id: number; type: "token"; text: string }
  | { id: number; type: "done"; vectors?: number[][] }
  | { id: number; type: "error"; message: string }

// Open-source models (Apache-2.0), downloaded once from Hugging Face and cached by the browser.
export const EMBED_MODEL = "Xenova/all-MiniLM-L6-v2"
export const CHAT_MODEL = "HuggingFaceTB/SmolLM2-1.7B-Instruct"
/** Download size of the chat model's q4f16 build, shown before the student opts in. */
export const CHAT_MODEL_MB = 1057
