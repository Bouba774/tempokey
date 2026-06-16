/**
 * JS bridge for the native FolderPicker Capacitor plugin.
 * Falls back gracefully when running in a regular web browser
 * (where the Storage Access Framework is replaced by <input webkitdirectory>).
 */
import { registerPlugin, Capacitor } from "@capacitor/core";

export interface NativeAudioFile {
  uri: string;
  name: string;
  path: string; // includes the root library name as the first segment
  size: number;
  mime: string;
  ext: string;
}

export interface PickFolderResult {
  uri: string;
  name: string;
}

export interface ScanFolderResult {
  files: NativeAudioFile[];
  scannedDirs: number;
  foundFiles: number;
  audioFiles: number;
  ignored: number;
  rootName: string;
}

interface FolderPickerPlugin {
  pickFolder(): Promise<PickFolderResult>;
  scanFolder(opts: { uri: string }): Promise<ScanFolderResult>;
  readFile(opts: { uri: string }): Promise<{ data: string; size: number }>;
  listPersistedFolders(): Promise<{
    folders: Array<{ uri: string; read: boolean; write: boolean; persistedTime: number }>;
  }>;
  forgetFolder(opts: { uri: string }): Promise<void>;
}

export const FolderPicker = registerPlugin<FolderPickerPlugin>("FolderPicker");

export function isNativeAndroid(): boolean {
  try {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
  } catch {
    return false;
  }
}

const MIME_BY_EXT: Record<string, string> = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
  flac: "audio/flac",
  aiff: "audio/aiff",
  aif: "audio/aiff",
  m4a: "audio/mp4",
  aac: "audio/aac",
  ogg: "audio/ogg",
  opus: "audio/ogg",
};

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Fetch the bytes of a SAF document URI and wrap them as a File. */
export async function loadNativeFile(entry: {
  uri: string;
  name: string;
  ext?: string;
  mime?: string;
}): Promise<File> {
  const res = await FolderPicker.readFile({ uri: entry.uri });
  const bytes = base64ToBytes(res.data);
  // Copy into a fresh ArrayBuffer to satisfy strict File/Blob typing.
  const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const ext = (entry.ext ?? entry.name.split(".").pop() ?? "").toLowerCase();
  const type = entry.mime || MIME_BY_EXT[ext] || "application/octet-stream";
  return new File([ab], entry.name, { type });
}

