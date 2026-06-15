import { useMemo } from "react";
import { toast } from "sonner";
import { useLibraryStore, type Track } from "@/lib/library-store";
import { useOrderingStore, type OrderSource } from "@/lib/ordering-store";
import {
  energyLabel,
  energyLevel,
  energyScore,
  getSuggestions,
  type Suggestion,
} from "@/lib/harmonic";
import { Disc3, Sparkles, Waves, Flame, ArrowRight, X, CheckCheck } from "lucide-react";

function EnergyPill({ track }: { track: Pick<Track, "bpm" | "camelot"> }) {
  const level = energyLevel(track);
  const color =
    level === "high"
      ? "bg-[var(--destructive,#ef4444)]/15 text-[var(--destructive,#ef4444)]"
      : level === "medium"
        ? "bg-[var(--primary)]/15 text-[var(--primary-glow)]"
        : "bg-[var(--surface-elevated)] text-muted-foreground";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${color}`}>
      {energyLabel(level)}
    </span>
  );
}

function SuggestionRow({ s, source }: { s: Suggestion; source: Track }) {
  const bpmDelta =
    source.bpm && s.track.bpm ? s.track.bpm - source.bpm : null;
  return (
    <li className="group flex items-center gap-3 rounded-lg border border-border bg-[var(--surface-elevated)] px-3 py-2 transition-colors hover:border-[var(--accent)]/40 hover:bg-[var(--accent)]/5">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-[var(--accent)]/15 text-[11px] font-semibold text-[var(--accent)] tabular-nums ring-1 ring-[var(--accent)]/25">
        {s.track.camelot ?? "—"}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm text-foreground">{s.track.title}</div>
        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground tabular-nums">
          <span>{s.track.bpm ?? "—"} BPM</span>
          {bpmDelta !== null && bpmDelta !== 0 && (
            <span className={bpmDelta > 0 ? "text-[var(--primary-glow)]" : "text-muted-foreground"}>
              {bpmDelta > 0 ? "+" : ""}
              {bpmDelta.toFixed(0)}
            </span>
          )}
          <span className="text-border">·</span>
          <EnergyPill track={s.track} />
        </div>
      </div>
      <div className="text-[10px] text-muted-foreground tabular-nums">
        {Math.round(s.score)}
      </div>
    </li>
  );
}

function Section({
  icon,
  title,
  hint,
  items,
  source,
  empty,
}: {
  icon: React.ReactNode;
  title: string;
  hint?: string;
  items: Suggestion[];
  source: Track;
  empty: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-[var(--primary-glow)]">{icon}</span>
          <span className="text-sm font-medium">{title}</span>
        </div>
        {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
      </div>
      {items.length === 0 ? (
        <div className="px-4 py-5 text-center text-xs text-muted-foreground">{empty}</div>
      ) : (
        <ul className="space-y-1.5 p-3">
          {items.map((s) => (
            <SuggestionRow key={s.track.id} s={s} source={source} />
          ))}
        </ul>
      )}
    </div>
  );
}

export function HarmonicMixing() {
  const library = useLibraryStore((s) => s.library);
  const selectedIds = useLibraryStore((s) => s.selectedIds);
  const clear = useLibraryStore((s) => s.clearSelection);

  const source = useMemo<Track | null>(() => {
    if (!library) return null;
    const id = selectedIds.values().next().value as string | undefined;
    if (!id) return null;
    return library.tracks.find((t) => t.id === id) ?? null;
  }, [library, selectedIds]);

  const suggestions = useMemo(() => {
    if (!source || !library) return null;
    if (!source.analyzed || !source.camelot) return null;
    return getSuggestions(source, library.tracks);
  }, [source, library]);

  if (!source) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-center">
        <Disc3 className="mx-auto h-6 w-6 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">
          Sélectionne un morceau dans la bibliothèque pour voir ses transitions DJ.
        </p>
      </div>
    );
  }

  if (!source.analyzed || !source.camelot) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 text-center">
        <div className="text-sm font-medium">{source.title}</div>
        <p className="mt-2 text-xs text-muted-foreground">
          Ce morceau doit être analysé avant de proposer des transitions.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-[var(--primary)]/40 bg-[var(--primary)]/10 p-4">
        <div className="flex items-start gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-[var(--primary)] text-sm font-bold text-[var(--primary-foreground)] tabular-nums">
            {source.camelot}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{source.title}</div>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground tabular-nums">
              <span>{source.bpm ?? "—"} BPM</span>
              <span className="text-border">·</span>
              <span>{source.key ?? "—"}</span>
              <span className="text-border">·</span>
              <EnergyPill track={source} />
              <span className="text-border">·</span>
              <span>score {Math.round(energyScore(source) * 100)}</span>
            </div>
          </div>
          <button
            onClick={clear}
            aria-label="Désélectionner"
            className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-[var(--surface-elevated)] hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {suggestions && (
        <>
          <Section
            icon={<ArrowRight className="h-4 w-4" />}
            title="Next Track recommandé"
            hint="cohérence harmonique + énergie"
            items={suggestions.next}
            source={source}
            empty="Pas assez de morceaux analysés pour une recommandation."
          />
          <Section
            icon={<Sparkles className="h-4 w-4" />}
            title="Compatible Tracks"
            hint="même clé ou adjacente"
            items={suggestions.compatible}
            source={source}
            empty="Aucun morceau compatible trouvé."
          />
          <Section
            icon={<Waves className="h-4 w-4" />}
            title="Transitions douces"
            hint="BPM ±3%"
            items={suggestions.smooth}
            source={source}
            empty="Aucune transition douce disponible."
          />
          <Section
            icon={<Flame className="h-4 w-4" />}
            title="Transitions énergétiques"
            hint="montée d'énergie"
            items={suggestions.energetic}
            source={source}
            empty="Aucune montée d'énergie pertinente."
          />
        </>
      )}
    </div>
  );
}