import Pressable from './Pressable';
import React, { useEffect, useState } from "react";
import { CheckCircle2, XCircle, AlertCircle, ShieldAlert } from "lucide-react";

export default function MyAttendanceControl({
  status,
  deadline,
  completed,
  onChange,
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const remaining = Date.parse(deadline) - Date.now();
    if (completed || !Number.isFinite(remaining) || remaining <= 0) return;
    const timer = setTimeout(
      () => setNow(Date.now()),
      Math.min(remaining, 2147483647),
    );
    return () => clearTimeout(timer);
  }, [deadline, completed, now]);

  const closed =
    completed ||
    !Number.isFinite(Date.parse(deadline)) ||
    now >= Date.parse(deadline);

  return (
    <section
      id="match-attendance"
      className="my-attendance pitch-attendance-control"
      aria-label="Điểm danh của bạn"
    >
      {/* Header khu vực điểm danh với badge trạng thái nổi bật */}
      <div className="flex items-center justify-between mb-2.5">
        <p className="text-xs font-bold text-white tracking-wide flex items-center gap-1.5">
          <span>Điểm danh của bạn{closed ? " · Đã chốt" : ""}</span>
        </p>
        <div>
          {status === "attending" ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-400/25 text-emerald-200 border border-emerald-400/40 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Đã chốt đá ⚽
            </span>
          ) : status === "absent" ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-500/25 text-rose-200 border border-rose-400/40 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              Đã báo vắng ❌
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-400/25 text-amber-200 border border-amber-300/40 animate-pulse">
              <AlertCircle className="w-3 h-3 text-amber-300" />
              Chưa chốt
            </span>
          )}
        </div>
      </div>

      {/* Grid 2 nút vote phong cách sân cỏ */}
      <div className="grid grid-cols-2 gap-2.5">
        {[
          ["attending", "Có mặt"],
          ["absent", "Báo vắng"],
        ].map(([value, label]) => {
          const isAttending = value === "attending";
          const isSelected = status === value;

          return (
            <Pressable
              key={value}
              type="button"
              className={`choice-button pitch-vote-btn ${
                isAttending ? "pitch-vote-attending" : "pitch-vote-absent"
              } ${isSelected ? "is-selected" : ""}`}
              aria-pressed={isSelected}
              disabled={closed || busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  await onChange(value);
                } catch (e) {
                  setError(e.message || "Không lưu được điểm danh. Hãy thử lại.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              <span className="flex items-center justify-center gap-1.5 font-bold text-sm tracking-tight">
                {isAttending ? (
                  <CheckCircle2
                    className={`w-4 h-4 shrink-0 transition-transform ${
                      isSelected ? "text-white scale-110" : "text-emerald-300/80"
                    }`}
                  />
                ) : (
                  <XCircle
                    className={`w-4 h-4 shrink-0 transition-transform ${
                      isSelected ? "text-white scale-110" : "text-rose-300/80"
                    }`}
                  />
                )}
                <span>{label}</span>
              </span>
            </Pressable>
          );
        })}
      </div>

      {busy && (
        <p role="status" className="text-xs text-emerald-200 mt-2 font-medium flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
          Đang lưu điểm danh…
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-rose-200 mt-2 font-semibold bg-rose-950/60 p-2 rounded-xl border border-rose-500/40">
          {error}
        </p>
      )}
    </section>
  );
}
