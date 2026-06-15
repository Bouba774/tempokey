import { create } from "zustand";

export interface Track {
  id: string;
  name: string;
  bpm: number;
  key: string;
  duration: string;
  analyzed: boolean;
}

export interface Library {
  folderName: string;
  tracks: Track[];
  importedAt: number;
}

interface LibraryState {
  library: Library | null;
  lastLibrary: Library | null;
  selectedIds: Set<string>;
  setLibrary: (lib: Library) => void;
  restoreLast: () => boolean;
  toggleSelected: (id: string) => void;
  clearSelection: () => void;
}

const CAMELOT_KEYS = [
  "1A","1B","2A","2B","3A","3B","4A","4B","5A","5B","6A","6B",
  "7A","7B","8A","8B","9A","9B","10A","10B","11A","11B","12A","12B",
];

const SAMPLE_NAMES = [
  "Midnight Drive", "Neon Pulse", "Velvet Sky", "Echo Chamber", "Solar Flare",
  "Deep Current", "Skyline", "Lost Frequencies", "Pulse Code", "Reverie",
  "Afterglow", "Magnetic North", "Glass Horizon", "Saturn Returns", "Lunar Tide",
  "Crystal Run", "Static Dreams", "Heatwave", "Parallel", "Soft Machine",
  "Phantom Limb", "Cassette Memory", "Low Orbit", "Halcyon", "Wavelength",
];

function fmtDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function generateMockTracks(count: number): Track[] {
  const tracks: Track[] = [];
  for (let i = 0; i < count; i++) {
    const base = SAMPLE_NAMES[i % SAMPLE_NAMES.length];
    tracks.push({
      id: `t-${i}`,
      name: `${base} ${String(i + 1).padStart(3, "0")}`,
      bpm: 90 + Math.floor((i * 37) % 60),
      key: CAMELOT_KEYS[(i * 7) % CAMELOT_KEYS.length],
      duration: fmtDuration(120 + ((i * 53) % 300)),
      analyzed: i % 3 === 0,
    });
  }
  return tracks;
}

const STORAGE_KEY = "tempokey:last-library";

function loadLast(): Library | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const meta = JSON.parse(raw) as { folderName: string; count: number; importedAt: number };
    return {
      folderName: meta.folderName,
      tracks: generateMockTracks(meta.count),
      importedAt: meta.importedAt,
    };
  } catch {
    return null;
  }
}

function persist(lib: Library) {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ folderName: lib.folderName, count: lib.tracks.length, importedAt: lib.importedAt }),
  );
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  library: null,
  lastLibrary: typeof window !== "undefined" ? loadLast() : null,
  selectedIds: new Set(),
  setLibrary: (lib) => {
    persist(lib);
    set({ library: lib, lastLibrary: lib, selectedIds: new Set() });
  },
  restoreLast: () => {
    const last = get().lastLibrary ?? loadLast();
    if (!last) return false;
    set({ library: last, lastLibrary: last, selectedIds: new Set() });
    return true;
  },
  toggleSelected: (id) => {
    const next = new Set(get().selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    set({ selectedIds: next });
  },
  clearSelection: () => set({ selectedIds: new Set() }),
}));