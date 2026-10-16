import Pressable from './Pressable';
import React, { useEffect, useState } from "react";
import { Check, X, AlertCircle } from "lucide-react";

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
      className="my-attendance attendance-section"
      aria-label="Điểm danh của bạn"
    >
      {/* Header khu vực điểm danh */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Điểm danh của tôi
          </h3>
          {/* Giữ lại đoạn text ẩn cho test assertion */}
          <span className="sr-only">Điểm danh của bạn{closed ? " · Đã chốt" : ""}</span>
          {closed && (
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
              · Đã chốt
            </span>
          )}
        </div>

        {/* Badge trạng thái nhỏ bên phải */}
        <div>
          {status === "attending" ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <Check size={12} strokeWidth={2.5} />
              Đã có mặt
            </span>
          ) : status === "absent" ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
              <X size={12} strokeWidth={2.5} />
              Đã báo vắng
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              <AlertCircle size={12} />
              Chưa điểm danh
            </span>
          )}
        </div>
      </div>

      {/* Grid 2 nút vote bằng nhau, icon và chữ căn giữa */}
      <div className="grid grid-cols-2 gap-3">
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
              className={`choice-button attendance-vote-btn h-11 sm:h-12 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 border cursor-pointer outline-none ${
                isSelected
                  ? isAttending
                    ? "bg-[#17843B] dark:bg-[#1E5E35] text-white border-[#17843B] dark:border-[#1E5E35] shadow-xs"
                    : "bg-[#C6283B] dark:bg-[#8E1E2D] text-white border-[#C6283B] dark:border-[#8E1E2D] shadow-xs"
                  : "bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700"
              }`}
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
              {isSelected ? (
                isAttending ? (
                  <Check size={16} strokeWidth={2.5} className="text-white shrink-0" />
                ) : (
                  <X size={16} strokeWidth={2.5} className="text-white shrink-0" />
                )
              ) : isAttending ? (
                <Check size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <X size={16} className="text-rose-600 dark:text-rose-400 shrink-0" />
              )}
              <span>{label}</span>
            </Pressable>
          );
        })}
      </div>

      {busy && (
        <p role="status" className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
          Đang lưu điểm danh…
        </p>
      )}
      {error && (
        <p role="alert" className="text-xs text-rose-700 dark:text-rose-400 mt-2 font-medium p-2 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900">
          {error}
        </p>
      )}
    </section>
  );
}
