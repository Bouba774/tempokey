/**
 * Native Android folder picker (Storage Access Framework).
 *
 * On the web this module is inert — callers must gate with
 * `isAndroidNative()` from "./permissions" before invoking any of these.
 *
 * Bridged to `TempoKeyFolderPicker.java` :
 *   - pickFolder()  → ACTION_OPEN_DOCUMENT_TREE + takePersistableUriPermission
 *   - listAudio()   → DocumentFile recursive scan
 *   - readFile()    → openInputStream(content://) + base64
 *   - savedFolders / forgetFolder → SharedPreferences-backed
 */

export interface NativeAudioEntry {
  uri: string;
  name: string;
  relativePath: string;
  size: number;
  mime: string;
}

export interface NativeScanResult {
  entries: NativeAudioEntry[];
  scanned: number;
  found: number;
  ignored?: number;
}

interface ScanProgressEvent {
  scanned: number;
  found: number;
}

interface FolderPickerPlugin {
  pickFolder(): Promise<{ treeUri: string; name: string }>;
  listAudio(args: { treeUri: string }): Promise<NativeScanResult>;
  readFile(args: { uri: string; offset?: number; length?: number }): Promise<{ base64: string }>;
  savedFolders(): Promise<{ folders: string[] }>;
  forgetFolder(args: { treeUri: string }): Promise<void>;
  addListener(
    event: "scanProgress",
    cb: (e: ScanProgressEvent) => void,
  ): Promise<{ remove: () => Promise<void> }>;
}

async function getPlugin(): Promise<FolderPickerPlugin | null> {
  if (typeof window === "undefined") return null;
  try {
    const cap = await import("@capacitor/core").catch(() => null);
    if (!cap?.Capacitor?.isNativePlatform?.()) return null;
    if (cap.Capacitor.getPlatform?.() !== "android") return null;
    return (cap.registerPlugin as <T>(n: string) => T)<FolderPickerPlugin>(
      "TempoKeyFolderPicker",
    );
  } catch {
    return null;
  }
}

export async function isNativeFolderPickerAvailable(): Promise<boolean> {
  return (await getPlugin()) !== null;
}

export async function pickNativeFolder(): Promise<{ treeUri: string; name: string }> {
  const p = await getPlugin();
  if (!p) throw new Error("UNSUPPORTED_PLATFORM");
  return p.pickFolder();
}

export async function listNativeAudio(
  treeUri: string,
  onProgress?: (e: ScanProgressEvent) => void,
): Promise<NativeScanResult> {
  const p = await getPlugin();
  if (!p) throw new Error("UNSUPPORTED_PLATFORM");
  let sub: { remove: () => Promise<void> } | null = null;
  if (onProgress) {
    try {
      sub = await p.addListener("scanProgress", onProgress);
    } catch {
      sub = null;
    }
  }
  try {
    return await p.listAudio({ treeUri });
  } finally {
    if (sub) {
      try {
        await sub.remove();
      } catch {}
    }
  }
}

export async function readNativeFile(
  uri: string,
  offset?: number,
  length?: number,
): Promise<ArrayBuffer> {
  const p = await getPlugin();
  if (!p) throw new Error("UNSUPPORTED_PLATFORM");
  const { base64 } = await p.readFile({ uri, offset, length });
  return base64ToArrayBuffer(base64);
}

export async function getSavedFolders(): Promise<string[]> {
  const p = await getPlugin();
  if (!p) return [];
  try {
    const { folders } = await p.savedFolders();
    return folders ?? [];
  } catch {
    return [];
  }
}

export async function forgetNativeFolder(treeUri: string): Promise<void> {
  const p = await getPlugin();
  if (!p) return;
  try {
    await p.forgetFolder({ treeUri });
  } catch {}
}

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const len = bin.length;
  const out = new Uint8Array(len);
  for (let i = 0; i < len; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

/**
 * Wraps a native audio entry into a File-like object compatible with the
 * existing analysis pipeline (uses `arrayBuffer()` and `slice().arrayBuffer()`).
 *
 * Bytes are fetched lazily from the content:// URI on demand and cached
 * after the first full read. Partial reads via `slice()` are streamed
 * through the native `readFile(offset, length)` plumbing — keeps memory
 * usage low for large libraries (hashing only needs head/tail slices).
 */
export function createNativeFile(entry: NativeAudioEntry): File {
  const { uri, name, size, mime, relativePath } = entry;
  let cached: ArrayBuffer | null = null;
  const fetchAll = async (): Promise<ArrayBuffer> => {
    if (cached) return cached;
    cached = await readNativeFile(uri);
    return cached;
  };
  const makeSlice = (start: number, end: number): Blob => {
    const s = Math.max(0, start | 0);
    const e = Math.max(s, Math.min(size, end | 0));
    const len = e - s;
    const sliceArrayBuffer = async (): Promise<ArrayBuffer> => {
      if (cached) return cached.slice(s, e);
      return readNativeFile(uri, s, len);
    };
    return {
      size: len,
      type: mime,
      arrayBuffer: sliceArrayBuffer,
      slice(a: number = 0, b: number = len) {
        return makeSlice(s + a, s + b);
      },
      stream() {
        throw new Error("stream() not supported on native file");
      },
      async text() {
        const buf = await sliceArrayBuffer();
        return new TextDecoder().decode(buf);
      },
    } as unknown as Blob;
  };
  const file = {
    name,
    size,
    type: mime,
    lastModified: Date.now(),
    webkitRelativePath: relativePath,
    async arrayBuffer() {
      return fetchAll();
    },
    slice(start: number = 0, end: number = size) {
      return makeSlice(start, end);
    },
    stream() {
      throw new Error("stream() not supported on native file");
    },
    async text() {
      const buf = await fetchAll();
      return new TextDecoder().decode(buf);
    },
  };
  return file as unknown as File;
}
