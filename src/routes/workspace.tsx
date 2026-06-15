import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useLibraryStore } from "@/lib/library-store";
import { WorkspaceHeader } from "@/components/WorkspaceHeader";
import { TrackList } from "@/components/TrackList";
import { AnalysisPanel } from "@/components/AnalysisPanel";

export const Route = createFileRoute("/workspace")({
  head: () => ({ meta: [{ title: "Workspace — TempoKey" }] }),
  component: Workspace,
});

type Tab = "library" | "analysis";

function Workspace() {
  const library = useLibraryStore((s) => s.library);
  const restoreLast = useLibraryStore((s) => s.restoreLast);
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("library");

  useEffect(() => {
    if (!library) {
      const ok = restoreLast();
      if (!ok) navigate({ to: "/" });
    }
  }, [library, restoreLast, navigate]);

  if (!library) return null;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <WorkspaceHeader />
      <div role="tablist" className="sticky top-[65px] z-20 flex gap-1 border-b border-border bg-background px-4">
        {([
          { id: "library", label: "Bibliothèque" },
          { id: "analysis", label: "Analyse" },
        ] as { id: Tab; label: string }[]).map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              className={`relative px-4 py-3 text-sm font-medium transition-colors ${
                active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
              {active && (
                <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-[var(--primary-glow)]" />
              )}
            </button>
          );
        })}
      </div>
      <div className="flex flex-1 flex-col min-h-0">
        {tab === "library" ? <TrackList /> : <AnalysisPanel />}
      </div>
    </div>
  );
}