import { useState, useEffect, useCallback } from "react";

// PWA install: captures the beforeinstallprompt event, tracks whether the app
// is already installed, detects which platform/browser we're on, and decides
// whether the auto-banner should show.
//
// Consumed by App (banner) and SettingsTab (manual "Install app" row).

const DISMISS_KEY = "dabus_install_dismissed";
const DISMISS_DAYS = 14;
// Give the user a moment to look at actual bus times before asking anything.
const BANNER_DELAY_MS = 4000;

// ?installdebug=1 bypasses the dismissal window so the banner can be re-tested
// without clearing site data.
const DEBUG_BYPASS = new URLSearchParams(window.location.search).has(
  "installdebug"
);

/**
 * "ios-safari"  — can install via Share > Add to Home Screen
 * "ios-other"   — Chrome/Firefox/Edge/in-app webview on iOS. CANNOT install.
 *                 Apple only allows real installs from Safari, so telling these
 *                 users to tap Share produces a bookmark, not an app.
 * "other"       — Android/desktop. Uses the beforeinstallprompt event.
 */
export function detectPlatform() {
  const ua = navigator.userAgent;
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    // iPadOS 13+ identifies itself as a Mac; touch points give it away.
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  if (!isIOS) return "other";

  const isSafari =
    !/CriOS|FxiOS|EdgiOS|OPiOS|GSA|FBAN|FBAV|Instagram|Line|Twitter/i.test(ua);
  return isSafari ? "ios-safari" : "ios-other";
}

function detectInstalled() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS reports standalone here rather than via display-mode.
    window.navigator.standalone === true
  );
}

function wasRecentlyDismissed() {
  if (DEBUG_BYPASS) return false;
  try {
    const ts = Number(localStorage.getItem(DISMISS_KEY) || 0);
    return Date.now() - ts < DISMISS_DAYS * 864e5;
  } catch {
    // Private mode / storage disabled — treat as not dismissed.
    return false;
  }
}

export function usePwaInstall() {
  const [platform] = useState(detectPlatform);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(detectInstalled);
  const [dismissed, setDismissed] = useState(wasRecentlyDismissed);
  const [iosDelayPassed, setIosDelayPassed] = useState(false);

  useEffect(() => {
    const onBeforeInstall = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    const onInstalled = () => {
      setInstallPrompt(null);
      setIsInstalled(true);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // iOS never fires beforeinstallprompt, so the banner is time-gated instead.
  useEffect(() => {
    if (!platform.startsWith("ios") || isInstalled || dismissed) return;
    const t = setTimeout(() => setIosDelayPassed(true), BANNER_DELAY_MS);
    return () => clearTimeout(t);
  }, [platform, isInstalled, dismissed]);

  const dismissBanner = useCallback(() => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // Non-fatal: the banner just reappears next session.
    }
    setDismissed(true);
  }, []);

  const promptInstall = useCallback(async () => {
    if (!installPrompt) return;

    // A beforeinstallprompt event is single-use: calling prompt() twice on the
    // same event throws. So the event is cleared on BOTH outcomes, not just on
    // accept — otherwise the Settings "Install" row stays visible holding a
    // spent event and does nothing when tapped. Chrome re-fires the event on
    // the next page load, which restores the row.
    let outcome = "dismissed";
    try {
      installPrompt.prompt();
      ({ outcome } = await installPrompt.userChoice);
    } catch {
      // Already-consumed event, or the user backgrounded the app mid-dialog.
    }
    setInstallPrompt(null);

    if (outcome === "accepted") {
      setIsInstalled(true);
    } else {
      // Declining counts as a dismissal — don't re-surface the banner
      // on the next load.
      dismissBanner();
    }
  }, [installPrompt, dismissBanner]);

  const canInstall = platform === "other" ? !!installPrompt : iosDelayPassed;
  const showBanner = !isInstalled && !dismissed && canInstall;

  return {
    installPrompt,
    isInstalled,
    promptInstall,
    platform,
    showBanner,
    dismissBanner,
  };
}
