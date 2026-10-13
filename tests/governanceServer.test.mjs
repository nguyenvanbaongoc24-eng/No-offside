import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
const owner = "00000000-0000-4000-8000-000000000001",
  admin = "00000000-0000-4000-8000-000000000002",
  member = "00000000-0000-4000-8000-000000000003",
  other = "00000000-0000-4000-8000-000000000004";
let db;
before(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create schema auth; create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema auth to authenticated;
 -- Test-only deterministic clock in this disposable WASM PostgreSQL instance.
 create or replace function pg_catalog.clock_timestamp() returns timestamptz language sql volatile as $$ select current_setting('test.clock')::timestamptz $$; set test.clock='2026-10-13T10:00:00Z';`);
  await db.exec(
    await readFile(
      new URL(
        "../supabase/migrations/202610130001_governance.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
});
after(async () => {
  await db.close();
});
async function clock(value) {
  await db.query(`select set_config('test.clock',$1,false)`, [value]);
}
async function as(user) {
  await db.exec("reset role");
  await db.query(`select set_config('request.jwt.claim.sub',$1,false)`, [
    user || "",
  ]);
  await db.exec("set role authenticated");
}
async function fixture(
  policy = {
    period: "month",
    threshold: 2,
    types: ["late", "unvoted", "other"],
    mode: "review",
    action: "warning",
  },
) {
  await db.exec("reset role");
  await clock("2026-10-13T10:00:00Z");
  const team = randomUUID();
  await db.query(
    `insert into public.no_gov_teams(id,name,policy) values($1,'Test team',$2::jsonb)`,
    [team, JSON.stringify(policy)],
  );
  for (const [id, role] of [
    [owner, "owner"],
    [admin, "admin"],
    [member, "member"],
    [other, "member"],
  ])
    await db.query(
      `insert into public.no_gov_members(team_id,user_id,name,role) values($1,$2,$3,$4)`,
      [team, id, role, role],
    );
  await db.query(
    `insert into public.no_gov_matches(team_id,id,title,kickoff,attendance_deadline) values($1,'match','Test match','2026-10-13T12:30Z','2026-10-13T11:30Z')`,
    [team],
  );
  await db.query(
    `insert into public.no_gov_rules(team_id,version,content,effective_at,actor) values($1,1,'Original rules','2026-01-01Z',$2)`,
    [team, owner],
  );
  await as(member);
  return team;
}
async function rpc(team, action, payload = {}, key = randomUUID()) {
  const result = await db.query(
    "select public.no_gov_mutate($1,$2,$3::jsonb,$4) value",
    [team, action, JSON.stringify(payload), key],
  );
  return result.rows[0].value;
}
async function snapshot(team) {
  return (await db.query("select public.no_gov_snapshot($1) value", [team]))
    .rows[0].value;
}
const request = {
  matchId: "match",
  eta: "2026-10-13T12:45:00Z",
  reason: "Traffic delay",
};
const violation = (subject = member, at = "2026-10-13T09:00Z") => ({
  subject,
  type: "other",
  description: "Verified breach",
  occurredAt: at,
  fine: 10000,
});

test("server accepts late requests before and exactly at cutoff, rejects direct calls after", async () => {
  const team = await fixture();
  await clock("2026-10-13T11:29:59Z");
  await rpc(team, "late_request", request);
  await clock("2026-10-13T11:30:00Z");
  assert.equal(
    (await rpc(team, "late_request", request)).data.status,
    "pending",
  );
  await clock("2026-10-13T11:30:00.001Z");
  await assert.rejects(rpc(team, "late_request", request), /cutoff passed/);
});
test("attendance, request and actual arrival stay separate; member cannot confirm arrival", async () => {
  const team = await fixture();
  await rpc(team, "attendance", { matchId: "match", status: "attending" });
  await rpc(team, "late_request", request);
  const state = await snapshot(team);
  assert.equal(state.events.filter((e) => e.action === "arrival").length, 0);
  assert.equal(state.events.filter((e) => e.action === "attendance").length, 1);
  await assert.rejects(
    rpc(team, "arrival", {
      subject: other,
      matchId: "match",
      arrivedAt: "2026-10-13T12:00Z",
      reason: "Seen at pitch",
    }),
    /Leader required/,
  );
});
test("members cannot edit rules, approve lateness, finalize violations or unlock themselves", async () => {
  const team = await fixture();
  const late = await rpc(team, "late_request", request);
  for (const [action, data] of [
    ["rules", { content: "Mine" }],
    ["review_late", { requestId: late.id, status: "approved", reason: "Self" }],
    ["violation", violation()],
    ["sanction", { subject: member, kind: "unlock", reason: "Self" }],
  ])
    await assert.rejects(rpc(team, action, data), /Leader required/);
});
test("even owner cannot approve own lateness or sanction self; admin cannot sanction owner", async () => {
  const team = await fixture();
  await as(owner);
  const late = await rpc(team, "late_request", request);
  await assert.rejects(
    rpc(team, "review_late", {
      requestId: late.id,
      status: "approved",
      reason: "Self approval",
    }),
    /own request/,
  );
  await assert.rejects(
    rpc(team, "sanction", {
      subject: owner,
      kind: "lock",
      reason: "Self",
      until: "2026-10-14Z",
    }),
    /Cannot sanction/,
  );
  await as(admin);
  await assert.rejects(
    rpc(team, "sanction", {
      subject: owner,
      kind: "remove",
      reason: "Remove owner",
    }),
    /Cannot sanction/,
  );
});
test("retrying finalization with same or different keys creates exactly one fine", async () => {
  const team = await fixture();
  await as(admin);
  await clock("2026-10-13T13:00Z");
  await rpc(team, "arrival", {
    subject: member,
    matchId: "match",
    arrivedAt: "2026-10-13T12:40Z",
    reason: "Confirmed at pitch",
  });
  const key = randomUUID(),
    first = await rpc(
      team,
      "finalize",
      { subject: member, matchId: "match" },
      key,
    );
  assert.equal(first.data.fine, 50000);
  assert.equal(
    (await rpc(team, "finalize", { subject: member, matchId: "match" }, key))
      .id,
    first.id,
  );
  assert.equal(
    (await rpc(team, "finalize", { subject: member, matchId: "match" })).id,
    first.id,
  );
  assert.equal(
    (await snapshot(team)).events.filter((e) => e.action === "violation")
      .length,
    1,
  );
  await as(member);
  await assert.rejects(
    rpc(team, "attendance", { matchId: "match", status: "absent" }),
    /finalized/,
  );
});
test("approval grants ETA baseline plus grace, but is not blanket immunity", async () => {
  const team = await fixture();
  const late = await rpc(team, "late_request", request);
  await as(admin);
  await rpc(team, "review_late", {
    requestId: late.id,
    status: "approved",
    reason: "Approved by admin",
  });
  await clock("2026-10-13T13:00Z");
  await rpc(team, "arrival", {
    subject: member,
    matchId: "match",
    arrivedAt: "2026-10-13T12:51Z",
    reason: "Confirmed at pitch",
  });
  assert.equal(
    (await rpc(team, "finalize", { subject: member, matchId: "match" })).data
      .fine,
    50000,
  );
});
test("originals are append-only, and a reasoned adjustment preserves original fine", async () => {
  const team = await fixture();
  await as(admin);
  const original = await rpc(team, "violation", violation());
  await assert.rejects(
    db.query(`update public.no_gov_events set data='{}' where id=$1`, [
      original.id,
    ]),
    /permission denied/,
  );
  await rpc(team, "adjust", {
    eventId: original.id,
    status: "void",
    fine: 0,
    reason: "Wrong player was identified",
  });
  const records = (await snapshot(team)).events;
  assert.equal(records.find((e) => e.id === original.id).data.fine, 10000);
  assert.equal(records.filter((e) => e.action === "adjust").length, 1);
  await db.exec("reset role");
  await assert.rejects(
    db.query(`delete from public.no_gov_events where id=$1`, [original.id]),
    /append-only/,
  );
});
test("threshold fires at N, once per threshold/period, and review can only be handled once", async () => {
  const team = await fixture();
  await as(admin);
  await rpc(team, "violation", violation());
  assert.equal(
    (await snapshot(team)).events.filter((e) => e.action === "threshold")
      .length,
    0,
  );
  await rpc(team, "violation", violation());
  await rpc(team, "violation", violation());
  const tasks = (await snapshot(team)).events.filter(
    (e) => e.action === "threshold",
  );
  assert.equal(tasks.length, 1);
  assert.equal(tasks[0].data.count, 2);
  await rpc(team, "sanction", {
    subject: member,
    thresholdId: tasks[0].id,
    kind: "warning",
    reason: "Reviewed threshold",
  });
  await assert.rejects(
    rpc(team, "sanction", {
      subject: member,
      thresholdId: tasks[0].id,
      kind: "warning",
      reason: "Retry with new key",
    }),
    /already handled/,
  );
});
test("monthly and quarterly boundaries use team timezone, not UTC calendar", async () => {
  for (const period of ["month", "quarter"]) {
    const team = await fixture({
      period,
      threshold: 2,
      types: ["other"],
      mode: "review",
      action: "warning",
    });
    await as(admin);
    await rpc(team, "violation", violation(member, "2026-09-30T16:59:59Z"));
    await rpc(team, "violation", violation(member, "2026-09-30T17:00:00Z"));
    let tasks = (await snapshot(team)).events.filter(
      (e) => e.action === "threshold",
    );
    assert.equal(tasks.length, 0);
    await rpc(team, "violation", violation(member, "2026-10-01T00:00:00Z"));
    tasks = (await snapshot(team)).events.filter(
      (e) => e.action === "threshold",
    );
    assert.equal(tasks.length, 1);
    assert.equal(
      new Date(tasks[0].data.periodStart).toISOString(),
      "2026-09-30T17:00:00.000Z",
    );
  }
});
test("lock and removal are team scoped; retained history stays private and member cannot unlock", async () => {
  const a = await fixture(),
    b = await fixture();
  await as(admin);
  await rpc(a, "violation", violation());
  await rpc(a, "sanction", {
    subject: member,
    kind: "lock",
    until: "2026-10-14T10:00Z",
    reason: "Temporary team lock",
  });
  await as(member);
  await assert.rejects(
    rpc(a, "attendance", { matchId: "match", status: "attending" }),
    /restricted/,
  );
  await rpc(b, "attendance", { matchId: "match", status: "attending" });
  await assert.rejects(
    rpc(a, "sanction", {
      subject: member,
      kind: "unlock",
      reason: "Self unlock",
    }),
    /restricted/,
  );
  await as(other);
  assert.equal(
    (await snapshot(a)).events.filter((e) => e.action === "violation").length,
    0,
  );
  await as(admin);
  await rpc(a, "sanction", {
    subject: member,
    kind: "remove",
    reason: "End membership after review",
  });
  await as(member);
  const state = await snapshot(a);
  assert.equal(state.me.status, "removed");
  assert.equal(state.events.filter((e) => e.action === "violation").length, 1);
  await rpc(b, "attendance", { matchId: "match", status: "maybe" });
});
test("direct API table access, anonymous RPC and foreign-team membership claims are denied", async () => {
  const team = await fixture();
  await assert.rejects(
    db.query("select * from public.no_gov_events"),
    /permission denied/,
  );
  await as("00000000-0000-4000-8000-000000000099");
  await assert.rejects(snapshot(team), /Not a provisioned member/);
  await as(null);
  await assert.rejects(
    rpc(team, "late_request", request),
    /Authentication required/,
  );
  await db.exec("reset role; set role anon");
  await assert.rejects(snapshot(team), /permission denied/);
});
test("new rules never rewrite old violations; versions and acknowledgements are append-only", async () => {
  const team = await fixture();
  await as(admin);
  const old = await rpc(team, "violation", violation());
  await rpc(team, "rules", {
    content: "New rule text",
    effectiveAt: "2026-10-13T10:00Z",
    requireAck: true,
  });
  let state = await snapshot(team);
  assert.equal(state.rules.length, 2);
  assert.equal(state.events.find((e) => e.id === old.id).data.ruleVersion, 1);
  await as(member);
  const rule = state.rules.find((r) => r.version === 2);
  await rpc(team, "ack_rules", { ruleId: rule.id });
  state = await snapshot(team);
  assert.equal(
    state.events.find((e) => e.action === "ack_rules").data.version,
    2,
  );
});
test("archiving retains events; finalized matches cannot be silently rescheduled via id", async () => {
  const team = await fixture();
  await as(admin);
  const old = await rpc(team, "violation", {
    ...violation(),
    matchId: "match",
  });
  await rpc(team, "archive_match", { matchId: "match" });
  assert.ok((await snapshot(team)).matches[0].archived_at);
  assert.ok((await snapshot(team)).events.find((e) => e.id === old.id));
  await rpc(team, "restore_match", { matchId: "match" });
  assert.equal((await snapshot(team)).matches[0].archived_at, null);
  await assert.rejects(
    rpc(team, "match", {
      id: "match",
      title: "Altered",
      kickoff: "2026-10-14T12:00Z",
      deadline: "2026-10-14T10:00Z",
    }),
    /finalized history/,
  );
});

test("arrival correction is used when finalizing, with original arrival retained", async () => {
  const team = await fixture();
  await as(admin);
  await clock("2026-10-13T13:00Z");
  const arrival = await rpc(team, "arrival", {
    subject: member,
    matchId: "match",
    arrivedAt: "2026-10-13T12:40Z",
    reason: "Initial recording",
  });
  await rpc(team, "adjust", {
    eventId: arrival.id,
    arrivedAt: "2026-10-13T12:35Z",
    reason: "Checked against pitch clock",
  });
  assert.equal(
    (await rpc(team, "finalize", { subject: member, matchId: "match" })).action,
    "arrival_checked",
  );
  assert.equal(
    new Date(
      (await snapshot(team)).events.find((e) => e.id === arrival.id).data
        .arrivedAt,
    ).toISOString(),
    "2026-10-13T12:40:00.000Z",
  );
});
test("automatic sanctions and incomplete policy changes are rejected; expired locks permit participation", async () => {
  const team = await fixture();
  await as(admin);
  await assert.rejects(
    rpc(team, "policy", {
      period: "month",
      threshold: 3,
      types: ["late"],
      mode: "automatic",
      action: "lock",
    }),
    /not enabled/,
  );
  await assert.rejects(
    rpc(team, "policy", { period: "month" }),
    /Invalid policy/,
  );
  await assert.rejects(rpc(team,'policy',{period:'month',threshold:null,types:['late'],mode:'review',action:'warning'}),/Invalid policy/);
  await assert.rejects(rpc(team,'policy',{period:'month',threshold:3,types:[null],mode:'review',action:'warning'}),/Invalid counted type/);
  await rpc(team, "sanction", {
    subject: member,
    kind: "lock",
    until: "2026-10-13T10:01Z",
    reason: "Short team lock",
  });
  await clock("2026-10-13T10:02Z");
  await as(member);
  await rpc(team, "attendance", { matchId: "match", status: "attending" });
  assert.equal((await snapshot(team)).me.status, "active");
});
