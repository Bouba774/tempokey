/**
 * Capacitor SPA entry — runs in the Android WebView.
 * Independent from the TanStack Start SSR pipeline used on web.
 *
 * - Uses TanStack Router in pure client mode with hash history
 *   (file:// URLs in WebViews don't tolerate history API navigation).
 * - Wraps the app in a global ErrorBoundary so no React crash ever
 *   results in a black screen.
 * - Emits diagnostic logs at each boot stage so adb logcat can pinpoint
 *   where startup blocks.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  RouterProvider,
  createRouter,
  createHashHistory,
} from "@tanstack/react-router";
import { QueryClient } from "@tanstack/react-query";
import { routeTree } from "../src/routeTree.gen";
import { ErrorBoundary } from "../src/components/ErrorBoundary";
import { initAndroidBack } from "../src/lib/android-back";
import "../src/styles.css";

const log = (stage: string, extra?: unknown) => {
  // Visible in `adb logcat | grep Capacitor/Console`
  // eslint-disable-next-line no-console
  console.log(`[TempoKey] ${stage}`, extra ?? "");
};

log("App Started");

// Single centralized Android hardware back-button handler (toast-to-exit on
// root, Escape dispatch for modals/menus, history.back for inner screens,
// keyboard dismiss). Stack of component handlers is registered via the
// useBackHandler hook.
void initAndroidBack();

// Capacitor diagnostics + single-source-of-truth system-bar wiring.
// All status-bar / splash / app-state mutations live in
// `src/lib/android-system-bars.ts`. Nothing else in the codebase should ever
// touch StatusBar / SplashScreen directly — see the band-behind-status-bar
// regression that was caused by having two competing call sites.
(async () => {
  try {
    const cap = await import("@capacitor/core").catch(() => null);
    if (cap?.Capacitor) {
      log("Capacitor Detected", {
        native: cap.Capacitor.isNativePlatform(),
        platform: cap.Capacitor.getPlatform(),
      });
    }
    const { installAndroidSystemBarsSync } = await import(
      "../src/lib/android-system-bars"
    );
    await installAndroidSystemBarsSync();
  } catch (e) {
    log("Capacitor Probe Skipped", String(e));
  }
})();


function boot() {
  try {
    log("Storage Init");
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: 1, staleTime: 60_000 } },
    });

    log("Router Init");
    const router = createRouter({
      routeTree,
      history: createHashHistory(),
      context: { queryClient },
      defaultPreloadStaleTime: 0,
      defaultErrorComponent: ({ error, reset }) => {
        // eslint-disable-next-line no-console
        console.error("[TempoKey] Route error", error);
        return (
          <div style={{ padding: 24, color: "#e6e8ee", background: "#0A0D14", minHeight: "100dvh" }}>
            <h1 style={{ fontSize: 18, marginBottom: 8 }}>Une erreur est survenue</h1>
            <p style={{ fontSize: 13, color: "#8a90a2", marginBottom: 16 }}>
              {error?.message || "Erreur inconnue"}
            </p>
            <button
              onClick={() => reset()}
              style={{
                background: "#7c5cff", color: "white", border: 0,
                padding: "10px 16px", borderRadius: 10, fontWeight: 600,
              }}
            >
              Réessayer
            </button>
          </div>
        );
      },
      defaultNotFoundComponent: () => (
        <div style={{ padding: 24, color: "#e6e8ee", background: "#0A0D14", minHeight: "100dvh" }}>
          <h1>Page introuvable</h1>
          <a href="#/" style={{ color: "#7c5cff" }}>Retour à l'accueil</a>
        </div>
      ),
    });

    log("UI Mounting");
    const container = document.getElementById("app");
    if (!container) throw new Error("Missing #app root element");
    const root = createRoot(container);
    root.render(
      <StrictMode>
        <ErrorBoundary>
          <RouterProvider router={router} />
        </ErrorBoundary>
      </StrictMode>,
    );
    log("App Ready");

    // Splash hide + post-splash system-bar resync is handled centrally by
    // `installAndroidSystemBarsSync()` (see src/lib/android-system-bars.ts).
    // Do NOT call SplashScreen.hide() here — having two hide() callers
    // re-creates the race that produced the band-behind-status-bar bug.
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[TempoKey] Boot failure", err);
    document.body.innerHTML = `
      <div style="padding:24px;color:#e6e8ee;background:#0A0D14;min-height:100dvh;font-family:system-ui">
        <h1 style="font-size:18px;margin:0 0 8px">TempoKey n'a pas pu démarrer</h1>
        <p style="font-size:13px;color:#8a90a2;margin:0 0 16px">${(err as Error)?.message ?? err}</p>
        <button onclick="location.reload()" style="background:#7c5cff;color:#fff;border:0;padding:10px 16px;border-radius:10px;font-weight:600">Redémarrer</button>
      </div>`;
  }
}

// Global safety nets
window.addEventListener("error", (e) => {
  // eslint-disable-next-line no-console
  console.error("[TempoKey] window.error", e.error || e.message);
});
window.addEventListener("unhandledrejection", (e) => {
  // eslint-disable-next-line no-console
  console.error("[TempoKey] unhandledrejection", e.reason);
});

boot();
