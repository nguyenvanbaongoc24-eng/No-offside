import { localTransactionTime, transactionInstant } from './transactionTime.js';
import { defaultLate } from './governance.js';
export const MATCH_ZONE = 'Asia/Ho_Chi_Minh';
export function lifecycle(match, now = Date.now()) {
  if (match.cancelledAt || match.archivedAt || ['cancelled','canceled','archived'].includes(match.status)) return { key: 'cancelled', label: match.cancelledAt?'Đã hủy':'Đã lưu trữ' };
  if (match.status === 'completed') return { key: 'completed', label: 'Đã kết thúc' };
  if (match.endsAt && now >= Date.parse(match.endsAt)) return { key: 'awaiting', label: 'Chờ cập nhật kết quả' };
  if (!match.endsAt && now >= Date.parse(match.datetime)) return { key: 'unknown', label: 'Chưa cập nhật trạng thái' };
  if (now >= Date.parse(match.datetime)) return { key: 'live', label: 'Đang diễn ra' };
  return { key: 'upcoming', label: 'Sắp diễn ra' };
}
export function normalizeMatchDraft(form, zone = MATCH_ZONE) {
  const datetime = transactionInstant(form.datetime, zone);
  const deadline = transactionInstant(form.timeoutDatetime, zone);
  const minutes = Number(form.durationMinutes ?? 90);
  if (!Number.isInteger(minutes) || minutes < 15 || minutes > 1440) throw Error('Thời lượng từ 15 đến 1440 phút.');
  const endsAt = form.endDatetime ? transactionInstant(form.endDatetime, zone) : new Date(Date.parse(datetime) + minutes * 60000).toISOString();
  if (Date.parse(deadline) >= Date.parse(datetime)) throw Error('Hạn điểm danh phải trước giờ bắt đầu.');
  if (Date.parse(endsAt) <= Date.parse(datetime) || Date.parse(endsAt) - Date.parse(datetime) > 86400000) throw Error('Giờ kết thúc phải sau giờ bắt đầu và trong 24 giờ.');
  const matchType = form.matchType || 'friendly';
  if (!['friendly', 'internal'].includes(matchType)) throw Error('Loại trận không hợp lệ.');
  const expectedPitch = Number(form.expectedPitch || 0), expectedOther = Number(form.expectedOther || 0);
  if (![expectedPitch, expectedOther].every(n => Number.isSafeInteger(n) && n >= 0 && n <= 1e9)) throw Error('Dự toán phải là số nguyên không âm.');
  const mapUrl = (form.mapUrl || '').trim();
  if (mapUrl && !/^https:\/\//i.test(mapUrl)) throw Error('Liên kết bản đồ phải bắt đầu bằng https://.');
  return { datetime, deadline, endsAt, matchType, opponent: matchType === 'internal' ? '' : (form.opponent || '').trim(), venue: (form.venue || '').trim(), address: (form.address || '').trim(), mapUrl, expectedPitch, expectedOther, paymentPlan: form.paymentPlan || 'mixed', note: (form.note || '').trim(), modelVersion: 2 };
}
export function matchDraft(match = {}, team = {}, duplicate = false) {
  return { opponent: match.opponent ?? (match.title?.includes(' — ')?match.title.split(' — ').at(-1):''), matchType: match.matchType || 'friendly', venue: match.venue || team.venue || '', address: match.address || '', mapUrl: match.mapUrl || '', datetime: !duplicate && match.datetime ? localTransactionTime(match.datetime, MATCH_ZONE) : '', timeoutDatetime: !duplicate && match.deadline ? localTransactionTime(match.deadline, MATCH_ZONE) : '', durationMinutes: match.endsAt ? Math.round((Date.parse(match.endsAt) - Date.parse(match.datetime)) / 60000) : 90, endDatetime: '', expectedPitch: match.expectedPitch ?? '', expectedOther: match.expectedOther ?? '', paymentPlan: match.paymentPlan || 'mixed', note: match.note || '', penaltyEnabled: match.penaltyEnabled || false, penaltyFine: Number(String(match.penaltyAmount || '0').replace(/\D/g, '')), lateConfig: { ...defaultLate, ...team.lateConfig, ...match.lateConfig } };
}
export function actualCounts(roster, actual = {}) {
  const counts = { ontime: 0, late: 0, absent: 0, unknown: 0 };
  for (const member of roster) counts[actual[member.id]?.status in counts ? actual[member.id].status : 'unknown']++;
  return counts;
}
export function matchFinance(bill, charges = []) {
  if (!bill) return null;
  const rows = charges.filter(c => c.bill_id === bill.id);
  const support = Number(bill.details.support || 0), required = Number(bill.total) - support;
  const own = bill.details.payerKind === 'member' ? rows.filter(c => c.subject === bill.details.payerId).reduce((n, c) => n + Number(c.paid_amount || 0), 0) : 0;
  const paid = rows.reduce((n, c) => n + Number(c.paid_amount || 0), 0);
  return { total: Number(bill.total), support, required, received: Math.max(0, paid - own), offset: own, remaining: Math.max(0, required - paid) };
}
