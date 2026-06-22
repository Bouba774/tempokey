import { useEffect, useState } from "react";

type AuditCounts = {
  dialogs: number;
  sheets: number;
  overlays: number;
  portals: number;
  bodyLocked: boolean;
};

const EMPTY: AuditCounts = {
  dialogs: 0,
  sheets: 0,
  overlays: 0,
  portals: 0,
  bodyLocked: false,
};

function isAndroidWebView(): boolean {
  const cap = (window as Window & { Capacitor?: { getPlatform?: () => string } }).Capacitor;
  return cap?.getPlatform?.() === "android";
}

function readCounts(): AuditCounts {
  const body = document.body;
  return {
    dialogs: document.querySelectorAll('[role="dialog"], [role="alertdialog"]').length,
    sheets: document.querySelectorAll("[data-tempokey-sheet]").length,
    overlays: document.querySelectorAll(
      "[data-tempokey-overlay], [data-radix-dialog-overlay], [data-radix-alert-dialog-overlay], [data-radix-popper-content-wrapper]",
    ).length,
    portals: document.querySelectorAll("[data-radix-portal]").length,
    bodyLocked:
      body.style.pointerEvents === "none" ||
      body.style.overflow === "hidden" ||
      body.hasAttribute("inert") ||
      body.hasAttribute("data-scroll-locked"),
  };
}

export function AndroidOverlayAudit() {
  const [visible, setVisible] = useState(false);
  const [counts, setCounts] = useState<AuditCounts>(EMPTY);

  useEffect(() => {
    if (!isAndroidWebView()) return;
    setVisible(true);
    const update = () => setCounts(readCounts());
    update();
    const id = window.setInterval(update, 250);
    return () => window.clearInterval(id);
  }, []);

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed bottom-2 left-2 z-[2147483647] rounded-md border border-border bg-[var(--surface-elevated)]/95 px-2 py-1 text-[10px] font-semibold tabular-nums text-foreground shadow-lg">
      D:{counts.dialogs} S:{counts.sheets} O:{counts.overlays} P:{counts.portals}
      {counts.bodyLocked ? " LOCK" : " OK"}
    </div>
  );
}