import { actualCounts, isMatchArchived, lifecycle } from './matchLifecycle.js';
import { matchLateRequests } from './matchLateRequests.js';

// A finished match can still have attendance or money to reconcile. Missing
// projections are unknown, not evidence of unfinished work. The server remains
// authoritative for permissions, fines and every transition.
export function matchPendingTasks(match, { canManage = false, canManageFunds = false } = {}) {
  if (!isMatchArchived(match)) return [];
  const state = match.detailState;
  if (!state) return [];
  const tasks = [];
  const cancelled = lifecycle(match).key === 'cancelled';
  if (!cancelled && canManage && state.finalized === false)
    tasks.push({ key: 'attendance', label: 'Chưa chốt điểm danh thực tế' });
  if (!cancelled && canManageFunds && (state.costKnown ?? state.costUpdated) === false)
    tasks.push({ key: 'cost', label: 'Chưa xác nhận chi phí' });
  if (canManageFunds && (Number(state.remaining) > 0 || state.pendingReceivables))
    tasks.push({ key: 'receivable', label: 'Còn khoản phải thu' });
  if (!canManageFunds && (Number(state.ownRemaining) > 0 || state.ownPendingDebt))
    tasks.push({ key: 'debt', label: 'Còn khoản phải đóng của bạn' });
  return tasks;
}

export function attendanceReadiness({ match, record, roster, actual, accountId, events, fines = [] }) {
  const counts = actualCounts(roster, actual);
  const unknown = roster.filter(person => !['ontime', 'late', 'absent'].includes(actual[person.id]?.status));
  const pending = events == null ? null : matchLateRequests(events, match.id).filter(entry => entry.status === 'pending');
  const blockers = [];
  if (record.finalized_at) return { counts, unknown, pending, blockers, ready: false };
  if (lifecycle(match).key === 'cancelled') blockers.push('Trận đã hủy hoặc lưu trữ, chỉ xem lịch sử.');
  else if (match.status !== 'completed') blockers.push('Kết thúc trận trước khi chốt điểm danh.');
  if (unknown.length) {
    blockers.push(`Còn ${unknown.length}/${roster.length} người chưa xác nhận thực tế: ${unknown.map(p => p.name).join(', ')}.`);
    if (unknown.some(p => p.id === accountId)) blockers.push('Cần Chủ đội hoặc Quản trị viên khác xác nhận thực tế cho bạn.');
  }
  if (pending === null) blockers.push('Cần tải yêu cầu xin đến muộn để kiểm tra trước khi chốt.');
  else if (pending.length) blockers.push(`Còn ${pending.length} yêu cầu xin đến muộn chờ duyệt.`);
  // The backend rejects self-finalization of these violations. Explain it in
  // the preview instead of letting a seemingly valid confirmation fail.
  const alreadyRecorded = type => events?.some(event => event.match_id === match.id && event.subject === accountId && event.action === 'violation' && event.data?.type === type);
  if (fines.some(p => p.id === accountId && ((p.type === 'late' && !alreadyRecorded('late')) || (Number(p.unvotedFine) > 0 && !alreadyRecorded('unvoted')) || Number(p.absenceFine) > 0)))
    blockers.push('Có vi phạm của bạn trong bản xem trước; cần quản trị viên khác kiểm tra và chốt.');
  return { counts, unknown, pending, blockers, ready: blockers.length === 0 };
}
