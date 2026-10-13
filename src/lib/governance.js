export const defaultPolicy = {
  period: "month",
  threshold: 3,
  types: ["late", "unvoted", "other"],
  mode: "review",
  action: "warning",
};
export const defaultLate = {
  lateBefore: 60,
  approvalRequired: true,
  grace: 5,
  fine: 50000,
  approvedPolicy: "eta",
};
export function lateCutoff(kickoff, minutes = 60) {
  return new Date(new Date(kickoff).getTime() - minutes * 60000).toISOString();
}
export function canRequestLate(kickoff, minutes, now = Date.now()) {
  return now <= new Date(lateCutoff(kickoff, minutes)).getTime();
}
export function effectiveRules(rules, at = Date.now()) {
  return rules
    .filter((r) => new Date(r.effective_at).getTime() <= at)
    .sort(
      (a, b) =>
        new Date(b.effective_at) - new Date(a.effective_at) ||
        b.version - a.version,
    )[0];
}
export function periodBounds(at, period, timeZone = "Asia/Ho_Chi_Minh") {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(new Date(at))
      .map((p) => [p.type, p.value]),
  );
  const year = Number(parts.year),
    month = Number(parts.month) - 1;
  const startMonth = period === "quarter" ? Math.floor(month / 3) * 3 : month;
  // Resolve local midnight with the zone's offset at each boundary (DST aware).
  const midnight = (y, m) => {
    const target = Date.UTC(y, m, 1);
    let candidate = target;
    for (let i = 0; i < 3; i++) {
      const p = Object.fromEntries(
        new Intl.DateTimeFormat("en-CA", {
          timeZone,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hourCycle: "h23",
        })
          .formatToParts(new Date(candidate))
          .map((x) => [x.type, x.value]),
      );
      candidate +=
        target -
        Date.UTC(
          Number(p.year),
          Number(p.month) - 1,
          Number(p.day),
          Number(p.hour),
          Number(p.minute),
          Number(p.second),
        );
    }
    return new Date(candidate).toISOString();
  };
  return {
    start: midnight(year, startMonth),
    end: midnight(year, startMonth + (period === "quarter" ? 3 : 1)),
  };
}
export function latestEvent(events, action, subject, matchId) {
  return [...events]
    .reverse()
    .find(
      (e) =>
        e.action === action &&
        (!subject || e.subject === subject) &&
        (!matchId || e.match_id === matchId),
    );
}
export function adjustedViolation(event, events) {
  const adjustment = [...events]
    .reverse()
    .find((e) => e.action === "adjust" && e.data.eventId === event.id);
  return { ...event.data, ...adjustment?.data };
}
export function violationCount(events, subject, policy, bounds) {
  return events.filter(
    (e) =>
      e.action === "violation" &&
      e.subject === subject &&
      policy.types.includes(e.data.type) &&
      new Date(e.data.occurredAt) >= new Date(bounds.start) &&
      new Date(e.data.occurredAt) < new Date(bounds.end) &&
      adjustedViolation(e, events).status !== "void",
  ).length;
}
export function lateOutcome(match, arrival, request) {
  const approved = request?.status === "approved";
  if (approved && match.approved_policy === "exempt")
    return { violation: false, fine: 0, exempt: true };
  const baseline =
    approved && match.approved_policy === "eta" ? request.eta : match.kickoff;
  const violation =
    new Date(arrival).getTime() >
    new Date(baseline).getTime() + match.grace * 60000;
  return { violation, fine: violation ? match.fine : 0, baseline };
}
