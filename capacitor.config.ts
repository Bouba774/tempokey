import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor configuration for the native Android wrapper around TempoKey.
 *
 * IMPORTANT — Edge-to-edge architecture (single source of truth):
 *   • The WebView always extends under the system bars.
 *   • The StatusBar plugin owns overlay/style/colour (see
 *     `src/lib/android-system-bars.ts` → `syncAndroidSystemBars`).
 *   • `adjustMarginsForEdgeToEdge: "disable"` is REQUIRED — any other value
 *     forces the native shell to add a top margin that competes with
 *     `StatusBar.setOverlaysWebView({ overlay: true })`, producing a random
 *     dark/light band behind the status bar on relaunch or theme switch.
 *   • `backgroundColor: "#00000000"` keeps the WebView itself transparent so
 *     only the React `<body>` paints — no theme-mismatched band can leak
 *     through.
 */
const config: CapacitorConfig = {
  appId: "app.lovable.tempokey",
  appName: "TempoKey",
  webDir: "dist/android",
  backgroundColor: "#00000000",
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    // Disable the native margin shim. Edge-to-edge is handled in JS by the
    // StatusBar plugin + CSS `env(safe-area-inset-*)` helpers.
    adjustMarginsForEdgeToEdge: "disable",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: "#FFFFFF",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      // Initial values — the runtime helper `syncAndroidSystemBars()` is the
      // authoritative source after boot.
      overlaysWebView: true,
      style: "DEFAULT",
      backgroundColor: "#00000000",
    },
  },
};

export default config;
