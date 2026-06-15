import { useLibraryStore } from "@/lib/library-store";
import { Activity } from "lucide-react";

export function AnalysisPanel() {
  const library = useLibraryStore((s) => s.library);
  const tracks = library?.tracks ?? [];
  const total = tracks.length;
  const analyzed = tracks.filter((t) => t.analyzed).length;
  const remaining = total - analyzed;
  const pct = total === 0 ? 0 : Math.round((analyzed / total) * 100);

  const recent = tracks.filter((t) => t.analyzed).slice(0, 12);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Total", value: total },
          { label: "Analysés", value: analyzed },
          { label: "Restants", value: remaining },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-3">
            <div className="text-xs text-muted-foreground">{s.label}</div>
            <div className="mt-1 text-xl font-semibold tabular-nums">{s.value.toLocaleString()}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Progression</span>
          <span className="text-sm tabular-nums text-[var(--primary-glow)]">{pct}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface-elevated)]">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, background: "var(--gradient-primary)" }}
          />
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          {remaining > 0 ? `${remaining.toLocaleString()} morceaux en attente d'analyse.` : "Tous les morceaux ont été analysés."}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Activity className="h-4 w-4 text-[var(--primary-glow)]" />
          <span className="text-sm font-medium">Journal d'analyse</span>
        </div>
        <ul className="divide-y divide-border">
          {recent.length === 0 && (
            <li className="px-4 py-6 text-sm text-muted-foreground text-center">Aucune analyse pour l'instant.</li>
          )}
          {recent.map((t) => (
            <li key={t.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary-glow)]" />
              <span className="flex-1 truncate text-muted-foreground">
                Analyse terminée : <span className="text-foreground">{t.name}</span>
              </span>
              <span className="text-xs tabular-nums text-muted-foreground">{t.bpm} · {t.key}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}