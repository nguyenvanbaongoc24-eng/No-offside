import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { createMasterDb, asUser, rpc, owner, member, outsider } from './helpers/masterDb.mjs';
import { lifecycle, isMatchArchived } from '../src/lib/matchLifecycle.js';

// Compile React components for static UI checks
const root = fileURLToPath(new URL('../', import.meta.url));
const bundle = await build({
  absWorkingDir: root,
  stdin: {
    resolveDir: root,
    loader: 'jsx',
    contents: `
      import React from 'react';
      import { renderToStaticMarkup } from 'react-dom/server';
      import MatchList from './src/components/MatchList.jsx';
      import Dashboard from './src/pages/PlayerDashboard.jsx';
      import EmptyTeam from './src/pages/EmptyTeam.jsx';
      export const render = (comp, props) => {
        const C = { MatchList, Dashboard, EmptyTeam }[comp];
        return renderToStaticMarkup(React.createElement(C, props));
      };
    `,
  },
  bundle: true,
  platform: 'node',
  format: 'cjs',
  write: false,
});

const compiled = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(
  createRequire(import.meta.url),
  compiled,
  compiled.exports
);
const { render } = compiled.exports;
const noop = () => {};

let db;
const team = 'archive-team';
const action = (name, payload = {}, id = 'game-1', key = randomUUID()) =>
  rpc(db, 'no_match_action', [team, id, name, payload, key]);

before(async () => {
  db = await createMasterDb();
  await db.exec(await readFile(new URL('../supabase/migrations/202610190001_match_lifecycle.sql', import.meta.url), 'utf8'));
  await asUser(db, owner);
  await rpc(db, 'no_app_create_team', [team, 'Đội Lưu Trữ', {}]);
  await db.exec('reset role');
  await db.query(
    "insert into no_gov_members(team_id,user_id,name,role,status) values($1,$2,'Thành viên','member','active'),($1,$3,'Quản trị','admin','active')",
    [team, member, outsider]
  );
  await asUser(db, owner);
});

after(async () => db.close());

test('Tab "Lịch sử" and "Sắp tới" segregation, newest-first order, search, month filter, and task chips', () => {
  const m1 = {
    id: 'm1',
    title: 'FC Tigers',
    opponent: 'FC Tigers',
    venue: 'Sân Chuyên Việt',
    datetime: '2026-10-10T19:00:00.000Z',
    endsAt: '2026-10-10T20:30:00.000Z',
    status: 'completed',
    archivedAt: '2026-10-10T21:00:00.000Z',
    scoreHome: 3,
    scoreAway: 2,
    detailState: { finalized: true, costUpdated: true, pendingReceivables: false },
  };
  const m2 = {
    id: 'm2',
    title: 'Trận nội bộ Tháng 9',
    matchType: 'internal',
    opponent: '',
    venue: 'Sân Quân Khu 5',
    datetime: '2026-09-15T18:00:00.000Z',
    endsAt: '2026-09-15T19:30:00.000Z',
    status: 'completed',
    archivedAt: '2026-09-15T20:00:00.000Z',
    scoreHome: null,
    scoreAway: null,
    detailState: { finalized: false, costUpdated: false, pendingReceivables: true },
  };
  const mUpcoming = {
    id: 'm3',
    title: 'FC Dragon',
    opponent: 'FC Dragon',
    venue: 'Sân Tuyên Sơn',
    datetime: '2026-11-01T19:00:00.000Z',
    endsAt: '2026-11-01T20:30:00.000Z',
    status: 'upcoming',
  };

  // 1. Upcoming tab shows mUpcoming, hides archived m1 and m2
  const upcomingHtml = render('MatchList', {
    matches: [mUpcoming],
    archivedMatches: [m1, m2],
    initialTab: 'upcoming',
    canDelete: true,
    canManageFunds: true,
  });
  assert.match(upcomingHtml, /FC Dragon/);
  assert.doesNotMatch(upcomingHtml, /FC Tigers/);
  assert.doesNotMatch(upcomingHtml, /Trận nội bộ Tháng 9/);
  assert.match(upcomingHtml, /Sắp tới/);
  assert.match(upcomingHtml, /Lịch sử/);

  // 2. History tab shows completed and archived matches m1 and m2, hides mUpcoming
  const historyHtml = render('MatchList', {
    matches: [mUpcoming],
    archivedMatches: [m1, m2],
    initialTab: 'history',
    canDelete: true,
    canManageFunds: true,
  });
  assert.doesNotMatch(historyHtml, /FC Dragon/);
  assert.match(historyHtml, /FC Tigers/);
  assert.match(historyHtml, /Trận nội bộ Tháng 9/);

  // Score or fallback
  assert.match(historyHtml, /3\s*-\s*2/);
  assert.match(historyHtml, /Chưa cập nhật kết quả/);

  // Actionable chips for unfinished items on m2
  assert.match(historyHtml, /Chưa chốt điểm danh/);
  assert.match(historyHtml, /Chưa cập nhật chi phí/);
  assert.match(historyHtml, /Còn khoản phải thu/);

  // Order check: m1 (October) must appear before m2 (September)
  const idxM1 = historyHtml.indexOf('FC Tigers');
  const idxM2 = historyHtml.indexOf('Trận nội bộ Tháng 9');
  assert.ok(idxM1 < idxM2, 'Newest completed match must appear first in History');

  // Search input and month filter presence
  assert.match(historyHtml, /Tìm theo đối thủ hoặc tên trận\.\.\./);
  assert.match(historyHtml, /Tất cả các tháng/);
  assert.match(historyHtml, /Tháng 10\/2026/);
  assert.match(historyHtml, /Tháng 9\/2026/);
});

