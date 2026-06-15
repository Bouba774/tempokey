import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useLibraryStore, generateMockTracks } from "@/lib/library-store";
import { FolderPlus, Clock } from "lucide-react";
import logoAsset from "@/assets/tempokey-logo.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TempoKey — Analysez et organisez vos bibliothèques audio" },
      { name: "description", content: "Outil professionnel pour DJs et producteurs : importez un dossier audio, analysez BPM et tonalité." },
    ],
  }),
  component: Home,
});

const SAMPLE_FOLDERS = [
  { name: "House Collection", count: 532 },
  { name: "Techno Crate 2026", count: 1284 },
  { name: "Vinyl Rips", count: 217 },
];

function Home() {
  const navigate = useNavigate();
  const setLibrary = useLibraryStore((s) => s.setLibrary);
  const lastLibrary = useLibraryStore((s) => s.lastLibrary);
  const restoreLast = useLibraryStore((s) => s.restoreLast);

  function importFolder() {
    const sample = SAMPLE_FOLDERS[Math.floor(Math.random() * SAMPLE_FOLDERS.length)];
    setLibrary({
      folderName: sample.name,
      tracks: generateMockTracks(sample.count),
      importedAt: Date.now(),
    });
    navigate({ to: "/workspace" });
  }

  function openLast() {
    if (restoreLast()) navigate({ to: "/workspace" });
  }

  return (
    <main className="min-h-[100dvh] flex flex-col items-center justify-between px-6 py-12 bg-background">
      <div className="flex-1 flex flex-col items-center justify-center text-center max-w-sm w-full">
        <div
          className="grid h-28 w-28 place-items-center rounded-3xl mb-6"
          style={{ background: "var(--gradient-surface)", boxShadow: "var(--shadow-elegant)" }}
        >
          <img src={logoAsset.url} alt="TempoKey" className="h-20 w-20" />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">TempoKey</h1>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          Analysez et organisez vos bibliothèques audio.
        </p>
      </div>

      <div className="w-full max-w-sm space-y-3">
        <button
          onClick={importFolder}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-semibold text-[var(--primary-foreground)] transition-transform active:scale-[0.98]"
          style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
        >
          <FolderPlus className="h-5 w-5" />
          Importer un dossier audio
        </button>
        <button
          onClick={openLast}
          disabled={!lastLibrary}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-border bg-[var(--surface-elevated)] text-[15px] font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Clock className="h-5 w-5 text-muted-foreground" />
          {lastLibrary ? `Ouvrir « ${lastLibrary.folderName} »` : "Ouvrir la dernière bibliothèque"}
        </button>
      </div>
    </main>
  );
}