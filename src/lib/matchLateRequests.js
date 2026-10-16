// One current request per person and match. Replaced requests must never be reviewed.
export function matchLateRequests(events = [], matchId) {
  const ordered = [...events].sort((a, b) =>
    Number(a.seq || 0) - Number(b.seq || 0) ||
    Date.parse(a.created_at || 0) - Date.parse(b.created_at || 0));
  const requests = new Map();
  for (const event of ordered) {
    if (event.match_id === matchId && event.action === 'late_request')
      requests.set(event.subject, event);
  }
  return [...requests.values()].map(request => {
    const decision = [...ordered].reverse().find(event =>
      event.action === 'review_late' && event.data?.requestId === request.id);
    return { request, decision, status: decision?.data?.status || request.data.status };
  });
}

export const lateStatusLabel = status => ({
  pending: 'Xin muộn · Chờ duyệt',
  approved: 'Xin muộn · Đã duyệt',
  rejected: 'Xin muộn · Từ chối',
}[status] || 'Xin muộn');
