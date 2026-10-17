import Pressable from "./Pressable";
import React, { useState } from "react";
import { useAppVersion } from "../hooks/useAppVersion";

export default function VersionNotice() {
  const update = useAppVersion(),
    [dismissed, setDismissed] = useState(() => {
      try {
        return typeof sessionStorage !== "undefined"
          ? sessionStorage.getItem("no_offside_dismissed_version") || null
          : null;
      } catch {
        return null;
      }
    });

  if (!update.availableVersion || dismissed === update.availableVersion)
    return null;

  const handleDismiss = () => {
    setDismissed(update.availableVersion);
    try {
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.setItem(
          "no_offside_dismissed_version",
          update.availableVersion,
        );
      }
    } catch {}
    update.dismissUpdate?.();
  };

  const handleApply = async () => {
    const success = await update.applyUpdate();
    if (success) {
      setDismissed(update.availableVersion);
    }
  };

  return (
    <aside className="version-notice" aria-label="Cập nhật ứng dụng">
      <p role="status">
        {update.isUpdating
          ? "Đang mở phiên bản mới…"
          : "No Offside có phiên bản mới."}
      </p>
      {update.updateError && <p role="alert">{update.updateError}</p>}
      <div>
        <Pressable
          type="button"
          onClick={handleApply}
          disabled={update.isUpdating}
        >
          Cập nhật
        </Pressable>
        <Pressable
          type="button"
          onClick={handleDismiss}
          disabled={update.isUpdating}
        >
          Để sau
        </Pressable>
      </div>
    </aside>
  );
}

