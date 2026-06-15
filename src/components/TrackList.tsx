import { useRef, useState, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Search, SlidersHorizontal, Check } from "lucide-react";
import { useLibraryStore, type Track } from "@/lib/library-store";

function TrackRow({ track, selected, onToggle }: { track: Track; selected: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`group flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors ${
        selected
          ? "border-[var(--primary)] bg-[var(--primary)]/10"
          : "border-border bg-card hover:bg-accent"
      }`}
    >
      <div
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-xs font-semibold tabular-nums ${
          selected
            ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
            : "bg-[var(--surface-elevated)] text-[var(--primary-glow)]"
        }`}
      >
        {selected ? <Check className="h-4 w-4" /> : track.key}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-foreground">{track.name}</div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground tabular-nums">
          <span>{track.bpm} BPM</span>
          <span className="text-border">·</span>
          <span>{track.key}</span>
          <span className="text-border">·</span>
          <span>{track.duration}</span>
        </div>
      </div>
    </button>
  );
}

export function TrackList() {
  const library = useLibraryStore((s) => s.library);
  const selectedIds = useLibraryStore((s) => s.selectedIds);
  const toggle = useLibraryStore((s) => s.toggleSelected);
  const clear = useLibraryStore((s) => s.clearSelection);
  const [query, setQuery] = useState("");
  const parentRef = useRef<HTMLDivElement>(null);

  const tracks = library?.tracks ?? [];
  const filtered = useMemo(() => {
    if (!query.trim()) return tracks;
    const q = query.toLowerCase();
    return tracks.filter(
      (t) => t.name.toLowerCase().includes(q) || t.key.toLowerCase() === q || String(t.bpm) === q,
    );
  }, [tracks, query]);

  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 10,
  });

  return (
    <div className="flex flex-1 flex-col min-h-0">
      <div className="flex items-center gap-2 px-4 pt-3 pb-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un morceau, BPM, tonalité…"
            className="h-11 w-full rounded-xl border border-border bg-[var(--surface-elevated)] pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          />
        </div>
        <button
          aria-label="Filtres"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-border bg-[var(--surface-elevated)] text-muted-foreground hover:text-foreground"
        >
          <SlidersHorizontal className="h-4 w-4" />
        </button>
      </div>

      {selectedIds.size > 0 && (
        <div className="mx-4 mb-2 flex items-center justify-between rounded-lg bg-[var(--primary)]/15 px-3 py-2 text-xs">
          <span className="font-medium">{selectedIds.size} sélectionné{selectedIds.size > 1 ? "s" : ""}</span>
          <button onClick={clear} className="text-[var(--primary-glow)] font-medium">Annuler</button>
        </div>
      )}

      <div ref={parentRef} className="flex-1 overflow-y-auto px-4 pb-6">
        <div style={{ height: virtualizer.getTotalSize(), width: "100%", position: "relative" }}>
          {virtualizer.getVirtualItems().map((vi) => {
            const track = filtered[vi.index];
            return (
              <div
                key={track.id}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  transform: `translateY(${vi.start}px)`,
                  paddingBottom: 8,
                }}
              >
                <TrackRow
                  track={track}
                  selected={selectedIds.has(track.id)}
                  onToggle={() => toggle(track.id)}
                />
              </div>
            );
          })}
        </div>
        {filtered.length === 0 && (
          <div className="grid place-items-center py-16 text-sm text-muted-foreground">
            Aucun morceau ne correspond.
          </div>
        )}
      </div>
    </div>
  );
}