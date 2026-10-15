import React, { useEffect, useState } from "react";
export default function MatchCountdown({ deadline, sentence = false }) {
  const [now, setNow] = useState(Date.now());
  const end = Date.parse(deadline);
  useEffect(() => {
    setNow(Date.now());
    if (!Number.isFinite(end) || end <= Date.now()) return;
    const timer = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= end) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [end]);
  if (!Number.isFinite(end)) return <span>Chưa có hạn điểm danh</span>;
  const seconds = Math.max(0, Math.ceil((end - now) / 1000));
  if (!seconds) return <span>Đã chốt điểm danh</span>;
  const pad = (n) => String(n).padStart(2, "0");
  const remaining =
    (seconds >= 86400 ? Math.floor(seconds / 86400) + " ngày " : "") +
    pad(Math.floor(seconds / 3600) % 24) +
    ":" +
    pad(Math.floor(seconds / 60) % 60) +
    ":" +
    pad(seconds % 60);
  return (
    <span>{sentence ? `Còn ${remaining} để chốt danh sách` : remaining}</span>
  );
}
