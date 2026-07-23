import { useState } from "react";
import { useInstallPrompt } from "../hooks/useInstallPrompt";

const DISMISS_KEY = "blca-install-dismissed";

export function InstallBanner() {
  const { installed, canPrompt, promptInstall, showIosHint } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === "1");

  if (installed || dismissed || (!canPrompt && !showIosHint)) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  return (
    <div className="install-banner">
      {canPrompt ? (
        <>
          <span>Install this app for one-tap access on your route.</span>
          <div className="install-banner-actions">
            <button className="btn btn-primary" onClick={promptInstall}>
              Install app
            </button>
            <button className="btn btn-link" onClick={dismiss}>
              Not now
            </button>
          </div>
        </>
      ) : (
        <>
          <span>
            Install this app: tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>.
          </span>
          <button className="btn btn-link" onClick={dismiss}>
            Got it
          </button>
        </>
      )}
    </div>
  );
}
