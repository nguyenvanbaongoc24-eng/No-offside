import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  createMasterDb,
  asUser,
  rpc,
  owner,
  member,
  outsider,
} from "./helpers/masterDb.mjs";
import { splitBill, mediaLink, motmWinners } from "../src/lib/pro.js";
let db;
const call = (team, action, payload = {}, key = randomUUID()) =>
  rpc(db, "no_pro_action", [team, action, payload, key]);
before(async () => {
  db = await createMasterDb();
  await asUser(db, owner);
  await rpc(db, "no_app_create_team", ["pro-a", "FC Một", {}]);
  await asUser(db, member);
  await rpc(db, "no_app_create_team", ["pro-b", "FC Hai", {}]);
  await db.exec("reset role");
  await db.query(
    "insert into no_gov_members(team_id,user_id,name,role,status,jersey_number) values('pro-a',$1,'Cầu thủ','member','active',17)",
    [member],
  );
});
after(async () => db.close());
test("bill splits preserve every dong and media allowlist excludes scripts/shortened/untrusted embeds", () => {
  const shares = splitBill(1000001, ["b", "a", "a", "c"]);
  assert.equal(
    shares.reduce((n, s) => n + s.amount, 0),
    1000001,
  );
  assert.equal(shares[0].amount - shares.at(-1).amount, 1);
  assert.throws(() => splitBill(1, []));
  assert.equal(
    mediaLink("https://youtu.be/abcdefghijk").url,
    "https://www.youtube-nocookie.com/embed/abcdefghijk",
  );
  assert.equal(
    mediaLink("https://www.tiktok.com/@fc/video/1234567890123456789").kind,
    "tiktok",
  );
  for (const url of [
    "javascript:alert(1)",
    "https://youtube.com.evil.test/embed/abcdefghijk",
    "https://127.0.0.1/x.png",
    "https://vt.tiktok.com/abc",
    "https://user:pass@youtube.com/watch?v=abcdefghijk",
  ])
    assert.throws(() => mediaLink(url));
});
test("matchmaking acceptance is atomic for both teams, one winner only and request retries do not create duplicate fixtures", async () => {
  await asUser(db, owner);
  await call("pro-a", "offer", {
    district: "Quận 3",
    venue: "Sân thử",
    kickoff: new Date(Date.now() + 3 * 864e5).toISOString(),
    format: 7,
    level: "regular",
    finance: "split",
  });
  const offer = (await call("pro-a", "state")).offers[0];
  await asUser(db, outsider);
  await assert.rejects(
    () => call("pro-b", "challenge", { offerId: offer.id }),
    /quyền/,
  );
  await asUser(db, member);
  await call("pro-b", "challenge", { offerId: offer.id });
  const challenge = (await call("pro-b", "state")).challenges[0];
  await assert.rejects(
    () => call("pro-b", "accept", { challengeId: challenge.id }),
    /không hợp lệ/,
  );
  await asUser(db, owner);
  const key = randomUUID();
  await call("pro-a", "accept", { challengeId: challenge.id }, key);
  await call("pro-a", "accept", { challengeId: challenge.id }, key);
  await assert.rejects(
    () => call("pro-a", "accept", { challengeId: challenge.id }),
    /không hợp lệ/,
  );
  await db.exec("reset role");
  const fixtures = (
    await db.query(
      "select team_id,data->'matches' as matches from no_app_workspaces where team_id in('pro-a','pro-b')",
    )
  ).rows;
  assert.equal(fixtures.length, 2);
  for (const f of fixtures) {
    assert.equal(f.matches.length, 1);
    assert.equal(f.matches[0].sourceOffer, offer.id);
  }
});
test("third-half bills stay out of team ledger, are idempotent, private per member and require reasoned settlement", async () => {
  await asUser(db, owner);
  const key = randomUUID();
  await call(
    "pro-a",
    "third-bill",
    {
      title: "Giao lưu sau trận",
      total: 1000001,
      participants: [owner, member],
    },
    key,
  );
  await call(
    "pro-a",
    "third-bill",
    {
      title: "Giao lưu sau trận",
      total: 1000001,
      participants: [owner, member],
    },
    key,
  );
  const s = await call("pro-a", "state");
  assert.equal(s.charges.length, 2);
  assert.equal(
    s.charges.reduce((n, c) => n + Number(c.amount), 0),
    1000001,
  );
  await asUser(db, member);
  const mine = await call("pro-a", "state");
  assert.equal(mine.charges.length, 1);
  assert.equal(mine.charges[0].subject, member);
  await assert.rejects(
    () =>
      call("pro-a", "third-bill", {
        title: "Sai quyền",
        total: 10,
        participants: [owner],
      }),
    /ban quản trị/,
  );
  await assert.rejects(
    () => db.query("select * from no_pro_bills"),
    /permission denied/,
  );
  await asUser(db, owner);
  await assert.rejects(
    () =>
      call("pro-a", "charge-paid", { chargeId: s.charges[0].id, reason: "x" }),
    /lý do/,
  );
  await call("pro-a", "charge-paid", {
    chargeId: s.charges[0].id,
    reason: "Đã nhận tiền mặt",
  });
  assert.equal(
    (await call("pro-a", "state")).charges.filter((c) => c.status === "paid")
      .length,
    1,
  );
  await db.exec("reset role");
  assert.equal(
    (
      await db.query(
        "select jsonb_array_length(data->'funds'->'transactions') n from no_app_workspaces where team_id='pro-a'",
      )
    ).rows[0].n,
    0,
  );
});
test("MOTM and statistics require recorded participation; enabled yellow fines add one debt once", async () => {
  await db.exec("reset role");
  const match = {
    id: "played-pro",
    title: "Trận test",
    datetime: new Date(Date.now() - 3600e3).toISOString(),
    status: "completed",
  };
  await db.query(
    "update no_app_workspaces set data=jsonb_set(jsonb_set(data,'{matches}',data->'matches'||$1::jsonb),'{attendance}',jsonb_build_object('played-pro',jsonb_build_object($2::text,'attending',$3::text,'attending'))) where team_id='pro-a'",
    [JSON.stringify([match]), owner, member],
  );
  await asUser(db, owner);
  await call("pro-a", "vote", { matchId: match.id, candidate: member });
  await call("pro-a", "vote", { matchId: match.id, candidate: owner });
  assert.equal((await call("pro-a", "state")).votes.length, 1);
  await assert.rejects(
    () => call("pro-a", "vote", { matchId: match.id, candidate: outsider }),
    /tham gia/,
  );
  await call("pro-a", "policy", { yellow: true, late: false, absence: false });
  const key = randomUUID();
  await call(
    "pro-a",
    "finalize-stats",
    {
      matchId: match.id,
      players: [
        { id: owner, goals: 2, assists: 1, yellow: 1 },
        { id: member, goals: 1, assists: 0, yellow: 0 },
      ],
    },
    key,
  );
  await call(
    "pro-a",
    "finalize-stats",
    { matchId: match.id, players: [] },
    key,
  );
  await assert.rejects(
    () =>
      call("pro-a", "finalize-stats", {
        matchId: match.id,
        players: [{ id: owner, goals: 3, assists: 1, yellow: 1 }],
      }),
    /đã chốt/,
  );
  const state = await call("pro-a", "state");
  assert.equal(state.charges.filter((c) => c.kind === "fine").length, 1);
  assert.equal(
    Number(state.charges.find((c) => c.kind === "fine").amount),
    50000,
  );
  assert.equal(state.stats.length, 2);
  await db.exec("reset role");
  assert.equal(
    (
      await db.query(
        "select jsonb_array_length(data->'funds'->'debtors') n from no_app_workspaces where team_id='pro-a'",
      )
    ).rows[0].n,
    1,
  );
});
test("highlight URLs are constrained on the server and only author/admin can hide; weekly ties do not invent a winner", async () => {
  await asUser(db, member);
  await call("pro-a", "media-add", {
    matchId: "played-pro",
    kind: "youtube",
    url: "https://www.youtube-nocookie.com/embed/abcdefghijk",
    caption: "Bàn thắng",
  });
  await assert.rejects(
    () =>
      call("pro-a", "media-add", {
        matchId: "played-pro",
        kind: "youtube",
        url: "javascript:alert(1)",
      }),
    /không được hỗ trợ/,
  );
  let media = (await call("pro-a", "state")).media;
  assert.equal(media.length, 1);
  await call("pro-a", "media-hide", { mediaId: media[0].id });
  assert.equal((await call("pro-a", "state")).media.length, 0);
  const matches = [
    { id: "m", status: "completed", datetime: new Date().toISOString() },
  ];
  assert.deepEqual(
    motmWinners(
      [
        { match_id: "m", candidate: "a" },
        { match_id: "m", candidate: "b" },
      ],
      matches,
    ),
    {},
  );
  assert.equal(
    motmWinners([{ match_id: "m", candidate: "a" }], matches).a,
    true,
  );
});
test("all-participant MOTM finalizes once and remains awarded for seven days", async () => {
  await asUser(db, member);
  await call("pro-a", "vote", { matchId: "played-pro", candidate: owner });
  const state = await call("pro-a", "state");
  assert.equal(state.awards.length, 1);
  assert.equal(state.awards[0].winner, owner);
  assert.ok(
    Date.parse(state.awards[0].valid_until) -
      Date.parse(state.awards[0].awarded_at) >
      6.99 * 864e5,
  );
  await assert.rejects(
    () => call("pro-a", "vote", { matchId: "played-pro", candidate: member }),
    /đã chốt/,
  );
});
test("completion applies confirmed late and near-kickoff absence fines once; invalid bill rolls back fully", async () => {
  await asUser(db, owner);
  await call("pro-a", "policy", { yellow: true, late: true, absence: true });
  await db.exec("reset role");
  const kickoff = new Date(Date.now() - 1800e3).toISOString(),
    deadline = new Date(Date.now() - 5400e3).toISOString(),
    match = "auto-fine-pro";
  await db.query(
    "insert into no_gov_matches(team_id,id,title,kickoff,attendance_deadline) values('pro-a',$1,'Chốt tự động',$2,$3)",
    [match, kickoff, deadline],
  );
  await db.query(
    "insert into no_gov_events(team_id,actor,subject,match_id,action,request_key,data,created_at) values('pro-a',$1,$2,$3,'violation',$4,$5::jsonb,clock_timestamp()),('pro-a',$1,$2,$3,'attendance',$6,$7::jsonb,clock_timestamp()-interval '100 minutes')",
    [
      owner,
      member,
      match,
      randomUUID(),
      JSON.stringify({ type: "late", fine: 30000, status: "final" }),
      randomUUID(),
      JSON.stringify({ status: "absent" }),
    ],
  );
  await db.query(
    "update no_app_workspaces set data=jsonb_set(data,'{matches}',data->'matches'||$1::jsonb) where team_id='pro-a'",
    [
      JSON.stringify([
        {
          id: match,
          title: "Chốt tự động",
          datetime: kickoff,
          status: "completed",
        },
      ]),
    ],
  );
  await db.query("select no_pro_apply_fines($1,$2)", ["pro-a", match]);
  await asUser(db, owner);
  const state = await call("pro-a", "state");
  const automatic = state.charges.filter((c) => c.source_key.startsWith(match));
  assert.equal(automatic.length, 2);
  assert.equal(
    automatic.reduce((n, c) => n + Number(c.amount), 0),
    130000,
  );
  const before = state.bills.length;
  await assert.rejects(
    () =>
      call("pro-a", "third-bill", {
        title: "Bill không hợp lệ",
        total: 1000,
        participants: [member, outsider],
      }),
    /không hoạt động/,
  );
  assert.equal((await call("pro-a", "state")).bills.length, before);
});
test("saved drawing accepts normalized points, rejects oversized/out-of-pitch strokes; fine settlement follows ledger receipt", async () => {
  await db.exec("reset role");
  const valid = {
    activeId: "a",
    formations: [
      {
        id: "a",
        players: [],
        drawing: [
          {
            color: "red",
            points: [
              [0.1, 0.1],
              [0.5, 0.5],
            ],
          },
        ],
      },
    ],
  };
  await db.query(
    "update no_app_workspaces set data=jsonb_set(data,'{lineups}',$1::jsonb) where team_id='pro-a'",
    [JSON.stringify(valid)],
  );
  const invalid = structuredClone(valid);
  invalid.formations[0].drawing[0].points[1] = [2, 0];
  await assert.rejects(
    () =>
      db.query(
        "update no_app_workspaces set data=jsonb_set(data,'{lineups}',$1::jsonb) where team_id='pro-a'",
        [JSON.stringify(invalid)],
      ),
    /Tọa độ/,
  );
  const row = (
    await db.query("select data from no_app_workspaces where team_id='pro-a'")
  ).rows[0].data;
  const debtor = row.funds.debtors.find((d) => d.source === "pro-fine");
  row.funds.debtors = row.funds.debtors.filter((d) => d.id !== debtor.id);
  row.funds.transactions.push({
    id: randomUUID(),
    type: "income",
    playerId: debtor.playerId,
    month: debtor.month,
    amount: debtor.amount,
  });
  await db.query(
    "update no_app_workspaces set data=$1::jsonb where team_id='pro-a'",
    [JSON.stringify(row)],
  );
  assert.equal(
    (
      await db.query("select status from no_pro_charges where id=$1", [
        debtor.id.slice(4),
      ])
    ).rows[0].status,
    "paid",
  );
});
test("approving an older payment cannot erase a fine issued while that payment was pending", async () => {
  await asUser(db, owner);
  await db.exec("reset role");
  const period = (
    await db.query(
      "select to_char(clock_timestamp() at time zone 'Asia/Ho_Chi_Minh','YYYY-MM') as period",
    )
  ).rows[0].period;
  await db.query(
    "update no_app_workspaces set data=jsonb_set(jsonb_set(data,'{funds,pendingApprovals}','[]'),'{funds,debtors}',$1::jsonb) where team_id='pro-a'",
    [
      JSON.stringify([
        {
          id: "base-due",
          playerId: member,
          name: "Cầu thủ",
          month: period,
          amount: 150000,
        },
      ]),
    ],
  );
  await asUser(db, member);
  await rpc(db, "no_app_payment", ["pro-a", "request", "", "", randomUUID()]);
  let snapshot = await rpc(db, "no_app_snapshot", ["pro-a"]);
  const payment = snapshot.data.funds.pendingApprovals[0];
  assert.equal(payment.amount, 150000);
  assert.equal(payment.debtSnapshot.length, 1);
  await asUser(db, owner);
  await db.exec("reset role");
  await db.query(
    "select no_pro_charge('pro-a',$1,'fine','pending-new-fine','Phạt phát sinh sau yêu cầu',50000,null)",
    [member],
  );
  await asUser(db, owner);
  await rpc(db, "no_app_payment", [
    "pro-a",
    "approve",
    payment.id,
    "Đã nhận 150k",
    randomUUID(),
  ]);
  snapshot = await rpc(db, "no_app_snapshot", ["pro-a"]);
  const remaining = snapshot.data.funds.debtors.filter(
    (d) => d.playerId === member && d.month === period,
  );
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].amount, 50000);
  const fine = (await call("pro-a", "state")).charges.find(
    (c) => c.source_key === "pending-new-fine",
  );
  assert.equal(fine.status, "owed");
  await asUser(db, member);
  await rpc(db, "no_app_payment", ["pro-a", "request", "", "", randomUUID()]);
  snapshot = await rpc(db, "no_app_snapshot", ["pro-a"]);
  assert.equal(snapshot.data.funds.pendingApprovals[0].amount, 50000);
});
