import React, { useEffect, useId, useRef, useState } from 'react';
import Pressable from './Pressable';
import ProModal from './pro/ProModal';
import { matchLateRequests, lateStatusLabel } from '../lib/matchLateRequests';
import { matchTimeLabel } from '../lib/matchTime';
import { notify } from '../lib/feedback';

export default function MatchLateReview({ governance, matchId, members, attendance, canManage }) {
  const snapshot = governance.snapshot;
  const [review, setReview] = useState(null), [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const pending = useRef(false), key = useRef(null), reasonId = useId();
  const scope = snapshot?.team?.id + ':' + matchId;
  const activeScope = useRef(scope); activeScope.current = scope;
  useEffect(() => { setReview(null); setReason(''); setError(''); }, [scope]);
  const leader = snapshot?.me?.status === 'active' && ['owner', 'admin'].includes(snapshot.me.role);
  if (!snapshot && canManage) return <section className="match-late-review"><h3>Duyệt đến muộn</h3>
    <p role={governance.error ? 'alert' : 'status'}>{governance.loading ? 'Đang tải yêu cầu của đội…' : governance.error || 'Chưa tải được yêu cầu.'}</p>
    {!governance.loading && <Pressable className="choice-button" onClick={governance.refresh}>Thử lại</Pressable>}</section>;
  if (!leader) return null;
  const requests = matchLateRequests(snapshot.events, matchId);
  const open = (entry, status) => {
    setReview({ ...entry, status }); setReason(''); setError('');
    key.current = crypto.randomUUID();
  };
  const submit = async event => {
    event.preventDefault();
    if (pending.current || !review) return;
    const note = reason.trim();
    if (review.status === 'rejected' && note.length < 3) {
      setError('Nhập lý do từ chối ít nhất 3 ký tự.'); return;
    }
    pending.current = true; setBusy(true); setError('');
    const submittedScope = scope;
    try {
      await governance.mutate('review_late', {
        requestId: review.request.id, status: review.status,
        reason: note || (review.request.subject === snapshot.me.user_id ? 'Chủ FC tự duyệt yêu cầu' : 'Đồng ý yêu cầu đến muộn'),
      }, key.current);
      if (activeScope.current === submittedScope) {
        setReview(null); notify(review.status === 'approved' ? 'Đã duyệt yêu cầu đến muộn.' : 'Đã từ chối yêu cầu đến muộn.');
      }
    } catch (err) {
      if (activeScope.current === submittedScope) setError(err.message || 'Không lưu được kết quả duyệt.');
    } finally { pending.current = false; setBusy(false); }
  };
  return <section className="match-late-review" aria-label="Duyệt đến muộn của đội">
    <h3>Duyệt đến muộn <span>({requests.filter(e => e.status === 'pending').length} chờ)</span></h3>
    {governance.error && <p role="alert">{governance.error}</p>}
    {!requests.length && <p className="field-hint">Chưa có thành viên xin đến muộn cho trận này.</p>}
    {requests.map(entry => {
      const { request, decision, status } = entry;
      const member = members.find(m => String(m.id) === request.subject);
      const name = member?.name || snapshot.members.find(m => m.user_id === request.subject)?.name || 'Thành viên';
      const canReview = status === 'pending' &&
        (request.subject !== snapshot.me.user_id || snapshot.me.role === 'owner');
      return <article key={request.id} data-status={status}>
        <strong>{name}{member?.number != null ? ` · #${member.number}` : ''}</strong>
        <p className="field-hint">{attendance[request.subject] === 'attending' ? 'Đã điểm danh có mặt' : attendance[request.subject] === 'absent' ? 'Đã báo vắng' : 'Chưa điểm danh'} · {lateStatusLabel(status)}</p>
        <p>Giờ đến: {matchTimeLabel(request.data.eta, snapshot.team.timezone)}</p>
        <p className="late-request-reason">{request.data.reason}</p>
        {decision?.data.reason && <p className="field-hint">Phản hồi: {decision.data.reason}</p>}
        {canReview && <div className="late-review-actions">
          <Pressable className="primary-button" disabled={busy} onClick={() => open(entry, 'approved')} aria-label={`Duyệt đến muộn cho ${name}`}>Duyệt</Pressable>
          <Pressable className="choice-button" disabled={busy} onClick={() => open(entry, 'rejected')} aria-label={`Từ chối đến muộn của ${name}`}>Từ chối</Pressable>
        </div>}
      </article>;
    })}
    <ProModal open={!!review} title={review?.status === 'rejected' ? 'Từ chối đến muộn' : 'Duyệt đến muộn'} busy={busy} onClose={() => setReview(null)}>
      {review && <form onSubmit={submit} className="space-y-4">
        <p>{members.find(m => String(m.id) === review.request.subject)?.name || 'Thành viên'} · {matchTimeLabel(review.request.data.eta, snapshot.team.timezone)}</p>
        <div className="form-field"><label htmlFor={reasonId}>Phản hồi{review.status === 'rejected' ? ' (bắt buộc)' : ' (không bắt buộc)'}</label>
          <textarea id={reasonId} value={reason} maxLength={2000} onChange={e => setReason(e.target.value)} /></div>
        {error && <p role="alert" className="form-error">{error}</p>}
        <Pressable type="submit" className="primary-button w-full" disabled={busy}>{busy ? 'Đang lưu…' : 'Xác nhận'}</Pressable>
      </form>}
    </ProModal>
  </section>;
}
