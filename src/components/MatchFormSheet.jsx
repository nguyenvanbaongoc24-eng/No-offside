import Pressable from './Pressable';
import React, { useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, CalendarDays, Users2, Wallet } from './icons';
import { defaultLate } from '../lib/governance';
import { normalizeMatchDraft, MATCH_ZONE } from '../lib/matchLifecycle';
import { matchTimeLabel } from '../lib/matchTime';
import { useLayerBack } from '../hooks/useLayerBack';

export default function MatchFormSheet({ draft, onChange, onSubmit, onClose, editing = false, error = '', venues = [], teamLateConfig }) {
  const prefix = useId(), lock = useRef(false);
  const [saving, setSaving] = useState(false), [validation, setValidation] = useState('');
  const late = { ...defaultLate, ...teamLateConfig, ...draft.lateConfig };
  const change = (key, value) => onChange({ ...draft, [key]: value });
  const updateLate = (key, value) => change('lateConfig', { ...late, [key]: value });
  const moneyValue = value => Math.min(1e9, Number(String(value).replace(/\D/g, '')) || 0);
  const close = () => { if (!lock.current) onClose(); };
  useLayerBack(true, close);
  const field = (key, label, type = 'text', props = {}) => <label className="form-field" htmlFor={`${prefix}-${key}`}>{label}
    <input id={`${prefix}-${key}`} type={type} value={draft[key] ?? ''} onChange={e => change(key, e.target.value)} onInput={type.includes('date') ? e => change(key, e.currentTarget.value) : undefined} {...props} />
  </label>;
  const money = (key, label, val, update) => <label className="form-field" htmlFor={`${prefix}-${key}`}>{label}<input id={`${prefix}-${key}`} type="text" inputMode="numeric" placeholder="50000" value={Number(val || 0).toLocaleString('vi-VN')} onChange={e => update(moneyValue(e.target.value))} /></label>;
  let expectedEnd = '';
  try { expectedEnd = normalizeMatchDraft({ ...draft, timeoutDatetime: draft.timeoutDatetime || draft.datetime }).endsAt; } catch {}
  const content = <div className="match-v2-overlay" role="dialog" aria-modal="true" aria-label={editing ? 'Sửa trận' : 'Tạo trận'} onClick={e => { if (e.target === e.currentTarget) close(); }}>
    <section className="match-v2-sheet">
      <header className="match-v2-header"><h2>{editing ? 'Sửa thông tin trận' : 'Tạo trận đấu'}</h2><Pressable type="button" aria-label="Đóng" disabled={saving} onClick={close}><X size={22} /></Pressable></header>
      <form id={`${prefix}-form`} className="match-v2-form" onSubmit={async e => {
        e.preventDefault(); if (lock.current) return;
        setValidation('');
        try { normalizeMatchDraft(draft, MATCH_ZONE); } catch (err) { setValidation(err.message); return; }
        lock.current = true; setSaving(true);
        try { await onSubmit(e); } catch (err) { setValidation(err.message || 'Không lưu được trận đấu.'); }
        finally { lock.current = false; setSaving(false); }
      }}>
        <fieldset className="match-v2-card"><legend><CalendarDays size={21} />Thông tin trận</legend>
          <label className="form-field">Loại trận<select value={draft.matchType || 'friendly'} onChange={e => change('matchType', e.target.value)}><option value="friendly">Giao hữu</option><option value="internal">Nội bộ</option></select></label>
          {(draft.matchType || 'friendly') === 'friendly' && field('opponent', 'Đối thủ', 'text', { maxLength: 120, placeholder: 'Đang tìm đối · có thể bổ sung sau' })}
          <div className="match-v2-grid">
            <label className="form-field">Ngày thi đấu<input type="date" required value={(draft.datetime || '').split('T')[0]} onInput={e => change('datetime', `${e.currentTarget.value}T${draft.datetime?.split('T')[1] || '19:00'}`)} onChange={e => change('datetime', `${e.target.value}T${draft.datetime?.split('T')[1] || '19:00'}`)} /></label>
            <label className="form-field">Giờ bắt đầu<input type="time" required value={draft.datetime?.split('T')[1] || ''} onInput={e => change('datetime', `${draft.datetime?.split('T')[0] || ''}T${e.currentTarget.value}`)} onChange={e => change('datetime', `${draft.datetime?.split('T')[0] || ''}T${e.target.value}`)} /></label>
          </div>
          {field('durationMinutes', 'Thời lượng (phút)', 'number', { min: 15, max: 1440, step: 1, placeholder: '90' })}
          <details><summary>Chọn giờ kết thúc cụ thể</summary>{field('endDatetime', 'Kết thúc dự kiến', 'datetime-local')}</details>
          {expectedEnd && <p className="field-hint">Kết thúc dự kiến: {matchTimeLabel(expectedEnd)}</p>}
          {field('venue', 'Sân bóng', 'text', { list: `${prefix}-venues`, maxLength: 240, placeholder: 'Chưa chốt sân · chọn hoặc nhập tên sân' })}
          <datalist id={`${prefix}-venues`}>{[...new Set(venues.filter(Boolean))].map(venue => <option key={venue} value={venue} />)}</datalist>
          <details><summary>Địa chỉ và bản đồ</summary>{field('address', 'Địa chỉ sân', 'text', { maxLength: 500 })}{field('mapUrl', 'Liên kết bản đồ', 'url', { placeholder: 'https://…', maxLength: 2000 })}</details>
          <p className="field-hint">Chọn ngày và giờ theo lịch của đội.</p>
        </fieldset>
        <fieldset className="match-v2-card"><legend><Users2 size={21} />Điểm danh</legend>
          {field('timeoutDatetime', 'Hạn chốt điểm danh', 'datetime-local', { required: true })}
          <p className="field-hint">Hạn điểm danh phải trước giờ bắt đầu. Phải báo muộn trước giờ bắt đầu ít nhất {late.lateBefore} phút.</p>
          <details><summary>Quy định điểm danh và xin muộn</summary>
            <label className="notification-option"><span>Áp dụng mức phạt khi chưa điểm danh</span><input type="checkbox" checked={!!draft.penaltyEnabled} onChange={e => change('penaltyEnabled', e.target.checked)} /></label>
            {draft.penaltyEnabled && <>{money('penaltyFine', 'Phạt chưa điểm danh (đ)', draft.penaltyFine, n => change('penaltyFine', n))}<div className="match-v2-chips">{[20000, 50000, 100000, 200000].map(n => <Pressable type="button" key={n} onClick={() => change('penaltyFine', n)}>{n / 1000}{'k'}</Pressable>)}</div></>}
            <label className="form-field">Phải báo muộn trước giờ bắt đầu ít nhất (phút)<input type="number" min="0" max="10080" value={late.lateBefore} onChange={e => updateLate('lateBefore', Number(e.target.value))} /></label>
            <label className="form-field">Dung sai đi muộn (phút)<input type="number" min="0" value={late.grace} onChange={e => updateLate('grace', Number(e.target.value))} /></label>
            {money('late-fine', 'Phạt đi muộn (đ)', late.fine, n => updateLate('fine', n))}
            <label className="notification-option"><span>Cần người có quyền duyệt</span><input type="checkbox" checked={late.approvalRequired} onChange={e => updateLate('approvalRequired', e.target.checked)} /></label>
            <label className="form-field">Khi xin muộn được duyệt<select value={late.approvedPolicy} onChange={e => updateLate('approvedPolicy', e.target.value)}><option value="eta">Tính muộn từ giờ đã chấp thuận</option><option value="kickoff">Vẫn tính từ giờ đá</option><option value="exempt">Miễn phạt đi muộn khi được duyệt</option></select></label>
          </details>
        </fieldset>
        <details className="match-v2-card"><summary><Wallet size={21} />Chi phí & tùy chọn</summary><p className="field-hint">Chỉ là dự toán; chưa ghi chi hoặc tạo khoản phải đóng.</p>
          {money('expectedPitch', 'Tiền sân dự kiến (đ)', draft.expectedPitch, n => change('expectedPitch', n))}
          {money('expectedOther', 'Chi phí khác dự kiến (đ)', draft.expectedOther, n => change('expectedOther', n))}
          <label className="form-field">Cách thanh toán dự kiến<select value={draft.paymentPlan || 'mixed'} onChange={e => change('paymentPlan', e.target.value)}><option value="fund">Quỹ đội chi</option><option value="members">Thành viên đóng</option><option value="mixed">Quỹ hỗ trợ và thành viên đóng</option></select></label>
          <label className="form-field">Ghi chú<textarea maxLength={4000} value={draft.note || ''} onChange={e => change('note', e.target.value)} /></label>
        </details>
        {(validation || error) && <p className="form-error" role="alert">{validation || error}</p>}
      </form>
      <footer className="match-v2-footer"><Pressable type="submit" form={`${prefix}-form`} className="primary-button" disabled={saving}>{saving ? 'Đang lưu…' : editing ? 'Lưu thay đổi' : 'Tạo trận & mời điểm danh'}</Pressable></footer>
    </section>
  </div>;
  return typeof document !== 'undefined' && document.body ? createPortal(content, document.body) : content;
}
