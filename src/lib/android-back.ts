/**
 * Centralized Android hardware back-button manager.
 *
 * Goals:
 *  - One single `App.backButton` listener for the whole app (no duplicates).
 *  - LIFO stack of handlers registered by components via `useBackHandler`.
 *  - Built-in fallbacks that mimic a native Android app:
 *      1. If the soft keyboard is visible -> hide it.
 *      2. If a Radix overlay is open (dialog/sheet/menu/popover) -> dispatch
 *         Escape so Radix closes it (single source of truth, no per-component
 *         wrapping needed).
 *      3. If the router can navigate back -> history.back().
 *      4. On the root route -> "press back again to quit" toast within 2s,
 *         then `App.exitApp()`.
 *
 * Web preview is a no-op (Capacitor.isNativePlatform() === false).
 */
import { toast } from "sonner";

export type BackHandler = () => boolean | void | Promise<boolean | void>;
type ListenerResult = { catch?: (onRejected: () => void) => void } | Promise<unknown>;
type CapacitorCoreModule = {
  Capacitor?: { isNativePlatform?: () => boolean };
};
type CapacitorAppModule = {
  App?: {
    addListener?: (
      eventName: "backButton",
      listenerFunc: (event: { canGoBack: boolean }) => void | Promise<void>,
    ) => ListenerResult;
    exitApp?: () => Promise<void>;
  };
};
type CapacitorKeyboardModule = {
  Keyboard?: {
    addListener?: (
      eventName: "keyboardWillShow" | "keyboardWillHide",
      listenerFunc: () => void,
    ) => ListenerResult;
    hide?: () => Promise<void>;
  };
};

const stack: BackHandler[] = [];
let initialised = false;
let lastExitPromptAt = 0;

// Hide Capacitor module specifiers from the web bundler (rolldown). The
// packages are only installed during the Android build pipeline; on the web
// these resolve to `null` and the whole module is a no-op.
const dynImport = (name: string): Promise<unknown> => (0, eval)(`import(${JSON.stringify(name)})`);
const safeImport = (name: string): Promise<unknown> => dynImport(name).catch(() => null);

export function pushBackHandler(handler: BackHandler): () => void {
  stack.push(handler);
  return () => {
    const i = stack.lastIndexOf(handler);
    if (i >= 0) stack.splice(i, 1);
  };
}

function hasOpenRadixOverlay(): boolean {
  // Radix sets data-state="open" on Dialog/Sheet/AlertDialog/DropdownMenu/
  // Popover/Select/Tooltip content nodes. We only react to interactive ones.
  const selectors = [
    '[role="dialog"][data-state="open"]',
    '[role="alertdialog"][data-state="open"]',
    '[role="menu"][data-state="open"]',
    '[role="listbox"][data-state="open"]',
    '[data-radix-popper-content-wrapper] [data-state="open"]',
  ];
  return !!document.querySelector(selectors.join(","));
}

function dispatchEscape() {
  const ev = new KeyboardEvent("keydown", {
    key: "Escape",
    code: "Escape",
    keyCode: 27,
    which: 27,
    bubbles: true,
    cancelable: true,
  });
  (document.activeElement ?? document.body).dispatchEvent(ev);
}

/**
 * Hash-history aware "are we on the home route?" check.
 *
 * The Android WebView ships with `window.history.length > 1` from the moment
 * the SPA boots (Capacitor's initial navigation counts as an entry, and any
 * in-app hash change adds another). Using `history.length` as a "can we go
 * back?" signal meant the home route NEVER triggered exitApp — pressing
 * Back on `#/` just popped a stale entry and the user was stuck.
 *
 * Source of truth = the hash route. Anything that is not `#/` (or empty) is
 * a secondary screen and must `history.back()`. `#/` is the home route and
 * must show the exit prompt.
 */
function isAtHomeRoute(): boolean {
  const raw = (window.location.hash || "").split("?")[0].split("#").pop() || "";
  const path = raw.startsWith("/") ? raw : `/${raw}`;
  return path === "/" || path === "";
}

async function defaultBack(_canGoBack: boolean): Promise<void> {
  // 1) Open Radix overlay → close it via Escape (Radix handles all primitives).
  //    Component-scoped sheets/panels are already drained by the handler stack
  //    before we get here; this only catches stray Radix portals.
  if (hasOpenRadixOverlay()) {
    dispatchEscape();
    return;
  }
  // 2) Secondary route → pop one entry. We deliberately ignore Capacitor's
  //    `canGoBack` and `window.history.length`: both are unreliable in the
  //    hash-history WebView (see isAtHomeRoute() comment).
  if (!isAtHomeRoute()) {
    window.history.back();
    return;
  }
  // 3) Home route → double-press to exit.
  const now = Date.now();
  if (now - lastExitPromptAt < 2000) {
    lastExitPromptAt = 0;
    const cap = (await safeImport("@capacitor/app")) as CapacitorAppModule | null;
    try {
      await cap?.App?.exitApp?.();
    } catch {
      /* exitApp can reject if the activity is already finishing */
    }
    return;
  }
  lastExitPromptAt = now;
  toast("Appuyez encore une fois pour quitter TempoKey", { duration: 2000 });
}


export async function initAndroidBack(): Promise<void> {
  if (initialised) return;
  initialised = true;

  const core = (await safeImport("@capacitor/core")) as CapacitorCoreModule | null;
  if (!core?.Capacitor?.isNativePlatform?.()) return;

  const appMod = (await safeImport("@capacitor/app")) as CapacitorAppModule | null;
  const kbMod = (await safeImport("@capacitor/keyboard")) as CapacitorKeyboardModule | null;

  // Track keyboard visibility — first back press should dismiss the keyboard.
  let keyboardVisible = false;
  kbMod?.Keyboard?.addListener?.("keyboardWillShow", () => {
    keyboardVisible = true;
  }).catch?.(() => {});
  kbMod?.Keyboard?.addListener?.("keyboardWillHide", () => {
    keyboardVisible = false;
  }).catch?.(() => {});

  appMod?.App?.addListener?.("backButton", async ({ canGoBack }: { canGoBack: boolean }) => {
    try {
      console.log("[TempoKey] BACK_BUTTON_RECEIVED", {
        canGoBack: !!canGoBack,
        handlers: stack.length,
        bodyPointerEvents: document.body.style.pointerEvents || "",
        bodyOverflow: document.body.style.overflow || "",
        bodyInert: document.body.hasAttribute("inert"),
        scrollLocked: document.body.hasAttribute("data-scroll-locked"),
      });
      // a) Keyboard first.
      if (keyboardVisible && kbMod?.Keyboard?.hide) {
        await kbMod.Keyboard.hide().catch(() => {});
        return;
      }
      // b) Walk component handler stack (LIFO).
      for (let i = stack.length - 1; i >= 0; i--) {
        const fn = stack[i];
        try {
          const r = await fn();
          if (r === true) return;
        } catch {
          /* keep walking on handler failure */
        }
      }
      // c) Fallbacks.
      await defaultBack(!!canGoBack);
    } catch (err) {
      console.error("[TempoKey] backButton handler failed", err);
    }
  }).catch?.(() => {});
}