test('Dashboard and EmptyTeam render manager banner "Có X trận trong lịch sử cần hoàn tất" for leaders', () => {
  const managerUser = { id: owner, name: 'Đội trưởng', number: 10 };
  const archivedWithPending = [
    {
      id: 'arch-1',
      title: 'Trận 1',
      datetime: '2026-10-01T18:00:00.000Z',
      status: 'completed',
      archivedAt: '2026-10-01T20:00:00.000Z',
      detailState: { finalized: false, costUpdated: true, pendingReceivables: false },
    },
    {
      id: 'arch-2',
      title: 'Trận 2',
      datetime: '2026-10-05T18:00:00.000Z',
      status: 'completed',
      archivedAt: '2026-10-05T20:00:00.000Z',
      detailState: { finalized: true, costUpdated: false, pendingReceivables: false },
    },
  ];

  const currentMatch = {
    id: 'm-live',
    title: 'FC Live',
    datetime: '2026-10-25T18:00:00.000Z',
    deadline: '2026-10-25T16:00:00.000Z',
    endsAt: '2026-10-25T20:00:00.000Z',
    status: 'upcoming',
  };

  // Leader sees the count on Dashboard when there is an active match
  const leaderDashboardHtml = render('Dashboard', {
    user: managerUser,
    currentUserRole: 'owner',
    treasurer: true,
    teamSettings: { teamName: 'Đội Lưu Trữ', members: [managerUser], appearance: {} },
    members: [managerUser],
    activeMatch: currentMatch,
    matches: [currentMatch],
    archivedMatches: archivedWithPending,
    attendance: {},
    reports: {},
    funds: { transactions: [], pendingApprovals: [], debtors: [] },
    balance: 0,
  });
  assert.match(leaderDashboardHtml, /Có 2 trận trong lịch sử cần hoàn tất/);

  // Leader sees the count on EmptyTeam when there are no active matches
  const leaderEmptyTeamHtml = render('EmptyTeam', {
    leader: true,
    canManageFunds: true,
    teamSettings: { teamName: 'Đội Lưu Trữ', members: [managerUser] },
    archivedMatches: archivedWithPending,
    onNavigate: noop,
  });
  assert.match(leaderEmptyTeamHtml, /Có 2 trận trong lịch sử cần hoàn tất/);

  // Regular member does NOT see the manager banner on Dashboard
  const memberUser = { id: member, name: 'Cầu thủ', number: 7 };
  const memberDashboardHtml = render('Dashboard', {
    user: memberUser,
    currentUserRole: 'member',
    teamSettings: { teamName: 'Đội Lưu Trữ', members: [memberUser], appearance: {} },
    members: [memberUser],
    activeMatch: currentMatch,
    matches: [currentMatch],
    archivedMatches: archivedWithPending,
    attendance: {},
    reports: {},
    funds: { transactions: [], pendingApprovals: [], debtors: [] },
    balance: 0,
  });
  assert.doesNotMatch(memberDashboardHtml, /trong lịch sử cần hoàn tất/);
});

test('Legacy completed match without archivedAt is classified as archived and excluded from upcoming active match', () => {
  const legacyMatch = {
    id: 'legacy-1',
    title: 'Kèo Sân 7 — fc cc',
    datetime: '2026-10-17T12:30:00.000Z',
    status: 'completed',
    // archivedAt is undefined
  };
  assert.equal(isMatchArchived(legacyMatch), true);
  assert.equal(isMatchArchived({ id: 'up', status: 'upcoming' }), false);

  // In MatchList, legacyMatch appears in history tab, not in upcoming tab
  const historyHtml = render('MatchList', {
    matches: [legacyMatch],
    archivedMatches: [],
    initialTab: 'history',
  });
  assert.match(historyHtml, /Kèo Sân 7 — fc cc/);

  const upcomingHtml = render('MatchList', {
    matches: [legacyMatch],
    archivedMatches: [],
    initialTab: 'upcoming',
  });
  assert.doesNotMatch(upcomingHtml, /Kèo Sân 7 — fc cc/);
});

