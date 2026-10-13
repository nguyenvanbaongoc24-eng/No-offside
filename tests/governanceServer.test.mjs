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
  await db.exec(`create role anon; create role authenticated; create schema auth;
   create table if not exists auth.users (id uuid primary key, email text, raw_user_meta_data jsonb, phone text);
   insert into auth.users (id, email) values
     ('00000000-0000-4000-8000-000000000001', 'owner@example.com'),
     ('00000000-0000-4000-8000-000000000002', 'admin@example.com'),
     ('00000000-0000-4000-8000-000000000003', 'member@example.com'),
     ('00000000-0000-4000-8000-000000000004', 'other@example.com')
   on conflict do nothing;
   create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
   grant usage on schema auth to authenticated;
   -- Test-only deterministic clock in this disposable WASM PostgreSQL instance.
   create or replace function pg_catalog.clock_timestamp() returns timestamptz language sql volatile as $$ select current_setting('test.clock')::timestamptz $$;
   set test.clock='2026-10-13T10:00:00Z';`);
  await db.exec(
    await readFile(
      new URL(
        "../supabase/migrations/202610130001_governance.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  await db.exec(
    await readFile(
      new URL(
        "../supabase/migrations/202610130002_profiles_and_teams.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  await db.exec(
    await readFile(
      new URL(
        "../supabase/migrations/202610130003_team_invites.sql",
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
  await assert.rejects(
    rpc(team, "policy", {
      period: "month",
      threshold: null,
      types: ["late"],
      mode: "review",
      action: "warning",
    }),
    /Invalid policy/,
  );
  await assert.rejects(
    rpc(team, "policy", {
      period: "month",
      threshold: 3,
      types: [null],
      mode: "review",
      action: "warning",
    }),
    /Invalid counted type/,
  );
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

test("late fine remains independent of another finalized match violation", async () => {
  const team = await fixture();
  await as(admin);
  await clock("2026-10-13T13:00Z");
  const otherBreach = await rpc(team, "violation", {
    ...violation(),
    matchId: "match",
  });
  await rpc(team, "arrival", {
    subject: member,
    matchId: "match",
    arrivedAt: "2026-10-13T12:40Z",
    reason: "Confirmed after reviewing other breach",
  });
  const late = await rpc(team, "finalize", {
    subject: member,
    matchId: "match",
  });
  assert.equal(late.data.type, "late");
  assert.notEqual(late.id, otherBreach.id);
  assert.equal(
    (await snapshot(team)).events.filter((e) => e.action === "violation")
      .length,
    2,
  );
});

test("the same threshold period cannot duplicate when connection timezone changes", async () => {
  const original = (await db.query("select current_setting('TimeZone') value"))
    .rows[0].value;
  const team = await fixture();
  await as(admin);
  await rpc(team, "violation", violation());
  await rpc(team, "violation", violation());
  await db.exec("set time zone 'UTC'");
  await rpc(team, "violation", violation());
  assert.equal(
    (await snapshot(team)).events.filter((e) => e.action === "threshold")
      .length,
    1,
  );
  await db.query("select set_config('TimeZone',$1,false)", [original]);
});

test("authenticated user can create team and become owner, other user joins as member", async () => {
  await as(owner);
  const teamId = "team-" + randomUUID().slice(0, 8);
  const res = await db.query(`select public.no_gov_create_team($1, $2) as r`, [teamId, "FC Sài Gòn"]);
  const rawData = res.rows[0].r;
  const data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
  assert.equal(data.team.id, teamId);
  assert.equal(data.me.role, "owner");

  // Other user joins
  await as(member);
  const joinRes = await db.query(`select public.no_gov_join_team($1, $2) as r`, [teamId, "Thành viên Mới"]);
  const rawJoin = joinRes.rows[0].r;
  const joinData = typeof rawJoin === 'string' ? JSON.parse(rawJoin) : rawJoin;
  assert.equal(joinData.me.role, "member");

  // Member cannot edit rules (leader required)
  await assert.rejects(
    rpc(teamId, "rules", { content: "Luật bất hợp pháp", effectiveAt: "2026-10-13T10:01:00Z" }),
    /Leader required/
  );
});

test("username availability check validates format, rejects duplicate case-insensitively, and protects emails", async () => {
  await db.exec("reset role");
  const testUserId = randomUUID();
  const testEmail = "ngocnguyen566@gmail.com";
  // Inserting into auth.users automatically triggers profile row creation via handle_new_user()
  await db.query(
    `insert into auth.users(id, email, raw_user_meta_data) values($1, $2, '{"username":"ngocnguyen566","full_name":"Ngọc Nguyễn"}'::jsonb)`,
    [testUserId, testEmail],
  );

  // Check valid non-existing username
  const availRes = await db.query(
    `select public.no_auth_check_availability('new_user_123', 'newuser@gmail.com') as r`,
  );
  const availData = typeof availRes.rows[0].r === 'string' ? JSON.parse(availRes.rows[0].r) : availRes.rows[0].r;
  assert.equal(availData.usernameAvailable, true);
  assert.equal(availData.emailAvailable, true);

  // Check duplicate username with different case ("Ngocnguyen566")
  const dupUserRes = await db.query(
    `select public.no_auth_check_availability('Ngocnguyen566', null) as r`,
  );
  const dupUserData = typeof dupUserRes.rows[0].r === 'string' ? JSON.parse(dupUserRes.rows[0].r) : dupUserRes.rows[0].r;
  assert.equal(dupUserData.usernameAvailable, false);

  // Check duplicate email
  const dupEmailRes = await db.query(
    `select public.no_auth_check_availability(null, 'NgocNguyen566@gmail.com') as r`,
  );
  const dupEmailData = typeof dupEmailRes.rows[0].r === 'string' ? JSON.parse(dupEmailRes.rows[0].r) : dupEmailRes.rows[0].r;
  assert.equal(dupEmailData.emailAvailable, false);
});

test("username resolution resolves case-insensitively without exposing entire table, and handles rate limiting lockout", async () => {
  await db.exec("reset role");
  const testUserId = randomUUID();
  const testEmail = "testplayer789@example.com";
  await db.query(
    `insert into auth.users(id, email, raw_user_meta_data) values($1, $2, '{"username":"player_789","full_name":"Player 789"}'::jsonb)`,
    [testUserId, testEmail],
  );

  const clientId = "client-test-" + randomUUID().slice(0, 8);

  // Resolve with exact and different case username
  const resolve1 = await db.query(
    `select public.no_auth_resolve_username('Player_789', $1) as r`,
    [clientId],
  );
  const r1 = typeof resolve1.rows[0].r === 'string' ? JSON.parse(resolve1.rows[0].r) : resolve1.rows[0].r;
  assert.equal(r1.email, testEmail);

  // Resolve unknown username throws generic credential error without revealing existence
  await assert.rejects(
    db.query(`select public.no_auth_resolve_username('non_existent_user_99', $1)`, [clientId]),
    /Tên đăng nhập hoặc mật khẩu không chính xác/
  );

  // Simulate 5 failed attempts from same client
  for (let i = 0; i < 5; i++) {
    await db.query(
      `select public.no_auth_record_login_result('Player_789', false, $1)`,
      [clientId],
    );
  }

  // 6th attempt should be blocked by rate limiting
  await assert.rejects(
    db.query(`select public.no_auth_resolve_username('Player_789', $1)`, [clientId]),
    /quá nhiều lần/
  );

  // Recording success clears the lockout
  await db.query(
    `select public.no_auth_record_login_result('Player_789', true, $1)`,
    [clientId],
  );
  const resolveAfterSuccess = await db.query(
    `select public.no_auth_resolve_username('Player_789', $1) as r`,
    [clientId],
  );
  const rAfter = typeof resolveAfterSuccess.rows[0].r === 'string' ? JSON.parse(resolveAfterSuccess.rows[0].r) : resolveAfterSuccess.rows[0].r;
  assert.equal(rAfter.email, testEmail);
});

test("authenticated user can set username via no_set_username, and preserves database foreign keys", async () => {
  const currentUserId = randomUUID();
  await db.query(
    `insert into auth.users(id, email, raw_user_meta_data) values($1, 'current@example.com', '{"full_name":"Current User"}'::jsonb)`,
    [currentUserId],
  );

  await as(currentUserId);
  const setResult = await db.query(
    `select public.no_set_username('user_unique_1') as r`,
  );
  const sData = typeof setResult.rows[0].r === 'string' ? JSON.parse(setResult.rows[0].r) : setResult.rows[0].r;
  assert.equal(sData.success, true);
  assert.equal(sData.username, "user_unique_1");

  // Setting duplicate username fails
  await db.exec("reset role");
  const otherUserId = randomUUID();
  await db.query(
    `insert into auth.users(id, email, raw_user_meta_data) values($1, 'other@example.com', '{"full_name":"Other User"}'::jsonb)`,
    [otherUserId],
  );

  await as(otherUserId);
  await assert.rejects(
    db.query(`select public.no_set_username('USER_UNIQUE_1')`),
    /đã được sử dụng/
  );
});

test("team invite lifecycle: owner/admin creates and revokes invite, member is forbidden", async () => {
  const team = await fixture();

  // 1. Regular member cannot create invite
  await as(member);
  await assert.rejects(
    db.query(`select public.no_gov_create_invite($1) as r`, [team]),
    /Chỉ Đội trưởng hoặc Ban quản trị/
  );

  // 2. Owner creates invite
  await as(owner);
  const createRes1 = await db.query(`select public.no_gov_create_invite($1) as r`, [team]);
  const invite1 = typeof createRes1.rows[0].r === 'string' ? JSON.parse(createRes1.rows[0].r) : createRes1.rows[0].r;
  assert.equal(invite1.success, true);
  assert.equal(invite1.status, 'active');
  assert.ok(invite1.code && invite1.code.length === 6);

  // 3. Public get_invite looks up code case-insensitively
  await db.exec("reset role");
  await db.exec("set role anon");
  const lookupRes1 = await db.query(
    `select public.no_gov_get_invite($1, 'test-client') as r`,
    [invite1.code.toLowerCase()],
  );
  const lookup1 = typeof lookupRes1.rows[0].r === 'string' ? JSON.parse(lookupRes1.rows[0].r) : lookupRes1.rows[0].r;
  assert.equal(lookup1.valid, true);
  assert.equal(lookup1.teamId, team);
  assert.equal(lookup1.teamName, 'Test team');
  assert.equal(lookup1.captain, 'owner');

  // 4. Admin regenerates invite: old code is revoked, new code generated
  await as(admin);
  const createRes2 = await db.query(`select public.no_gov_create_invite($1) as r`, [team]);
  const invite2 = typeof createRes2.rows[0].r === 'string' ? JSON.parse(createRes2.rows[0].r) : createRes2.rows[0].r;
  assert.notEqual(invite1.code, invite2.code);

  // Old code lookup fails
  await db.exec("reset role");
  await db.exec("set role anon");
  await assert.rejects(
    db.query(`select public.no_gov_get_invite($1, 'test-client')`, [invite1.code]),
    /không hợp lệ hoặc lời mời đã hết hạn/
  );

  // 5. Admin revokes invite
  await as(admin);
  const revokeRes = await db.query(`select public.no_gov_revoke_invite($1) as r`, [team]);
  const rev = typeof revokeRes.rows[0].r === 'string' ? JSON.parse(revokeRes.rows[0].r) : revokeRes.rows[0].r;
  assert.equal(rev.revoked, true);

  // New code lookup fails after revocation
  await db.exec("reset role");
  await db.exec("set role anon");
  await assert.rejects(
    db.query(`select public.no_gov_get_invite($1, 'test-client')`, [invite2.code]),
    /không hợp lệ hoặc lời mời đã hết hạn/
  );
});

test("joining team via invite enforces role 'member', validates jersey number, prevents duplicates and handles idempotency", async () => {
  const team = await fixture();

  // Create active invite
  await as(owner);
  const invRes = await db.query(`select public.no_gov_create_invite($1) as r`, [team]);
  const inv = typeof invRes.rows[0].r === 'string' ? JSON.parse(invRes.rows[0].r) : invRes.rows[0].r;

  // Create a new user to join
  await db.exec("reset role");
  const newUserId = randomUUID();
  await db.query(
    `insert into auth.users(id, email, raw_user_meta_data) values($1, 'newjoiner@example.com', '{"full_name":"New Joiner"}'::jsonb)`,
    [newUserId],
  );

  // 1. Join with valid code, name, jersey number 10
  await as(newUserId);
  const joinRes1 = await db.query(
    `select public.no_gov_join_via_invite($1, 'New Joiner', 10, 'Tiền vệ (MF)') as r`,
    [inv.code.toLowerCase()], // test case insensitivity
  );
  const j1 = typeof joinRes1.rows[0].r === 'string' ? JSON.parse(joinRes1.rows[0].r) : joinRes1.rows[0].r;
  assert.equal(j1.success, true);
  assert.equal(j1.alreadyMember, false);
  assert.equal(j1.me.role, 'member'); // Role is ALWAYS 'member'
  assert.equal(j1.me.jersey_number, 10);
  assert.equal(j1.me.position, 'Tiền vệ (MF)');

  // 2. Joining with another user using SAME jersey number 10 throws duplicate error
  await db.exec("reset role");
  const anotherUserId = randomUUID();
  await db.query(
    `insert into auth.users(id, email, raw_user_meta_data) values($1, 'another@example.com', '{"full_name":"Another Player"}'::jsonb)`,
    [anotherUserId],
  );
  await as(anotherUserId);
  await assert.rejects(
    db.query(`select public.no_gov_join_via_invite($1, 'Another Player', 10, 'Hậu vệ')`, [inv.code]),
    /Số áo 10 đã có thành viên sử dụng/
  );

  // 3. Another user joins with jersey number 7 successfully
  const joinRes2 = await db.query(
    `select public.no_gov_join_via_invite($1, 'Another Player', 7, 'Hậu vệ') as r`,
    [inv.code],
  );
  const j2 = typeof joinRes2.rows[0].r === 'string' ? JSON.parse(joinRes2.rows[0].r) : joinRes2.rows[0].r;
  assert.equal(j2.success, true);
  assert.equal(j2.me.jersey_number, 7);

  // 4. Idempotency: newUserId calls join again -> does NOT duplicate, does NOT change existing jersey number
  await as(newUserId);
  const reJoinRes = await db.query(
    `select public.no_gov_join_via_invite($1, 'Different Name', 99, 'Thủ môn') as r`,
    [inv.code],
  );
  const jRe = typeof reJoinRes.rows[0].r === 'string' ? JSON.parse(reJoinRes.rows[0].r) : reJoinRes.rows[0].r;
  assert.equal(jRe.success, true);
  assert.equal(jRe.alreadyMember, true);
  assert.equal(jRe.me.jersey_number, 10); // Preserved original number 10!
});

test("no_gov_my_memberships returns distinct roles across multiple teams and isolates user memberships", async () => {
  // Create Team A
  const teamA = await fixture();
  await db.exec("reset role");
  // Create Team B
  const teamB = randomUUID();
  await db.query(`insert into public.no_gov_teams(id, name) values($1, 'Team B')`, [teamB]);

  // Create user
  await db.exec("reset role");
  const multiUserId = randomUUID();
  await db.query(
    `insert into auth.users(id, email, raw_user_meta_data) values($1, 'multi@example.com', '{"full_name":"Multi User"}'::jsonb)`,
    [multiUserId],
  );

  // Before joining any team
  await as(multiUserId);
  const m0Res = await db.query(`select public.no_gov_my_memberships() as r`);
  const m0 = typeof m0Res.rows[0].r === 'string' ? JSON.parse(m0Res.rows[0].r) : m0Res.rows[0].r;
  assert.equal(m0.length, 0);

  // MultiUser is Owner of Team B
  await db.exec("reset role");
  await db.query(
    `insert into public.no_gov_members(team_id, user_id, name, role, status, jersey_number) values($1, $2, 'Captain Multi', 'owner', 'active', 10)`,
    [teamB, multiUserId],
  );

  // MultiUser joins Team A as Member via invite
  await as(owner);
  const invRes = await db.query(`select public.no_gov_create_invite($1) as r`, [teamA]);
  const inv = typeof invRes.rows[0].r === 'string' ? JSON.parse(invRes.rows[0].r) : invRes.rows[0].r;

  await as(multiUserId);
  await db.query(`select public.no_gov_join_via_invite($1, 'Player Multi', 25, 'Tiền đạo')`, [inv.code]);

  // Query my memberships
  const mRes = await db.query(`select public.no_gov_my_memberships() as r`);
  const memberships = typeof mRes.rows[0].r === 'string' ? JSON.parse(mRes.rows[0].r) : mRes.rows[0].r;

  assert.equal(memberships.length, 2);
  const roleA = memberships.find((m) => m.teamId === teamA);
  const roleB = memberships.find((m) => m.teamId === teamB);

  assert.ok(roleA);
  assert.equal(roleA.role, 'member');
  assert.equal(roleA.jerseyNumber, 25);

  assert.ok(roleB);
  assert.equal(roleB.role, 'owner');
  assert.equal(roleB.jerseyNumber, 10);
});




