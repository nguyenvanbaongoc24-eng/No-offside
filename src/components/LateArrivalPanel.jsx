import Pressable from './Pressable';
import React, { useEffect, useId, useRef, useState } from "react";
import { createPortal } from 'react-dom';
import { useLayerBack } from '../hooks/useLayerBack';
import { lateArrivalInstant, matchTimeLabel } from '../lib/matchTime';
import { Clock, X } from "./icons";
import { canRequestLate, lateCutoff, latestEvent } from "../lib/governance";

export default function LateArrivalPanel({ governance, matchId, userId }) {
  const [now, setNow] = useState(Date.now()),
    [open, setOpen] = useState(false),
    [eta, setEta] = useState(""),
    [reason, setReason] = useState(""),
    [error, setError] = useState(""),
    [etaError, setEtaError] = useState(""),
    [busy, setBusy] = useState(false);
  const key = useRef(crypto.randomUUID()),
    prefix = useId();

  useLayerBack(open, () => { if (!busy) setOpen(false); });

  useEffect(() => {
    setOpen(false); setEta(''); setReason(''); setError(''); setEtaError('');
    key.current = crypto.randomUUID();
  }, [matchId, userId]);

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
  const zone = snapshot?.team.timezone || 'Asia/Ho_Chi_Minh';
  const format = (value) => matchTimeLabel(value, zone);

  const updateEta = (value) => {
    setEta(value);
    try { lateArrivalInstant(match.kickoff, value, zone); setEtaError(''); }
    catch (err) { setEtaError(err.message); }
  };

  const arrival = latestEvent(
    snapshot?.events || [],
    "arrival",
    userId,
    matchId,
  );

  const submit = async (e) => {
    e.preventDefault();
    if (busy || !allowed) return;
    setError("");
    const time = e.currentTarget.elements.namedItem('eta').value;
    const note = e.currentTarget.elements.namedItem('reason').value.trim();
    let instant;
    try { instant = lateArrivalInstant(match.kickoff, time, zone); }
    catch (err) { setEtaError(err.message); return; }
    setEtaError('');
    if (note.length < 3) { setError('Nhập lý do ít nhất 3 ký tự.'); return; }
    setBusy(true);
    try {
      await governance.mutate(
        "late_request",
        { matchId, eta: instant, reason: note },
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
    <div className="late-arrival-section border-t border-slate-200 dark:border-slate-800 mt-4 pt-4">
      {/* Header khu vực Đến muộn */}
      <div className="flex items-center justify-between gap-3 mb-2">
        <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          Đến muộn
        </h3>

        {/* Nút hành động */}
        {!request ? (
          <Pressable
            className="choice-button text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer outline-none"
            disabled={!allowed || busy}
            onClick={() => { setError(''); setEtaError(''); setOpen(true); }}
          >
            <Clock size={14} className="shrink-0 text-slate-500 dark:text-slate-400" />
            Xin đến muộn
          </Pressable>
        ) : allowed && status === "pending" ? (
          <Pressable
            className="choice-button text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer outline-none"
            disabled={busy}
            onClick={() => { setError(''); setEtaError(''); setOpen(true); }}
          >
            Sửa yêu cầu
          </Pressable>
        ) : null}
      </div>

      {/* Khối thông tin xin muộn */}
      {!request ? (
        <div className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          {!match ? (
            <p>
              {governance.loading
                ? "Đang kiểm tra nghiệp vụ trên server…"
                : "Chưa kết nối nghiệp vụ cho trận này. Xin muộn chưa được bật."}
            </p>
          ) : (
            <p>
              {finalized
                ? "Đã chốt vi phạm; cần người có quyền tạo điều chỉnh."
                : allowed
                  ? `Có thể gửi đến ${format(cutoff)}`
                  : `Không thể gửi mới. Hạn: ${format(cutoff)}`}
            </p>
          )}
        </div>
      ) : (
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 mb-3 space-y-1.5 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-slate-600 dark:text-slate-300">
              Trạng thái xin muộn:
            </span>
            <span
              className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                status === "pending"
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-700"
                  : status === "approved"
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700"
                    : "bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-700"
              }`}
            >
              {{
                pending: "Chờ duyệt",
                approved: "Được duyệt",
                rejected: "Từ chối",
              }[status] || status}
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-700 dark:text-slate-200">
            <span className="text-slate-500 dark:text-slate-400">Giờ dự kiến:</span>
            <span className="font-bold">{format(request.data.eta)}</span>
          </div>
          {request.data.reason && (
            <p className="text-slate-600 dark:text-slate-300 text-[11px] pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
              <span className="text-slate-400 dark:text-slate-500">Lý do: </span>
              {request.data.reason}
            </p>
          )}
          {decision?.data.reason && (
            <p className="text-slate-500 dark:text-slate-400 text-[11px] italic">
              Phản hồi: {decision.data.reason}
            </p>
          )}
        </div>
      )}

      {/* Dòng giờ đến thực tế trình bày riêng biệt */}
      <div className="space-y-1 text-xs">
        <p className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${arrival ? "bg-emerald-500" : "bg-slate-400"}`} />
          <span>
            {arrival
              ? `Giờ đến đã được xác nhận: ${format(arrival.data.arrivedAt)}`
              : "Chưa xác nhận giờ đến sân."}
          </span>
        </p>

        {/* Dòng giải thích phụ */}
        <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-3 leading-relaxed">
          Điểm danh có mặt không thay thế xác nhận giờ đến.
        </p>
      </div>

      {/* Modal gửi yêu cầu xin muộn */}
      {open && createPortal(
        <div
          className="simple-overlay late-arrival-overlay backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Xin đến muộn"
          onClick={(e) => { if (e.target === e.currentTarget && !busy) setOpen(false); }}
        >
          <section className="simple-sheet late-arrival-sheet overflow-y-auto">
            <Pressable
              className="sheet-close"
              aria-label="Đóng"
              disabled={busy}
              onClick={() => setOpen(false)}
            >
              <X size={20} />
            </Pressable>
            <h2 className="text-xl font-semibold">Xin đến muộn</h2>
            <form onSubmit={submit} className="space-y-4 mt-4">
              <p className="field-hint">Giờ bắt đầu: {format(match.kickoff)}. Ngày đến sân là ngày diễn ra trận.</p>
              <div className="form-field">
                <label htmlFor={prefix + "-eta"}>Giờ dự kiến đến</label>
                <div className="relative flex items-center w-full">
                  <input
                    id={prefix + "-eta"}
                    type="time"
                    name="eta"
                    step="60"
                    value={eta}
                    required
                    aria-invalid={Boolean(etaError)}
                    aria-describedby={etaError ? prefix + '-eta-error' : undefined}
                    onInput={(e) => updateEta(e.currentTarget.value)}
                    onChange={(e) => updateEta(e.currentTarget.value)}
                    className="w-full"
                  />
                  {!eta && (
                    <span className="pointer-events-none absolute left-4 text-slate-400 text-sm flex items-center gap-1.5 select-none">
                      <Clock size={16} /> Chọn giờ đến (VD: 19:45)
                    </span>
                  )}
                </div>
                {etaError && <p id={prefix + '-eta-error'} className="form-error" role="alert">{etaError}</p>}
              </div>
              <div className="form-field">
                <label htmlFor={prefix + "-reason"}>Lý do</label>
                <textarea
                  id={prefix + "-reason"}
                  name="reason"
                  required
                  minLength={3}
                  maxLength={2000}
                  placeholder="Nhập lý do đến muộn (VD: Kẹt xe, bận việc đột xuất…)"
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
        </div>, document.body
      )}
    </div>
  );
}
