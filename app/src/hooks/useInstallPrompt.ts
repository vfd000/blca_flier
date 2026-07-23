import { useEffect, useState } from "react";

/** Chrome/Edge/Android-only event; not in TS's DOM lib, so we type it ourselves. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

/**
 * Manual-install instructions for browsers that never fire
 * beforeinstallprompt at all -- iOS Safari, Firefox (desktop and
 * Android), desktop Safari. Without this, those browsers would just show
 * nothing once `canPrompt` is false.
 */
function fallbackHint(): string {
  if (isIos()) return "Tap Share, then Add to Home Screen.";
  return 'Look for an install icon in your address bar, or "Install app" / "Add to Home Screen" in your browser menu.';
}

/**
 * Drives the "Install app" UI. Chrome/Edge/Android fire
 * `beforeinstallprompt`, which we capture and replay on demand via a
 * button instead of waiting for someone to notice the address-bar icon.
 * Every other browser (iOS Safari, Firefox, desktop Safari) never fires
 * that event, so callers should fall back to showing `hint` as plain
 * instructions whenever `canPrompt` is false.
 */
export function useInstallPrompt() {
  const [deferredEvent, setDeferredEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isStandalone());

  useEffect(() => {
    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferredEvent(null);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferredEvent) return;
    await deferredEvent.prompt();
    await deferredEvent.userChoice;
    setDeferredEvent(null);
  };

  return {
    installed,
    canPrompt: deferredEvent != null,
    promptInstall,
    hint: fallbackHint(),
  };
}
