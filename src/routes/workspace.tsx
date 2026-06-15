import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useLibraryStore } from "@/lib/library-store";
import { useAnalysisStore } from "@/lib/analysis-store";
import { WorkspaceHeader } from "@/components/WorkspaceHeader";
import { TrackList } from "@/components/TrackList";
import { AnalysisPanel } from "@/components/AnalysisPanel";
import { RenamePanel } from "@/components/RenamePanel";
import { DuplicatesPanel } from "@/components/DuplicatesPanel";

export const Route = createFileRoute("/workspace")({
  head: () => ({ meta: [{ title: "Workspace — TempoKey" }] }),
  component: Workspace,
});

type Tab = "library" | "analysis" | "duplicates" | "rename";

function Workspace() {
  const library = useLibraryStore((s) => s.library);
  const hydrated = useLibraryStore((s) => s.hydrated);
  const hydrate = useLibraryStore((s) => s.hydrate);
  const startAnalysis = useAnalysisStore((s) => s.start);
  const running = useAnalysisStore((s) => s.running);
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("library");

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (hydrated && !library) navigate({ to: "/" });
  }, [hydrated, library, navigate]);

  // Auto-start analysis whenever pending tracks with in-memory file handles exist.
  useEffect(() => {
    if (!library || running) return;
    const getFile = useLibraryStore.getState().getFile;
    const hasWork = library.tracks.some(
      (t) => t.status === "pending" && !!getFile(t.id),
    );
    if (hasWork) void startAnalysis();
  }, [library, running, startAnalysis]);

  if (!library) return null;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <WorkspaceHeader />
      <div role="tablist" className="sticky top-[65px] z-20 flex gap-1 overflow-x-auto border-b border-border bg-background px-4">
        {([
          { id: "library", label: "Bibliothèque" },
          { id: "analysis", label: "Analyse" },
          { id: "duplicates", label: "Doublons" },
          { id: "rename", label: "Renommer" },
        ] as { id: Tab; label: string }[]).map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              className={`relative px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
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
      <div key={tab} className="flex flex-1 flex-col min-h-0 animate-in fade-in-50 duration-200">
        {tab === "library" && <TrackList />}
        {tab === "analysis" && <AnalysisPanel />}
        {tab === "duplicates" && <DuplicatesPanel />}
        {tab === "rename" && <RenamePanel />}
      </div>
    </div>
  );
}