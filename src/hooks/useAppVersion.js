import { useState, useEffect, useRef, useCallback } from "react";
import { pendingWriteCount } from "../lib/pendingWrites";

const CURRENT_VERSION =
  typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev";

const APPLIED_VERSION_KEY = "no_offside_applied_version";
const APPLIED_AT_KEY = "no_offside_applied_at";
const DISMISSED_VERSION_KEY = "no_offside_dismissed_version";

function getSessionItem(key) {
  try {
    return typeof sessionStorage !== "undefined"
      ? sessionStorage.getItem(key)
      : null;
  } catch {
    return null;
  }
}

function setSessionItem(key, value) {
  try {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(key, value);
    }
  } catch {}
}

function removeSessionItem(key) {
  try {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem(key);
    }
  } catch {}
}

export function useAppVersion() {
  const [availableVersion, setAvailableVersion] = useState(null),
    [isUpdating, setIsUpdating] = useState(false),
    [updateError, setUpdateError] = useState("");
  const checking = useRef(false),
    dirty = useRef(new Set());

  useEffect(() => {
    const changed = (event) => {
      const target = event.target;
      if (target?.matches?.("[data-persisted-draft]")) return;
      const container = target?.closest?.('form,[role="dialog"]');
      if (container) dirty.current.add(container);
    };
    const saved = (event) => {
      if (event.target) dirty.current.delete(event.target);
    };
    document.addEventListener("input", changed, true);
    document.addEventListener("change", changed, true);
    document.addEventListener("no-offside-form-saved", saved, true);
    return () => {
      document.removeEventListener("input", changed, true);
      document.removeEventListener("change", changed, true);
      document.removeEventListener("no-offside-form-saved", saved, true);
    };
  }, []);

  const checkVersion = useCallback(async () => {
    if (
      checking.current ||
      typeof window === "undefined" ||
      navigator.onLine === false
    )
      return;
    checking.current = true;
    try {
      const appliedVersion = getSessionItem(APPLIED_VERSION_KEY);
      const appliedAt = Number(getSessionItem(APPLIED_AT_KEY) || 0);
      const isRecentlyApplied = (ver) =>
        Boolean(
          appliedVersion &&
            appliedVersion === ver &&
            Date.now() - appliedAt < 60000,
        );
      const dismissedVersion = getSessionItem(DISMISSED_VERSION_KEY);

      let serverVersion = null;
      const response = await fetch("/version.json", { cache: "no-store" });
      if (response.ok) {
        const data = await response.json();
        if (data.version && data.version !== "dev") {
          serverVersion = data.version;
          if (CURRENT_VERSION !== "dev" && data.version !== CURRENT_VERSION) {
            if (
              !isRecentlyApplied(data.version) &&
              dismissedVersion !== data.version
            ) {
              setAvailableVersion(data.version);
            }
          } else {
            removeSessionItem(APPLIED_VERSION_KEY);
            removeSessionItem(APPLIED_AT_KEY);
            setAvailableVersion(null);
          }
        }
      }

      const registration = await navigator.serviceWorker?.getRegistration();
      if (registration) {
        await registration.update().catch(() => {});
        if (registration.waiting) {
          const shouldPromptSw =
            (!serverVersion || serverVersion !== CURRENT_VERSION) &&
            !isRecentlyApplied("service-worker") &&
            dismissedVersion !== "service-worker";
          if (shouldPromptSw) {
            setAvailableVersion((version) => version || "service-worker");
          }
        }
      }
    } catch {
      /* Offline checks never interrupt the current task. */
    } finally {
      checking.current = false;
    }
  }, []);

  const applyUpdate = useCallback(async () => {
    if (pendingWriteCount() > 0 || window.__no_offside_busy_saving) {
      setUpdateError("Đang lưu dữ liệu. Hãy đợi lưu xong rồi cập nhật.");
      return false;
    }
    for (const element of dirty.current) {
      if (!element.isConnected) dirty.current.delete(element);
    }
    if (dirty.current.size) {
      setUpdateError(
        "Hãy lưu hoặc đóng biểu mẫu đang chỉnh trước khi cập nhật.",
      );
      return false;
    }
    const saveDrafts = new CustomEvent("save-active-drafts", {
      cancelable: true,
    });
    if (!window.dispatchEvent(saveDrafts)) {
      setUpdateError("Chưa lưu được bản nháp. Vui lòng thử lại.");
      return false;
    }
    setIsUpdating(true);
    setUpdateError("");
    try {
      const targetVersion = availableVersion || "service-worker";
      setSessionItem(APPLIED_VERSION_KEY, targetVersion);
      setSessionItem(APPLIED_AT_KEY, String(Date.now()));

      const registration = await navigator.serviceWorker?.getRegistration();
      if (registration) {
        // 1. If service worker is still installing, wait for it to reach installed state
        if (!registration.waiting && registration.installing) {
          const installingWorker = registration.installing;
          await new Promise((resolve) => {
            const onStateChange = () => {
              if (
                installingWorker.state === "installed" ||
                installingWorker.state === "redundant"
              ) {
                installingWorker.removeEventListener(
                  "statechange",
                  onStateChange,
                );
                resolve();
              }
            };
            installingWorker.addEventListener("statechange", onStateChange);
            setTimeout(() => {
              installingWorker.removeEventListener(
                "statechange",
                onStateChange,
              );
              resolve();
            }, 6000);
          });
        }

        // 2. If a worker is waiting, post SKIP_WAITING and await controller change
        const waitingWorker = registration.waiting;
        if (waitingWorker) {
          await new Promise((resolve) => {
            let finished = false;
            const onFinish = () => {
              if (finished) return;
              finished = true;
              clearTimeout(timer);
              navigator.serviceWorker.removeEventListener(
                "controllerchange",
                onFinish,
              );
              resolve();
            };
            const timer = setTimeout(onFinish, 3000);
            navigator.serviceWorker.addEventListener(
              "controllerchange",
              onFinish,
            );
            try {
              waitingWorker.postMessage({ type: "SKIP_WAITING" });
            } catch {
              onFinish();
            }
          });
        } else if (availableVersion && availableVersion !== "service-worker") {
          // If no waiting or installing worker is available, unregister old SW so reload fetches latest index.html directly from server
          try {
            await registration.unregister();
          } catch {}
        }
      }

      if (pendingWriteCount() > 0 || window.__no_offside_busy_saving)
        throw Error("Có dữ liệu đang lưu. Đợi hoàn tất rồi cập nhật.");
      for (const element of dirty.current) {
        if (!element.isConnected) dirty.current.delete(element);
      }
      if (dirty.current.size)
        throw Error(
          "Hãy lưu hoặc đóng biểu mẫu đang chỉnh trước khi cập nhật.",
        );
      if (
        !window.dispatchEvent(
          new CustomEvent("save-active-drafts", { cancelable: true }),
        )
      )
        throw Error("Chưa lưu được bản nháp. Vui lòng thử lại.");
      window.location.reload();
      return true;
    } catch (error) {
      setIsUpdating(false);
      setUpdateError(error.message);
      return false;
    }
  }, [availableVersion]);

  const dismissUpdate = useCallback(() => {
    if (availableVersion) {
      setSessionItem(DISMISSED_VERSION_KEY, availableVersion);
      setAvailableVersion(null);
    }
  }, [availableVersion]);

  useEffect(() => {
    checkVersion();
    const visible = () => {
      if (document.visibilityState === "visible") checkVersion();
    };
    window.addEventListener("online", visible);
    window.addEventListener("focus", visible);
    document.addEventListener("visibilitychange", visible);
    const interval = setInterval(visible, 60000);

    let swCleanUp = null;
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .getRegistration()
        .then((reg) => {
          if (!reg) return;
          const onUpdateFound = () => {
            const newWorker = reg.installing;
            if (!newWorker) return;
            newWorker.addEventListener("statechange", () => {
              if (
                newWorker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                checkVersion();
              }
            });
          };
          reg.addEventListener("updatefound", onUpdateFound);
          swCleanUp = () =>
            reg.removeEventListener("updatefound", onUpdateFound);
        })
        .catch(() => {});
    }

    return () => {
      clearInterval(interval);
      window.removeEventListener("online", visible);
      window.removeEventListener("focus", visible);
      document.removeEventListener("visibilitychange", visible);
      if (swCleanUp) swCleanUp();
    };
  }, [checkVersion]);

  return {
    currentVersion: CURRENT_VERSION,
    availableVersion,
    isUpdating,
    updateError,
    checkVersion,
    applyUpdate,
    dismissUpdate,
  };
}
