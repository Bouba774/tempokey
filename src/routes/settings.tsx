import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Monitor, Moon, Info } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Paramètres — TempoKey" }] }),
  component: SettingsPage,
});

type ThemeMode = "system" | "dark";

function SettingsPage() {
  const [theme, setTheme] = useState<ThemeMode>("dark");

  useEffect(() => {
    const stored = (typeof window !== "undefined" && localStorage.getItem("tempokey:theme")) as ThemeMode | null;
    if (stored) setTheme(stored);
  }, []);

  function update(mode: ThemeMode) {
    setTheme(mode);
    if (typeof window !== "undefined") localStorage.setItem("tempokey:theme", mode);
  }

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-[var(--surface)]/95 backdrop-blur px-2 py-2">
        <Link
          to="/workspace"
          aria-label="Retour"
          className="grid h-11 w-11 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-[15px] font-semibold">Paramètres</h1>
      </header>

      <div className="px-4 py-4 space-y-6 max-w-md mx-auto">
        <section>
          <h2 className="px-1 pb-2 text-xs uppercase tracking-wider text-muted-foreground">Apparence</h2>
          <div className="overflow-hidden rounded-xl border border-border bg-card divide-y divide-border">
            <Row
              icon={<Monitor className="h-4 w-4" />}
              label="Thème système"
              active={theme === "system"}
              onClick={() => update("system")}
            />
            <Row
              icon={<Moon className="h-4 w-4" />}
              label="Mode sombre"
              active={theme === "dark"}
              onClick={() => update("dark")}
            />
          </div>
        </section>

        <section>
          <h2 className="px-1 pb-2 text-xs uppercase tracking-wider text-muted-foreground">À propos</h2>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--surface-elevated)] text-[var(--primary-glow)]">
                <Info className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-medium">TempoKey</div>
                <div className="text-xs text-muted-foreground">Version 0.1.0 · Build alpha</div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function Row({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-accent transition-colors">
      <span className="text-muted-foreground">{icon}</span>
      <span className="flex-1 text-sm">{label}</span>
      <span
        className={`h-5 w-5 rounded-full border-2 ${
          active ? "border-[var(--primary-glow)] bg-[var(--primary-glow)]" : "border-border"
        }`}
      />
    </button>
  );
}