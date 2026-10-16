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
