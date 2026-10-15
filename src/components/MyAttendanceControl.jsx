import React, { useEffect, useState } from "react";
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
      className="my-attendance"
      aria-label="Điểm danh của bạn"
    >
      <p className="text-xs font-semibold mb-2">
        Điểm danh của bạn{closed ? " · Đã chốt" : ""}
      </p>
      <div className="grid grid-cols-3 gap-2">
        {[
          ["attending", "Có mặt"],
          ["maybe", "Chưa chắc"],
          ["absent", "Báo vắng"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            className="choice-button"
            aria-pressed={status === value}
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
            {label}
          </button>
        ))}
      </div>
      {busy && (
        <p role="status" className="text-xs mt-2">
          Đang lưu điểm danh…
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-rose-700 mt-2">
          {error}
        </p>
      )}
    </section>
  );
}
