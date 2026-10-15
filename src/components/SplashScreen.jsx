import React, { useState } from "react";
import { Loader2 } from "lucide-react";
export default function SplashScreen({ error = "", onRetry, onExit }) {
  const [leaving, setLeaving] = useState(false),
    [exitError, setExitError] = useState("");
  return (
    <section className="splash-screen" aria-label="Khởi động No Offside">
      <div className="splash-identity">
        <div className="splash-logo">
          <img
            src="/pwa-512x512.png"
            width="96"
            height="96"
            alt="Logo No Offside"
          />
        </div>
        <h1>NO OFFSIDE</h1>
        <p className="splash-tagline">Hẹn nhau ra sân.</p>
        {error ? (
          <div className="splash-error">
            <p role="alert">{error}</p>
            <button
              type="button"
              className="primary-button"
              disabled={leaving}
              onClick={onRetry}
            >
              Thử lại
            </button>
            {onExit && (
              <button
                type="button"
                className="choice-button mt-3"
                disabled={leaving}
                onClick={async () => {
                  setLeaving(true);
                  setExitError("");
                  try {
                    await onExit();
                  } catch (e) {
                    setExitError(
                      e.message || "Không đăng xuất được. Vui lòng thử lại.",
                    );
                  } finally {
                    setLeaving(false);
                  }
                }}
              >
                {leaving ? "Đang đăng xuất…" : "Đăng nhập lại"}
              </button>
            )}
            {exitError && <p role="alert">{exitError}</p>}
          </div>
        ) : (
          <div
            className="splash-progress"
            role="status"
            aria-label="Đang khởi động"
          >
            <Loader2 size={22} aria-hidden="true" />
            <span className="sr-only">Đang khởi động</span>
          </div>
        )}
      </div>
    </section>
  );
}
