import { useState, useEffect, useRef, useCallback } from "react";

// Get current bundled build version defined at build time by Vite
const CURRENT_VERSION = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev";

export function useAppVersion() {
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState(null);
  const isChecking = useRef(false);
  const channelRef = useRef(null);

  // Cross-tab coordination channel
  useEffect(() => {
    if (typeof BroadcastChannel !== "undefined") {
      try {
        const bc = new BroadcastChannel("no_offside_version_sync");
        channelRef.current = bc;
        bc.onmessage = (event) => {
          if (event.data?.type === "VERSION_UPDATE_TRIGGERED") {
            performSafeReload(event.data.newVersion);
          }
        };
        return () => {
          bc.close();
        };
      } catch {}
    }
  }, []);

  const performSafeReload = useCallback(async (newVersion) => {
    // Avoid reload loops
    try {
      const lastReloaded = sessionStorage.getItem("no_offside_last_reloaded_version");
      if (lastReloaded === newVersion) {
        return;
      }
      sessionStorage.setItem("no_offside_last_reloaded_version", newVersion);
    } catch {}

    // Check if in the middle of active critical write
    if (typeof window !== "undefined" && window.__no_offside_busy_saving) {
      let waited = 0;
      while (window.__no_offside_busy_saving && waited < 4000) {
        await new Promise((r) => setTimeout(r, 400));
        waited += 400;
      }
    }

    // Trigger draft saving across components
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("save-active-drafts"));
    }

    setIsUpdating(true);

    // Wait a brief moment for status to be seen and drafts to flush
    await new Promise((r) => setTimeout(r, 600));

    // Clear old service worker asset caches only (keeps localStorage, cookies, and Supabase auth)
    if (typeof window !== "undefined" && "caches" in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map((name) => {
            // Delete cache storage assets
            return caches.delete(name);
          })
        );
      } catch {}
    }

    // Activate waiting service worker if present
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg?.waiting) {
          reg.waiting.postMessage({ type: "SKIP_WAITING" });
        }
      } catch {}
    }

    // Broadcast to other tabs so they synchronize
    try {
      channelRef.current?.postMessage({
        type: "VERSION_UPDATE_TRIGGERED",
        newVersion,
      });
    } catch {}

    // Reload preserving current route and auth session
    window.location.reload();
  }, []);

  const checkVersion = useCallback(async () => {
    if (isChecking.current || isUpdating || typeof window === "undefined") return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;

    isChecking.current = true;
    try {
      // Check version.json with cache-busting timestamp
      const timestamp = Date.now();
      let serverVersion = null;

      try {
        const res = await fetch(`/version.json?_t=${timestamp}`, {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        });
        if (res.ok) {
          const data = await res.json();
          serverVersion = data?.version;
        }
      } catch {}

      // Fallback to /api/version if version.json failed or was missing
      if (!serverVersion) {
        try {
          const apiRes = await fetch(`/api/version?_t=${timestamp}`, {
            cache: "no-store",
            headers: { "Cache-Control": "no-cache" },
          });
          if (apiRes.ok) {
            const apiData = await apiRes.json();
            serverVersion = apiData?.version;
          }
        } catch {}
      }

      // If SW update exists, trigger update check on registration
      if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
        try {
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg) {
            await reg.update();
            if (reg.waiting) {
              // Service worker has a newer version waiting
              await performSafeReload(serverVersion || "sw-updated");
              return;
            }
          }
        } catch {}
      }

      if (
        serverVersion &&
        serverVersion !== "dev" &&
        CURRENT_VERSION !== "dev" &&
        serverVersion !== CURRENT_VERSION
      ) {
        await performSafeReload(serverVersion);
      }
    } catch (err) {
      setUpdateError(err?.message || null);
    } finally {
      isChecking.current = false;
    }
  }, [isUpdating, performSafeReload]);

  useEffect(() => {
    // 1. Initial check on mount
    checkVersion();

    // 2. Foreground / Visibility change
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkVersion();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    // 3. Tab focus
    const onFocus = () => checkVersion();
    window.addEventListener("focus", onFocus);

    // 4. Network online restore
    const onOnline = () => {
      checkVersion();
    };
    window.addEventListener("online", onOnline);

    // 5. Periodic check every 60s, strictly when document is visible
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        checkVersion();
      }
    }, 60000);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
      clearInterval(interval);
    };
  }, [checkVersion]);

  return {
    currentVersion: CURRENT_VERSION,
    isUpdating,
    updateError,
    checkVersion,
  };
}
