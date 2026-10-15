import React, { useState } from "react";
import { useAppVersion } from "../hooks/useAppVersion";
export default function VersionNotice() {
  const update = useAppVersion(),
    [dismissed, setDismissed] = useState(null);
  if (!update.availableVersion || dismissed === update.availableVersion)
    return null;
  return (
    <aside className="version-notice" aria-label="Cập nhật ứng dụng">
      <p role="status">
        {update.isUpdating
          ? "Đang mở phiên bản mới…"
          : "No Offside có phiên bản mới."}
      </p>
      {update.updateError && <p role="alert">{update.updateError}</p>}
      <div>
        <button
          type="button"
          onClick={update.applyUpdate}
          disabled={update.isUpdating}
        >
          Cập nhật
        </button>
        <button
          type="button"
          onClick={() => setDismissed(update.availableVersion)}
          disabled={update.isUpdating}
        >
          Để sau
        </button>
      </div>
    </aside>
  );
}