test('Backend match finish atomically sets archivedAt, removes from dashboard list, and preserves funds & attendance', async () => {
  const futureKick = new Date(Date.now() + 864e5).toISOString();
  const futureEnds = new Date(Date.now() + 9e7).toISOString();
  const futureDeadline = new Date(Date.now() + 8e7).toISOString();
  const matchObj = {
    id: 'game-1',
    status: 'upcoming',
    title: 'FC Sông Hàn',
    matchType: 'friendly',
    opponent: 'FC Sông Hàn',
    venue: 'Sân Chi Lăng',
    datetime: futureKick,
    deadline: futureDeadline,
    endsAt: futureEnds,
    modelVersion: 2,
    expectedPitch: 1000000,
    expectedOther: 0,
    paymentPlan: 'mixed',
    penaltyEnabled: false,
  };

  // Commit initial match with future kickoff
  const state = await rpc(db, 'no_app_snapshot', [team]);
  await rpc(db, 'no_app_commit', [team, state.revision, randomUUID(), { matches: [matchObj] }]);

  // Shift match to past so finish is allowed
  await db.exec('reset role');
  const pastKick = new Date(Date.now() - 7200000).toISOString();
  const pastEnds = new Date(Date.now() - 3600000).toISOString();
  await db.query(
    "update no_app_workspaces set data=jsonb_set(data,'{matches}',(select jsonb_agg(x||jsonb_build_object('datetime',$2::text,'deadline',$3::text,'endsAt',$4::text)) from jsonb_array_elements(data->'matches') x)) where team_id=$1",
    [team, pastKick, new Date(Date.parse(pastKick) - 3600000).toISOString(), pastEnds]
  );
  await db.query('update no_gov_matches set kickoff=$2,attendance_deadline=$3 where team_id=$1', [
    team,
    pastKick,
    new Date(Date.parse(pastKick) - 3600000).toISOString(),
  ]);

  // Non-manager cannot finish/archive
  await asUser(db, member);
  await assert.rejects(() => action('finish', { home: 1, away: 0 }, 'game-1'), /quyền/);

  // Manager finishes and archives
  await asUser(db, owner);
  const finishKey = randomUUID();
  const res = await action('finish', { home: 2, away: 1, note: 'Trận giao hữu đẹp' }, 'game-1', finishKey);
  assert.equal(res.match.status, 'completed');
  assert.ok(res.match.archivedAt, 'archivedAt must be present upon finish');
  assert.equal(res.match.archivedBy, owner);

  // Idempotency check: repeated calls do not duplicate or fail
  const repeat = await action('finish', { home: 2, away: 1 }, 'game-1', finishKey);
  assert.equal(repeat.match.status, 'completed');

  // Verify workspace snapshot: notice generated
  const snap = await rpc(db, 'no_app_snapshot', [team]);
  const archived = snap.data.matches.find((m) => m.id === 'game-1');
  assert.ok(archived.archivedAt);
  const historyNotice = snap.data.notices.find((n) => n.message && n.message.includes('Đã chuyển trận đấu vào Lịch sử'));
  assert.ok(historyNotice, 'Notice about archiving must be stored');
  assert.equal(historyNotice.destination, 'match-detail');

  // Verify non-destructive properties:
  // Data, actuals, finalization and fund cost can still be processed from MatchDetail
  const postState = await action('state', {}, 'game-1');
  assert.equal(postState.match.id, 'game-1');
  assert.equal(postState.record.score_home, 2);
  assert.equal(postState.record.score_away, 1);
  assert.equal(postState.record.finalized_at, null, 'attendance must not be auto-finalized by archive');

  // Manager can still record and finalize attendance on completed archived match
  await action('actual', { entries: [{ id: member, status: 'present', arrivedAt: pastKick }], reason: 'Kiểm tra điểm danh' }, 'game-1');
  await action('actual', { entries: [{ id: outsider, status: 'absent' }], reason: 'Xác nhận vắng' }, 'game-1');
  await asUser(db, outsider);
  await action('actual', { entries: [{ id: owner, status: 'present', arrivedAt: pastKick }], reason: 'Xác nhận đội trưởng' }, 'game-1');
  await asUser(db, owner);
  const finalized = await action('finalize', {}, 'game-1');
  assert.ok(finalized.record.finalized_at, 'attendance can still be finalized after match is archived');
});
