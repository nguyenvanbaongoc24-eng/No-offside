import Pressable from './Pressable';
import React, { useEffect, useId, useRef, useState } from "react";
import { Clock, X } from "lucide-react";
import { canRequestLate, lateCutoff, latestEvent } from "../lib/governance";
export default function LateArrivalPanel({ governance, matchId, userId }) {
  const [now, setNow] = useState(Date.now()),
    [open, setOpen] = useState(false),
    [eta, setEta] = useState(""),
    [reason, setReason] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const key = useRef(crypto.randomUUID()),
    prefix = useId();
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const snapshot = governance.snapshot,
    match = snapshot?.matches.find((m) => m.id === matchId);
  const request = latestEvent(
    snapshot?.events || [],
    "late_request",
    userId,
    matchId,
  );
  const decision =
    request &&
    [...snapshot.events]
      .reverse()
      .find(
        (e) => e.action === "review_late" && e.data.requestId === request.id,
      );
  const status = decision?.data.status || request?.data.status;
  const cutoff = match && lateCutoff(match.kickoff, match.late_before);
  const finalized = snapshot?.events.some(
    (e) =>
      e.subject === userId &&
      e.match_id === matchId &&
      e.action === "violation",
  );
  const serverNow =
    snapshot && governance.receivedAt
      ? new Date(snapshot.serverNow).getTime() + now - governance.receivedAt
      : now;
  const allowed =
    match &&
    !match.archived_at &&
    !finalized &&
    canRequestLate(match.kickoff, match.late_before, serverNow) &&
    (snapshot.me.status === "active" ||
      (snapshot.me.status === "locked" &&
        snapshot.me.locked_until &&
        new Date(snapshot.me.locked_until).getTime() <= serverNow));
  const format = (value) =>
    new Date(value).toLocaleString("vi-VN", {
      timeZone: snapshot?.team.timezone || "Asia/Ho_Chi_Minh",
    });
  const arrival = latestEvent(
    snapshot?.events || [],
    "arrival",
    userId,
    matchId,
  );
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await governance.mutate(
        "late_request",
        { matchId, eta: new Date(eta).toISOString(), reason },
        key.current,
      );
      setOpen(false);
      key.current = crypto.randomUUID();
    } catch (err) {
      setError("Không gửi được: " + err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="border-t border-slate-200 mt-4 pt-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">Đến muộn & giờ đến sân</h3>
        <Pressable
          className="choice-button text-sm"
          disabled={!allowed || busy}
          onClick={() => setOpen(true)}
        >
          <Clock size={18} />
          Xin đến muộn
        </Pressable>
      </div>
      {!match ? (
        <p className="text-xs text-slate-500 mt-2">
          {governance.loading
            ? "Đang kiểm tra nghiệp vụ trên server…"
            : "Chưa kết nối nghiệp vụ cho trận này. Xin muộn chưa được bật."}
        </p>
      ) : (
        <p className="text-xs text-slate-500 mt-2">
          {finalized
            ? "Đã chốt vi phạm; cần người có quyền tạo điều chỉnh."
            : allowed
              ? "Có thể gửi đến " + format(cutoff)
              : "Không thể gửi mới. Hạn: " + format(cutoff)}{" "}
          · {snapshot.team.timezone}
        </p>
      )}
      {request && (
        <p className="text-sm mt-3">
          Xin muộn:{" "}
          <strong>
            {
              {
                pending: "Chờ duyệt",
                approved: "Được duyệt",
                rejected: "Từ chối",
              }[status]
            }
          </strong>{" "}
          · Dự kiến {format(request.data.eta)}
          {decision && (
            <span className="block text-xs text-slate-500">
              {decision.data.reason}
            </span>
          )}
        </p>
      )}
      <p className="text-xs text-slate-500 mt-2">
        {arrival
          ? "Giờ đến đã được xác nhận: " + format(arrival.data.arrivedAt)
          : "Giờ đến thực tế chưa được xác nhận. Bấm Có mặt chỉ ghi lời điểm danh."}
      </p>
      {open && (
        <div
          className="simple-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Xin đến muộn"
        >
          <section className="simple-sheet">
            <Pressable
              className="sheet-close"
              aria-label="Đóng"
              onClick={() => setOpen(false)}
            >
              <X size={20} />
            </Pressable>
            <h2 className="text-xl font-semibold">Xin đến muộn</h2>
            <form onSubmit={submit} className="space-y-4 mt-4">
              <div className="form-field">
                <label htmlFor={prefix + "-eta"}>Giờ dự kiến đến</label>
                <input
                  id={prefix + "-eta"}
                  type="datetime-local"
                  value={eta}
                  required
                  onChange={(e) => setEta(e.target.value)}
                  onInput={(e) => setEta(e.currentTarget.value)}
                />
                <span className="field-hint">
                  Nhập theo giờ thiết bị. Server kiểm tra hạn theo thời điểm
                  trận.
                </span>
              </div>
              <div className="form-field">
                <label htmlFor={prefix + "-reason"}>Lý do</label>
                <textarea
                  id={prefix + "-reason"}
                  required
                  minLength={3}
                  maxLength={2000}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
              <p className="text-xs text-slate-500">
                Được duyệt không tự miễn mọi khoản phạt. Chính sách của trận sẽ
                áp dụng.
              </p>
              {error && (
                <p role="alert" className="text-rose-700 text-sm">
                  {error}
                </p>
              )}
              <Pressable
                type="submit"
                className="primary-button w-full"
                disabled={!allowed || busy}
              >
                {busy ? "Đang gửi…" : "Gửi yêu cầu"}
              </Pressable>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
