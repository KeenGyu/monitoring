import { useEffect } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import "./OfflineStatus.css";

/**
 * Registers the service worker and surfaces two things to the user:
 *  - a one-time "ready to work offline" toast right after the first
 *    successful install (self-dismisses)
 *  - a persistent "update available" bar once a new build has been
 *    precached in the background, with a button to reload into it
 *
 * Renders nothing (null) the rest of the time.
 */
export function OfflineStatus() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // Poll for a new version periodically so a tab left open for days
      // still eventually offers the update instead of only checking once.
      if (!registration) return;
      setInterval(() => {
        registration.update();
      }, 60 * 60 * 1000); // hourly
    },
  });

  useEffect(() => {
    if (!offlineReady) return;
    const t = setTimeout(() => setOfflineReady(false), 3500);
    return () => clearTimeout(t);
  }, [offlineReady, setOfflineReady]);

  if (needRefresh) {
    return (
      <div className="sw-toast sw-toast-update" role="status">
        <span className="sw-toast-icon" aria-hidden="true">
          ⇧
        </span>
        <div>
          <div className="sw-toast-title">Update available</div>
          <div className="sw-toast-message">A new version has been downloaded.</div>
        </div>
        <button
          className="btn btn-sm btn-primary"
          onClick={() => updateServiceWorker(true)}
        >
          Reload
        </button>
        <button
          className="sw-toast-close"
          onClick={() => setNeedRefresh(false)}
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    );
  }

  if (offlineReady) {
    return (
      <div className="sw-toast sw-toast-ready" role="status">
        <span className="sw-toast-icon" aria-hidden="true">
          ✓
        </span>
        <div>
          <div className="sw-toast-title">Ready to work offline</div>
          <div className="sw-toast-message">This app now loads even without a connection.</div>
        </div>
        <button
          className="sw-toast-close"
          onClick={() => setOfflineReady(false)}
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    );
  }

  return null;
}