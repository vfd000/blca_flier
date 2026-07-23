import { useInstallPrompt } from "../hooks/useInstallPrompt";

/**
 * Compact, non-dismissible install nudge for the Deliver page -- a second
 * home for it in case someone already dismissed the app-wide banner, since
 * "install this so it's on my home screen" is most relevant exactly when
 * they're standing in the driveway using delivery mode.
 */
export function InstallButton({ className }: { className?: string }) {
  const { installed, canPrompt, promptInstall, hint } = useInstallPrompt();
  if (installed) return null;

  const classes = ["install-button", className].filter(Boolean).join(" ");

  if (canPrompt) {
    return (
      <button className={`btn btn-link ${classes}`} onClick={promptInstall}>
        📲 Install this app
      </button>
    );
  }

  return <p className={`install-hint-inline ${classes}`}>📲 {hint}</p>;
}
