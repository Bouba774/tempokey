import { Component, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface Props {
  name: string;
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Per-panel React error boundary.
 *
 * Goal: a crash inside a tab (Library / Analysis / Duplicates / Rename) or
 * inside a modal (TrackDetailSheet, FilterSheet) MUST NOT freeze the rest
 * of the app. The boundary catches the throw, shows a friendly "Cette
 * section a rencontré une erreur" card with a retry button, and the rest
 * of the UI (header, tabs, FloatingPlayer, Android back) stays interactive.
 *
 * The native APK's global ErrorBoundary (capacitor/main.tsx) is the last
 * line of defense; this one keeps the failure local.
 */
export class PanelErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown) {
    // eslint-disable-next-line no-console
    console.error(`[TempoKey] ${this.props.name} crashed`, error, info);
  }

  private reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="m-4 rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 text-sm">
        <div className="mb-2 flex items-center gap-2 font-semibold text-foreground">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Cette section a rencontré une erreur
        </div>
        <p className="text-xs text-muted-foreground">
          {this.state.error.message || "Erreur inattendue."} Vous pouvez réessayer
          sans redémarrer l'application.
        </p>
        <button
          onClick={this.reset}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border bg-[var(--surface-elevated)] px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Réessayer
        </button>
      </div>
    );
  }
}
