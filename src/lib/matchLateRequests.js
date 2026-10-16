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

// The original roster remains the deadline/fine baseline. People whose server
// attendance was accepted after joining must also be visible in the live list.
export function matchAttendanceMembers(eligible, members, attendance = {}) {
  const identities = new Map(members.map(member => [String(member.id), member]));
  const roster = new Map(eligible.map(member => [String(member.id), {
    ...member, ...identities.get(String(member.id)),
  }]));
  for (const member of members) {
    if (['attending', 'absent', 'maybe'].includes(attendance[member.id]))
      roster.set(String(member.id), member);
  }
  return [...roster.values()];
}
