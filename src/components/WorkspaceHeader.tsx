import { Link } from "@tanstack/react-router";
import { Settings, FolderOpen } from "lucide-react";
import { useLibraryStore } from "@/lib/library-store";
import logoAsset from "@/assets/tempokey-logo.png.asset.json";

export function WorkspaceHeader() {
  const library = useLibraryStore((s) => s.library);
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-[var(--surface)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--surface)]/80">
      <div className="flex items-center gap-3 px-4 py-3">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img src={logoAsset.url} alt="" className="h-8 w-8" />
        </Link>
        <div className="min-w-0 flex-1">
          {library ? (
            <>
              <div className="flex items-center gap-1.5 text-[15px] font-semibold text-foreground truncate">
                <FolderOpen className="h-4 w-4 text-[var(--primary-glow)] shrink-0" />
                <span className="truncate">{library.folderName}</span>
              </div>
              <div className="text-xs text-muted-foreground tabular-nums">
                {library.tracks.length.toLocaleString()} morceaux
              </div>
            </>
          ) : (
            <div className="text-[15px] font-semibold">TempoKey</div>
          )}
        </div>
        <Link
          to="/settings"
          aria-label="Paramètres"
          className="grid h-11 w-11 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <Settings className="h-5 w-5" />
        </Link>
      </div>
    </header>
  );
}