import { useState, useEffect, useRef, useCallback } from "react";
import { pendingWriteCount } from "../lib/pendingWrites";
const CURRENT_VERSION =
  typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev";

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
      const response = await fetch("/version.json", { cache: "no-store" });
      if (response.ok) {
        const data = await response.json();
        if (
          data.version &&
          data.version !== "dev" &&
          CURRENT_VERSION !== "dev" &&
          data.version !== CURRENT_VERSION
        )
          setAvailableVersion(data.version);
      }
      const registration = await navigator.serviceWorker?.getRegistration();
      if (registration) {
        await registration.update();
        if (registration.waiting)
          setAvailableVersion((version) => version || "service-worker");
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
      const registration = await navigator.serviceWorker?.getRegistration();
      if (registration?.waiting) {
        // Wait for this tab's controller transition; never force reload another tab.
        await new Promise((resolve) => {
          const changed = () => {
            clearTimeout(timer);
            navigator.serviceWorker.removeEventListener(
              "controllerchange",
              changed,
            );
            resolve();
          };
          const timer = setTimeout(() => {
            navigator.serviceWorker.removeEventListener(
              "controllerchange",
              changed,
            );
            // Fallback: nếu sau 3 giây sự kiện controllerchange không kích hoạt (ví dụ worker cũ bị lỗi importScripts),
            // vẫn tự động tiếp tục để tải lại trang với phiên bản mới từ server thay vì chặn đứng người dùng.
            resolve();
          }, 3000);
          navigator.serviceWorker.addEventListener("controllerchange", changed);
          try {
            registration.waiting.postMessage({ type: "SKIP_WAITING" });
          } catch {
            resolve();
          }
        });
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
  }, []);
  useEffect(() => {
    checkVersion();
    const visible = () => {
      if (document.visibilityState === "visible") checkVersion();
    };
    window.addEventListener("online", visible);
    window.addEventListener("focus", visible);
    document.addEventListener("visibilitychange", visible);
    const interval = setInterval(visible, 60000);
    return () => {
      clearInterval(interval);
      window.removeEventListener("online", visible);
      window.removeEventListener("focus", visible);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [checkVersion]);
  return {
    currentVersion: CURRENT_VERSION,
    availableVersion,
    isUpdating,
    updateError,
    checkVersion,
    applyUpdate,
  };
}
