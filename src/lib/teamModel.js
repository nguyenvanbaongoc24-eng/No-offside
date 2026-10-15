export const uid = () => crypto.randomUUID();
export const isLeaderRole = (role) => role === "owner" || role === "admin";
export const monthKey = (date = new Date(), timeZone = "Asia/Ho_Chi_Minh") => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  return (
    parts.find((p) => p.type === "year").value +
    "-" +
    parts.find((p) => p.type === "month").value
  );
};

export function fundBalance(transactions) {
  return transactions.reduce(
    (sum, tx) => sum + (tx.type === "income" ? 1 : -1) * Number(tx.amount),
    0,
  );
}

export function approvePayment(funds, paymentId, author) {
  const payment = funds.pendingApprovals.find((p) => p.id === paymentId);
  if (!payment) return funds;
  return {
    ...funds,
    pendingApprovals: funds.pendingApprovals.filter((p) => p.id !== paymentId),
    debtors: funds.debtors.filter(
      (p) => p.playerId !== payment.playerId || p.month !== payment.month,
    ),
    transactions: [
      {
        id: uid(),
        title: `Thu quỹ: ${payment.name}`,
        amount: Number(payment.amount),
        type: "income",
        date: new Date().toLocaleDateString("vi-VN"),
        occurredAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        timePrecision: "minute",
        author,
        playerId: payment.playerId,
        month: payment.month,
        paymentId,
      },
      ...funds.transactions,
    ],
  };
}

export function upsertReport(reports, matchId, goals, assists) {
  return {
    ...reports,
    [matchId]: { goals: Number(goals), assists: Number(assists) },
  };
}

export function reportTotals(base, reports) {
  const values = Object.values(reports);
  return {
    ...base,
    matches: base.matches + values.length,
    goals: base.goals + values.reduce((n, r) => n + r.goals, 0),
    assists: base.assists + values.reduce((n, r) => n + r.assists, 0),
  };
}

export function rosterFor(members, attendance, user) {
  const groups = { attending: [], maybe: [], absent: [], unvoted: [] };
  for (const member of members) {
    const status = attendance[member.id] || "unvoted";
    (groups[status] || groups.unvoted).push({
      ...member,
      name: member.id === user.id ? `${user.name} (Bạn)` : member.name,
    });
  }
  return groups;
}

export function qrUrl(config, amount = 150000, memo = "NO OFFSIDE DONG QUY") {
  if (!config.bankCode || !/^\d{6,25}$/.test(config.accountNumber || ""))
    return "";
  const query = new URLSearchParams({
    amount: String(Math.max(0, Number(amount))),
    addInfo: memo,
    accountName: config.accountHolder || "",
  });
  return `https://img.vietqr.io/image/${config.bankCode}-${config.accountNumber}-compact2.png?${query}`;
}

export function promoteMember(settings, id, title) {
  const member = settings.members.find((m) => m.id === id);
  if (!member || member.roleType === "owner") return settings;
  const promoted = { ...member, roleType: "admin", customTitle: title };
  return {
    ...settings,
    members: settings.members.map((m) => (m.id === id ? promoted : m)),
    subAdmins: [...settings.subAdmins.filter((m) => m.id !== id), promoted],
  };
}

export function transferOwner(settings, from, to) {
  if (!settings.members.some((m) => m.id === to && m.roleType === "admin"))
    return settings;
  const members = settings.members.map((m) =>
    m.id === to
      ? { ...m, roleType: "owner", customTitle: "Đội trưởng" }
      : m.id === from
        ? { ...m, roleType: "member", customTitle: "Cầu thủ" }
        : m,
  );
  return {
    ...settings,
    ownerId: to,
    members,
    subAdmins: members.filter((m) => m.roleType === "admin"),
  };
}

export function deleteTeamMatch(
  data,
  matchId,
  actor = "",
  now = new Date().toISOString(),
) {
  if (!data.matches.some((match) => match.id === matchId)) return data;
  const matches = data.matches.map((match) =>
    match.id === matchId && !match.archivedAt
      ? {
          ...match,
          archivedAt: now,
          archivedBy: actor,
          archiveReason: "Xóa khỏi lịch thi đấu",
        }
      : match,
  );
  return {
    ...data,
    matches,
    activeMatchId:
      data.activeMatchId === matchId
        ? matches.find((m) => !m.archivedAt)?.id
        : data.activeMatchId,
  };
}

export function restoreTeamMatch(data, snapshot) {
  const existing = data.matches.find((match) => match.id === snapshot.match.id);
  if (existing && !existing.archivedAt) return data;
  if (existing)
    return {
      ...data,
      matches: data.matches.map((match) =>
        match.id === snapshot.match.id ? snapshot.match : match,
      ),
      activeMatchId: snapshot.match.id,
    };
  const matches = [...data.matches];
  matches.splice(Math.min(snapshot.index, matches.length), 0, snapshot.match);
  const reports = { ...data.reports };
  for (const [playerId, report] of Object.entries(snapshot.reports))
    reports[playerId] = { ...reports[playerId], [snapshot.match.id]: report };
  return {
    ...data,
    matches,
    activeMatchId: snapshot.match.id,
    attendance: snapshot.attendance
      ? { ...data.attendance, [snapshot.match.id]: snapshot.attendance }
      : data.attendance,
    reports,
  };
}
