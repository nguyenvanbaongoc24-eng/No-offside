import { localTransactionTime, transactionInstant } from "./transactionTime.js";
export function remainingCharge(charge) {
  return charge.status === "void"
    ? 0
    : Math.max(0, Number(charge.amount) - Number(charge.paid_amount || 0));
}
export function collectionSummary(collection, charges) {
  const rows = charges.filter((c) => c.collection_id === collection.id);
  return {
    people: rows.length,
    paid: rows.filter((c) => Number(c.paid_amount) >= Number(c.amount)).length,
    partial: rows.filter(
      (c) => Number(c.paid_amount) > 0 && remainingCharge(c) > 0,
    ).length,
    remaining: rows.reduce((sum, c) => sum + remainingCharge(c), 0),
  };
}
export function allocateBill(total, support, ids) {
  const amount = Number(total) - Number(support);
  const people = [...new Set(ids)].sort();
  if (
    !Number.isSafeInteger(amount) ||
    amount < 0 ||
    !people.length ||
    !Number.isSafeInteger(Number(total)) ||
    !Number.isSafeInteger(Number(support))
  )
    throw Error("Kiểm tra tổng hóa đơn, hỗ trợ và người tham gia.");
  return people.map((id, i) => ({
    id,
    amount:
      Math.floor(amount / people.length) + (i < amount % people.length ? 1 : 0),
  }));
}
export function vndInput(value) {
  const digits = String(value).replace(/\D/g, "");
  return digits ? Number(digits) : 0;
}
export function scheduleDueDate(schedule) {
  const local = localTransactionTime(schedule.next_run, "Asia/Ho_Chi_Minh");
  if (schedule.repeat !== "monthly" || !schedule.due_day)
    return localTransactionTime(
      Date.parse(schedule.next_run) + schedule.due_days * 864e5,
      "Asia/Ho_Chi_Minh",
    ).slice(0, 10);
  const [year, month] = local.slice(0, 7).split("-").map(Number);
  const first = new Date(Date.UTC(year, month - 1 + schedule.due_months, 1));
  const last = new Date(
    Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0),
  ).getUTCDate();
  return new Date(
    Date.UTC(
      first.getUTCFullYear(),
      first.getUTCMonth(),
      Math.min(last, schedule.due_day),
    ),
  )
    .toISOString()
    .slice(0, 10);
}
export function nextMonthlyStart(day, time, now = Date.now()) {
  const local = localTransactionTime(now, "Asia/Ho_Chi_Minh");
  const [year, month] = local.slice(0, 7).split("-").map(Number);
  for (let offset = 0; offset < 2; offset++) {
    const last = new Date(Date.UTC(year, month + offset, 0)).getUTCDate();
    const date =
      new Date(Date.UTC(year, month - 1 + offset, Math.min(last, day)))
        .toISOString()
        .slice(0, 10) +
      "T" +
      time;
    if (Date.parse(transactionInstant(date, "Asia/Ho_Chi_Minh")) >= now)
      return date;
  }
}
export function getMonthFundSummary(
  selectedMonth,
  collections = [],
  charges = [],
  pendingRequests = [],
  transactions = []
) {
  const [yearStr, monthStr] = (selectedMonth || "").split("-");
  const monthNum = parseInt(monthStr, 10);

  const monthCollections = (collections || []).filter((c) => {
    if (c.status === "cancelled") return false;
    if (c.period === selectedMonth) return true;
    if (c.due_date && c.due_date.startsWith(selectedMonth)) return true;
    if (c.created_at && c.created_at.startsWith(selectedMonth)) return true;
    if (c.title) {
      const match = c.title.match(/tháng\s*0?(\d+)/i);
      if (match && parseInt(match[1], 10) === monthNum) {
        if (!c.created_at || c.created_at.startsWith(yearStr)) return true;
      }
    }
    return false;
  });

  const hasCollection = monthCollections.length > 0;
  const collectionIds = new Set(monthCollections.map((c) => c.id));

  const monthCharges = (charges || []).filter(
    (ch) => collectionIds.has(ch.collection_id) && ch.status !== "void"
  );

  const totalRequired = hasCollection
    ? monthCharges.reduce((sum, ch) => sum + Number(ch.amount || 0), 0)
    : null;

  const totalPaid = monthCharges.reduce(
    (sum, ch) => sum + Number(ch.paid_amount || 0),
    0
  );

  const totalRemaining = hasCollection
    ? monthCharges.reduce((sum, ch) => sum + remainingCharge(ch), 0)
    : 0;

  const monthChargeIds = new Set(monthCharges.map((ch) => ch.id));
  const pendingForMonth = (pendingRequests || []).filter((p) =>
    p.chargeId ? monthChargeIds.has(p.chargeId) : p.month === selectedMonth
  );

  const totalPending = pendingForMonth.reduce(
    (sum, p) => sum + Number(p.amount || 0),
    0
  );

  const paidCount = monthCharges.filter((ch) => remainingCharge(ch) === 0).length;
  const partialCount = monthCharges.filter(
    (ch) => Number(ch.paid_amount) > 0 && remainingCharge(ch) > 0
  ).length;
  const unpaidCount = monthCharges.filter(
    (ch) => Number(ch.paid_amount) === 0 && remainingCharge(ch) > 0
  ).length;
  const totalCount = monthCharges.length;

  const unlinkedTransactions = (transactions || []).filter((t) => {
    if (t.type !== "income" || t.status === "void") return false;
    const matchPeriod =
      (t.occurredAt && t.occurredAt.startsWith(selectedMonth)) ||
      (t.date && t.date.startsWith(selectedMonth));
    const titleMatch =
      t.title &&
      (t.title.toLowerCase().includes(`tháng ${monthNum}`) ||
        t.title.toLowerCase().includes(`t${monthNum}`));
    return matchPeriod || titleMatch;
  });

  const unlinkedIncomeTotal = unlinkedTransactions.reduce(
    (sum, t) => sum + Number(t.amount || 0),
    0
  );

  return {
    selectedMonth,
    hasCollection,
    collections: monthCollections,
    charges: monthCharges,
    totalRequired,
    totalPaid,
    totalPending,
    totalRemaining,
    paidCount,
    partialCount,
    unpaidCount,
    totalCount,
    pendingRequests: pendingForMonth,
    unlinkedTransactions,
    unlinkedIncomeTotal,
  };
}

