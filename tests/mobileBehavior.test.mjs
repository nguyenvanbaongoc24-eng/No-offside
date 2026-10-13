import test from "node:test";
import assert from "node:assert/strict";
import { scrollNavigation } from "../src/lib/navigationScroll.js";
import {
  canRequestLate,
  lateOutcome,
  periodBounds,
  violationCount,
  effectiveRules,
} from "../src/lib/governance.js";
import { accountCacheKey, maskedIdentifier } from "../src/lib/accounts.js";

test("scroll hides/shows only after threshold; idle, jitter and bounce keep state", () => {
  let s = { last: 0, travel: 0, visible: true };
  s = scrollNavigation(s, 21, 500);
  assert.equal(s.visible, true);
  s = scrollNavigation(s, 28, 500);
  assert.equal(s.visible, false);
  const hidden = s;
  assert.equal(scrollNavigation(s, -5, 500), hidden);
  assert.equal(scrollNavigation(s, 501, 500), hidden);
  assert.equal(scrollNavigation(s, 29, 500), hidden);
  s = scrollNavigation(s, 54, 500, true);
  assert.equal(s.visible, false);
  s = scrollNavigation(s, 52, 500);
  assert.equal(s.visible, false);
  s = scrollNavigation(s, 25, 500);
  assert.equal(s.visible, true);
  s = scrollNavigation({ ...s, visible: false }, 0, 500);
  assert.equal(s.visible, true);
});
test("late cutoff is inclusive and approved ETA is still subject to grace/fine", () => {
  const kickoff = "2026-10-13T11:30:00Z";
  assert.equal(
    canRequestLate(kickoff, 60, Date.parse("2026-10-13T10:30:00Z")),
    true,
  );
  assert.equal(
    canRequestLate(kickoff, 60, Date.parse("2026-10-13T10:30:00.001Z")),
    false,
  );
  const match = { kickoff, grace: 5, fine: 50000, approved_policy: "eta" };
  const request = { status: "approved", eta: "2026-10-13T11:45:00Z" };
  assert.equal(
    lateOutcome(match, "2026-10-13T11:50:00Z", request).violation,
    false,
  );
  assert.equal(
    lateOutcome(match, "2026-10-13T11:50:00.001Z", request).fine,
    50000,
  );
  assert.equal(
    lateOutcome(
      { ...match, approved_policy: "kickoff" },
      "2026-10-13T11:45:00Z",
      request,
    ).fine,
    50000,
  );
});
test("month, quarter and DST boundaries resolve in configured timezone", () => {
  assert.deepEqual(periodBounds("2026-09-30T17:00Z", "month"), {
    start: "2026-09-30T17:00:00.000Z",
    end: "2026-10-31T17:00:00.000Z",
  });
  assert.deepEqual(periodBounds("2026-09-30T17:00Z", "quarter"), {
    start: "2026-09-30T17:00:00.000Z",
    end: "2026-12-31T17:00:00.000Z",
  });
  assert.deepEqual(
    periodBounds("2026-03-15T12:00Z", "month", "America/New_York"),
    { start: "2026-03-01T05:00:00.000Z", end: "2026-04-01T04:00:00.000Z" },
  );
});
test("void adjustments alter counts without erasing history; rules follow effective time", () => {
  const events = [
    {
      id: "a",
      action: "violation",
      subject: "u",
      data: { type: "late", occurredAt: "2026-10-01T00:00Z", fine: 50000 },
    },
    {
      id: "b",
      action: "adjust",
      subject: "u",
      data: { eventId: "a", status: "void", reason: "Incorrect identity" },
    },
  ];
  assert.equal(
    violationCount(
      events,
      "u",
      { types: ["late"] },
      { start: "2026-09-30T17:00Z", end: "2026-10-31T17:00Z" },
    ),
    0,
  );
  assert.equal(events[0].data.fine, 50000);
  assert.equal(
    effectiveRules(
      [
        { version: 1, effective_at: "2026-01-01Z" },
        { version: 2, effective_at: "2026-11-01Z" },
      ],
      Date.parse("2026-10-13Z"),
    ).version,
    1,
  );
});
test("account cache scopes differ for same team and labels never expose full identifier", () => {
  assert.notEqual(accountCacheKey("a", "team"), accountCacheKey("b", "team"));
  assert.equal(maskedIdentifier("player@example.com"), "pl•••@example.com");
  assert.equal(maskedIdentifier("+84912345678"), "+84••••78");
});
