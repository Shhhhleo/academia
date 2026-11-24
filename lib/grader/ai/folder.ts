// Lets the student keep the AI models in a folder they choose (for example on a second drive) instead of the browser's own
// storage, which sits on the drive the browser is installed on. Chrome and Edge on a computer only (File System Access API).
// Used by the page (choosing the folder) and the worker (reading and writing the models).

import { CHAT_MODEL } from "./protocol"

type Permission = "granted" | "denied" | "prompt"
/** A folder handle with the permission methods TypeScript's DOM types don't include yet. */
export type Folder = FileSystemDirectoryHandle & {
  queryPermission(options: { mode: "readwrite" }): Promise<Permission>
  requestPermission(options: { mode: "readwrite" }): Promise<Permission>
}

export interface SavedFolder {
  handle: Folder
  name: string
  /** The browser still lets this site use the folder; otherwise the student has to allow it again with a click. */
  granted: boolean
}

const DB = "academia-ai"
const STORE = "handles"
const KEY = "model-folder"

function store<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    const open = indexedDB.open(DB, 1)
    open.onupgradeneeded = () => open.result.createObjectStore(STORE)
    open.onerror = () => reject(open.error)
    open.onsuccess = () => {
      const request = run(open.result.transaction(STORE, mode).objectStore(STORE))
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    }
  })
}

const saved = async (handle: Folder): Promise<SavedFolder> => ({ handle, name: handle.name, granted: (await handle.queryPermission({ mode: "readwrite" })) === "granted" })

export const canChooseFolder = () => typeof window !== "undefined" && "showDirectoryPicker" in window

/** The folder the student chose earlier, or null: none chosen, or this browser can't do it. */
export async function savedFolder(): Promise<SavedFolder | null> {
  try {
    const handle = await store<Folder | undefined>("readonly", (s) => s.get(KEY))
    return handle ? await saved(handle) : null
  } catch {
    return null
  }
}

/** Opens the browser's folder picker (needs a click). Null if the student closes it without choosing. */
export async function chooseFolder(): Promise<SavedFolder | null> {
  const picker = window as unknown as { showDirectoryPicker(options: { id: string; mode: "readwrite" }): Promise<Folder> }
  let handle: Folder
  try {
    handle = await picker.showDirectoryPicker({ id: "academia-ai-models", mode: "readwrite" })
  } catch {
    return null
  }
  await store("readwrite", (s) => s.put(handle, KEY))
  // The copy in the browser's own storage is no longer used: free its space (it is what filled the first drive).
  await caches.delete("transformers-cache").catch(() => false)
  return saved(handle)
}

/** Asks the browser to let this site use the folder again (needs a click). */
export const allowFolder = async (folder: SavedFolder): Promise<SavedFolder> => ({ ...folder, granted: (await folder.handle.requestPermission({ mode: "readwrite" })) === "granted" })

/** Goes back to the browser's own storage. The files in the folder are left for the student to delete. */
export const forgetFolder = () => store("readwrite", (s) => s.delete(KEY))

/**
 * Whether the marking model is already on this device (in the chosen folder, or the browser's own storage),
 * so that using it downloads nothing. Its two large files are the last to arrive.
 */
export async function modelDownloaded(folder: SavedFolder | null): Promise<boolean> {
  const files = ["onnx/model_q4f16.onnx_data", "onnx/model_q4f16.onnx_data_1"].map((f) => `https://huggingface.co/${CHAT_MODEL}/resolve/main/${f}`)
  try {
    if (folder && !folder.granted) return false
    const cache = folder ? folderCache(folder.handle) : await caches.open("transformers-cache")
    return (await Promise.all(files.map((f) => cache.match(f)))).every(Boolean)
  } catch {
    return false
  }
}

/** Where a cached file lives inside the chosen folder: the address it was downloaded from, as folders. */
export function cachePath(key: string): string[] {
  const url = URL.canParse(key) ? new URL(key) : null
  const parts = (url ? `${url.host}${url.pathname}` : key).split("/")
  // Windows doesn't allow these characters in names; "." and ".." would step outside the folder.
  const safe = parts.map((p) => p.replace(/[<>:"|?*\\]/g, "_").trim()).filter((p) => p && p !== "." && p !== "..")
  return ["Academia AI models", ...safe]
}

/** The folder as the cache the AI library reads models from and saves them to (it asks for the Web Cache API's match and put). */
export function folderCache(root: FileSystemDirectoryHandle) {
  const key = (request: string | Request | URL) => (typeof request === "string" ? request : request instanceof URL ? request.href : request.url)
  return {
    async match(request: string | Request | URL): Promise<Response | undefined> {
      try {
        const parts = cachePath(key(request))
        const name = parts.pop()!
        let dir = root
        for (const p of parts) dir = await dir.getDirectoryHandle(p)
        const file = await (await dir.getFileHandle(name)).getFile()
        // An empty file is a download that never finished.
        return file.size ? new Response(file, { headers: { "content-length": String(file.size) } }) : undefined
      } catch {
        return undefined // not downloaded yet, or the folder can't be read
      }
    },
    async put(request: string | Request | URL, response: Response) {
      const parts = cachePath(key(request))
      const name = parts.pop()!
      let dir = root
      for (const p of parts) dir = await dir.getDirectoryHandle(p, { create: true })
      const file = await dir.getFileHandle(name, { create: true })
      // The browser writes to a temporary file and swaps it in on close, so a download that stops halfway leaves only the empty file made above.
      await response.body!.pipeTo(await file.createWritable()).catch(async (err) => {
        await dir.removeEntry(name).catch(() => {})
        throw err
      })
    },
  }
}