export function getMembersMonthStatus(
  selectedMonth,
  teamMembers = [],
  summary,
  allCharges = [],
  pendingRequests = []
) {
  const memberMap = new Map();

  teamMembers.forEach((m) => {
    memberMap.set(m.id, {
      id: m.id,
      name: m.name,
      number: m.number ?? m.jersey_number ?? "",
      role: m.role || "member",
      phone: m.phone || "",
      avatar: m.avatar || "",
      hasObligation: false,
      amount: 0,
      paidAmount: 0,
      remaining: 0,
      charge: null,
      pending: null,
      status: "no_obligation",
    });
  });

  if (summary && summary.hasCollection) {
    summary.charges.forEach((ch) => {
      const existing = memberMap.get(ch.subject) || {
        id: ch.subject,
        name: "Thành viên",
        number: "",
        role: "member",
        phone: "",
        avatar: "",
      };

      const pending = (pendingRequests || []).find((p) => p.chargeId === ch.id);
      const rem = remainingCharge(ch);
      const paid = Number(ch.paid_amount || 0);
      const amount = Number(ch.amount || 0);

      let status = "unpaid";
      if (pending) {
        status = "pending";
      } else if (rem === 0) {
        status = "paid";
      } else if (paid > 0) {
        status = "partial";
      }

      memberMap.set(ch.subject, {
        ...existing,
        hasObligation: true,
        amount,
        paidAmount: paid,
        remaining: rem,
        charge: ch,
        pending,
        status,
      });
    });
  }

  return Array.from(memberMap.values());
}

export function getMemberMonthHistory(
  memberId,
  collections = [],
  charges = [],
  transactions = [],
  pendingRequests = []
) {
  const memberCharges = (charges || []).filter(
    (ch) => ch.subject === memberId && ch.kind === "fund"
  );

  const history = memberCharges.map((ch) => {
    const col = (collections || []).find((c) => c.id === ch.collection_id);
    const period = col?.period || (col?.due_date ? col.due_date.slice(0, 7) : "Khác");
    const pending = (pendingRequests || []).find((p) => p.chargeId === ch.id);
    const rem = remainingCharge(ch);
    const paid = Number(ch.paid_amount || 0);
    const amount = Number(ch.amount || 0);

    const relatedTx = (transactions || []).find(
      (t) => t.chargeId === ch.id && t.type === "income" && t.status !== "void"
    );

    let paymentDate = null;
    let isBackpay = false;
    let backpayMonth = null;

    if (relatedTx) {
      paymentDate = relatedTx.occurredAt || relatedTx.date;
      if (paymentDate && period !== "Khác") {
        const txMonth = paymentDate.slice(0, 7);
        if (txMonth > period) {
          isBackpay = true;
          backpayMonth = txMonth;
        }
      }
    } else if (ch.resolved_at && period !== "Khác") {
      paymentDate = ch.resolved_at;
      const resMonth = paymentDate.slice(0, 7);
      if (resMonth > period) {
        isBackpay = true;
        backpayMonth = resMonth;
      }
    }

    let status = "unpaid";
    if (pending) status = "pending";
    else if (rem === 0) status = "paid";
    else if (paid > 0) status = "partial";

    return {
      chargeId: ch.id,
      collectionId: ch.collection_id,
      collectionTitle: col?.title || ch.label || `Quỹ kỳ ${period}`,
      period,
      dueDate: col?.due_date,
      amount,
      paidAmount: paid,
      remaining: rem,
      status,
      pending,
      paymentDate,
      isBackpay,
      backpayMonth,
    };
  });

  history.sort((a, b) => (b.period || "").localeCompare(a.period || ""));
  return history;
}
