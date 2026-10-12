export const uid = () => crypto.randomUUID();
export const isLeaderRole = role => role === 'owner' || role === 'admin';
export const monthKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

export function fundBalance(transactions) {
  return transactions.reduce((sum, tx) => sum + (tx.type === 'income' ? 1 : -1) * Number(tx.amount), 0);
}

export function approvePayment(funds, paymentId, author) {
  const payment = funds.pendingApprovals.find(p => p.id === paymentId);
  if (!payment) return funds;
  return {
    ...funds,
    pendingApprovals: funds.pendingApprovals.filter(p => p.id !== paymentId),
    debtors: funds.debtors.filter(p => p.playerId !== payment.playerId || p.month !== payment.month),
    transactions: [{ id: uid(), title: `Thu quỹ: ${payment.name}`, amount: Number(payment.amount), type: 'income', date: new Date().toLocaleDateString('vi-VN'), author, playerId: payment.playerId, month: payment.month, paymentId }, ...funds.transactions],
  };
}

export function upsertReport(reports, matchId, goals, assists) {
  return { ...reports, [matchId]: { goals: Number(goals), assists: Number(assists) } };
}

export function reportTotals(base, reports) {
  const values = Object.values(reports);
  return { ...base, matches: base.matches + values.length, goals: base.goals + values.reduce((n, r) => n + r.goals, 0), assists: base.assists + values.reduce((n, r) => n + r.assists, 0) };
}

export function rosterFor(members, attendance, user) {
  const groups = { attending: [], maybe: [], absent: [], unvoted: [] };
  for (const member of members) {
    const status = attendance[member.id] || 'unvoted';
    (groups[status] || groups.unvoted).push({ ...member, name: member.id === user.id ? `${user.name} (Bạn)` : member.name });
  }
  return groups;
}

export function qrUrl(config, amount = 150000, memo = 'NO OFFSIDE DONG QUY') {
  if (!config.bankCode || !/^\d{6,25}$/.test(config.accountNumber || '')) return '';
  const query = new URLSearchParams({ amount: String(Math.max(0, Number(amount))), addInfo: memo, accountName: config.accountHolder || '' });
  return `https://img.vietqr.io/image/${config.bankCode}-${config.accountNumber}-compact2.png?${query}`;
}

export function promoteMember(settings, id, title) {
  const member = settings.members.find(m => m.id === id);
  if (!member || member.roleType === 'owner') return settings;
  const promoted = { ...member, roleType: 'admin', customTitle: title };
  return { ...settings, members: settings.members.map(m => m.id === id ? promoted : m), subAdmins: [...settings.subAdmins.filter(m => m.id !== id), promoted] };
}

export function transferOwner(settings, from, to) {
  if (!settings.members.some(m => m.id === to && m.roleType === 'admin')) return settings;
  const members = settings.members.map(m => m.id === to ? { ...m, roleType: 'owner', customTitle: 'Đội trưởng' } : m.id === from ? { ...m, roleType: 'member', customTitle: 'Cầu thủ' } : m);
  return { ...settings, ownerId: to, members, subAdmins: members.filter(m => m.roleType === 'admin') };
}
