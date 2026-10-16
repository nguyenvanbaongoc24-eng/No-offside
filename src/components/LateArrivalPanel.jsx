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
  const updateEta = value => {
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
    <div className="border-t border-slate-200 mt-4 pt-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">Đến muộn & giờ đến sân</h3>
        <Pressable
          className="choice-button text-sm"
          disabled={!allowed || busy}
          onClick={() => {setError(''); setEtaError(''); setOpen(true);}}
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
              : "Không thể gửi mới. Hạn: " + format(cutoff)}
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
      {open && createPortal(
        <div
          className="simple-overlay late-arrival-overlay backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Xin đến muộn"
          onClick={(e) => {if (e.target === e.currentTarget && !busy) setOpen(false);}}
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
                />
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
