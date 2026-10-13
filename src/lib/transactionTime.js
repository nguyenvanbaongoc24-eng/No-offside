const parts = (at, zone) =>
  Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(at))
      .map((p) => [p.type, p.value]),
  );
export function localTransactionTime(at, zone = "Asia/Ho_Chi_Minh") {
  const p = parts(at, zone);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
export function transactionInstant(value, zone = "Asia/Ho_Chi_Minh") {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))
    throw new Error("Thời gian giao dịch không hợp lệ.");
  const target = Date.parse(value + ":00Z");
  if (!Number.isFinite(target))
    throw new Error("Thời gian giao dịch không hợp lệ.");
  let candidate = target;
  for (let i = 0; i < 4; i++)
    candidate +=
      target - Date.parse(localTransactionTime(candidate, zone) + ":00Z");
  if (localTransactionTime(candidate, zone) !== value)
    throw new Error("Thời gian này không tồn tại trong múi giờ đội.");
  return new Date(candidate).toISOString();
}
export function legacyTransactionDay(tx) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(tx.date || "")) return tx.date;
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(tx.date || "");
  return match
    ? `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`
    : "";
}
export function transactionLabel(tx, zone = "Asia/Ho_Chi_Minh") {
  return tx.occurredAt
    ? new Intl.DateTimeFormat("vi-VN", {
        timeZone: zone,
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(tx.occurredAt))
    : `${tx.date || "Chưa rõ ngày"} · chưa có giờ`;
}
export function editTransaction(
  original,
  draft,
  time,
  zone,
  actor,
  now = new Date().toISOString(),
) {
  const timing = time
    ? {
        occurredAt: transactionInstant(time, zone),
        timeZone: zone,
        timePrecision: "minute",
        date: time.slice(0, 10),
      }
    : {};
  const next = { ...original, ...draft, ...timing, updatedAt: now };
  const before = Object.fromEntries(
    [
      "title",
      "amount",
      "type",
      "date",
      "occurredAt",
      "timeZone",
      "timePrecision",
    ].map((key) => [key, original[key] ?? null]),
  );
  return {
    ...next,
    adjustments: [
      ...(original.adjustments || []),
      {
        actor,
        at: now,
        before,
        after: Object.fromEntries(
          Object.keys(before).map((key) => [key, next[key] ?? null]),
        ),
      },
    ],
  };
}
