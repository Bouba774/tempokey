/**
 * Single source of truth for the Android system bars (status bar + nav bar).
 *
 * Architecture
 * ────────────
 *   • The WebView always extends under the system bars (edge-to-edge).
 *   • The StatusBar Capacitor plugin owns overlay / style / background.
 *   • CSS handles the safe-area insets via `env(safe-area-inset-*)`.
 *
 * Why a single helper?
 *   The previous code mutated the status bar from `capacitor/main.tsx` AND
 *   relied on the native `adjustMarginsForEdgeToEdge` shim. On theme switch
 *   or app resume those two systems re-ran out of order, leaving a dark or
 *   light band behind the status bar. This helper is now the ONLY place that
 *   touches the system bars at runtime.
 *
 * Call sites (intentionally minimal):
 *   1. Boot, once the React tree is mounted.
 *   2. After the Capacitor splash hides.
 *   3. On every theme flip (light ⇄ dark).
 *   4. When the app returns to foreground (`appStateChange` → isActive).
 *
 * Note: Capacitor plugin packages (`@capacitor/status-bar`, `@capacitor/app`,
 * `@capacitor/splash-screen`) are installed only by `prepare-android.sh` and
 * are NOT listed in `package.json`, so we resolve them via dynamic
 * string-indirection to avoid TypeScript build failures on web.
 */

// Helper that hides the import specifier from TypeScript's module resolver.
async function loadOptional<T = unknown>(spec: string): Promise<T | null> {
  try {
    // The `/* @vite-ignore */` keeps Vite from trying to pre-bundle the
    // package on the web build where it is absent.
    return (await import(/* @vite-ignore */ spec)) as T;
  } catch {
    return null;
  }
}

let installed = false;

export async function syncAndroidSystemBars(): Promise<void> {
  if (typeof document === "undefined") return;
  try {
    const cap = await loadOptional<any>("@capacitor/core");
    if (!cap?.Capacitor?.isNativePlatform?.()) return;
    if (cap.Capacitor.getPlatform() !== "android") return;

    const sb = await loadOptional<any>("@capacitor/status-bar");
    if (!sb?.StatusBar) return;

    const isDark = document.documentElement.classList.contains("dark");

    // Edge-to-edge: WebView paints under the status bar.
    await sb.StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});

    // Icon contrast.
    //   Style.Light → light CONTENT (white icons) → dark backgrounds
    //   Style.Dark  → dark  CONTENT (black icons) → light backgrounds
    await sb.StatusBar.setStyle({
      style: isDark ? sb.Style.Light : sb.Style.Dark,
    }).catch(() => {});

    // Fully transparent — only the <body> background paints, so there is
    // never a hardcoded colour competing with the active theme.
    await sb.StatusBar.setBackgroundColor({ color: "#00000000" }).catch(
      () => {},
    );

    // Mirror the theme into <meta name="theme-color"> so the Android recents
    // thumbnail picks up the right tint while the WebView is briefly opaque.
    const hex = isDark ? "#0A0D14" : "#FFFFFF";
    let meta = document.querySelector<HTMLMetaElement>(
      'meta[name="theme-color"]',
    );
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }
    meta.content = hex;
  } catch {
    // Native plugin not available (web preview, dev shell, etc.) — no-op.
  }
}

/**
 * Wire up the listeners that should trigger a system-bar resync.
 * Safe to call multiple times; only the first call installs the observers.
 */
export async function installAndroidSystemBarsSync(): Promise<void> {
  if (installed) return;
  installed = true;
  if (typeof document === "undefined") return;

  // 1. Initial sync.
  await syncAndroidSystemBars();

  // 2. Theme flips (the theme store toggles the `dark` class on <html>).
  try {
    const obs = new MutationObserver(() => {
      void syncAndroidSystemBars();
    });
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
  } catch {}

  // 3. App resume.
  try {
    const appMod = await loadOptional<any>("@capacitor/app");
    appMod?.App?.addListener?.(
      "appStateChange",
      ({ isActive }: { isActive: boolean }) => {
        if (isActive) void syncAndroidSystemBars();
      },
    ).catch?.(() => {});
  } catch {}

  // 4. After the splash hides.
  try {
    const splash = await loadOptional<any>("@capacitor/splash-screen");
    if (splash?.SplashScreen?.hide) {
      await splash.SplashScreen.hide().catch(() => {});
      // Re-sync after the native splash window is torn down.
      void syncAndroidSystemBars();
    }
  } catch {}
}
