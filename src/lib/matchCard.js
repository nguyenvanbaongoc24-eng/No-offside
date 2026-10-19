export function finePolicy(enabled, value) {
  if (enabled === false) return {kind: 'off'};
  if (enabled !== true) return {kind: 'unknown'};
  let amount = value;
  if (typeof value === 'string') {
    const cleaned = value.trim().replace(/\s*(?:đ|₫|VND)(?:\/người)?$/i, '').trim();
    if (!/^(?:\d+|\d{1,3}(?:[.,]\d{3})+)$/.test(cleaned)) return {kind: 'unknown'};
    amount = Number(cleaned.replace(/[.,]/g, ''));
  }
  return Number.isSafeInteger(amount) && amount >= 0 ? {kind: 'configured', amount} : {kind: 'unknown'};
}

export function deadlineState(match, now = Date.now()) {
  const end = Date.parse(match.deadline);
  if (match.cancelledAt || ['cancelled', 'canceled'].includes(match.status)) return {text: 'Trận đã hủy', running: false};
  if (match.status === 'completed') return {text: 'Trận đã kết thúc', running: false};
  if (match.archivedAt || match.status === 'archived') return {text: 'Trận đã hủy', running: false};
  if (!Number.isFinite(end)) return {text: 'Chưa đặt hạn điểm danh', running: false};
  const remaining = end - now;
  if (remaining <= 0) return {text: 'Đã chốt điểm danh', running: false};
  const minutes = Math.ceil(remaining / 60000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const rest = minutes % 60;
  const text = days ? `${days} ngày${hours ? ` ${hours} giờ` : ''}` : hours ? `${hours} giờ${rest ? ` ${rest} phút` : ''}` : minutes === 1 ? 'dưới 1 phút' : `${minutes} phút`;
  return {text: `Còn ${text}`, running: true, nextUpdate: Math.min(60000, remaining)};
}
