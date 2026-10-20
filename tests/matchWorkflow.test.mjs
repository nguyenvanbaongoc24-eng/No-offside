import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { matchPendingTasks, attendanceReadiness } from '../src/lib/matchWorkflow.js';
import { createMasterDb, asUser, rpc, owner, member, outsider } from './helpers/masterDb.mjs';

const finished = { id: 'game', status: 'completed', detailState: { finalized: false, costKnown: true, remaining: 0 } };
const manager = { canManage: true, canManageFunds: true };
test('paid match still needs explicit attendance; missing projections never fabricate tasks', () => {
  assert.deepEqual(matchPendingTasks(finished, manager).map(t => t.key), ['attendance']);
  assert.deepEqual(matchPendingTasks({ ...finished, detailState: undefined }, manager), []);
  assert.deepEqual(matchPendingTasks({ ...finished, detailState: {} }, manager), []);
  assert.deepEqual(matchPendingTasks({ ...finished, status: 'upcoming' }, manager), []);
  assert.deepEqual(matchPendingTasks({ ...finished, detailState: { ...finished.detailState, finalized: true } }, manager), []);
});

test('task visibility follows actual rights; cancellation keeps genuine outstanding debt', () => {
  assert.deepEqual(matchPendingTasks(finished, { canManageFunds: true }), []);
  const unpaid = { ...finished, detailState: { finalized: false, costKnown: false, remaining: 100, ownRemaining: 30 } };
  assert.deepEqual(matchPendingTasks(unpaid, { canManage: true }).map(t => t.key), ['attendance', 'debt']);
  assert.deepEqual(matchPendingTasks(unpaid, { canManageFunds: true }).map(t => t.key), ['cost', 'receivable']);
  for (const cancellation of [{ cancelledAt: '2026-10-20' }, { status: 'cancelled' }, { status: 'canceled' }, { status: 'archived' }])
    assert.deepEqual(matchPendingTasks({ ...unpaid, ...cancellation }, manager).map(t => t.key), ['receivable']);
  assert.deepEqual(matchPendingTasks(unpaid).map(t => t.key), ['debt']);
});

test('readiness names unconfirmed self and pending latest requests; RSVP does not count as actual', () => {
  const input = { match: finished, record: {}, roster: [{ id: owner, name: 'Ngọc Nguyễn' }, { id: member, name: 'Thành viên' }], actual: { [member]: { status: 'absent' } }, accountId: owner, events: [] };
  const status = attendanceReadiness(input);
  assert.equal(status.ready, false);
  assert.match(status.blockers.join(' '), /1\/2.*Ngọc Nguyễn/);
  assert.match(status.blockers.join(' '), /Quản trị viên khác/);
  const events = [
    { id: 'old', action: 'late_request', match_id: 'game', subject: member, seq: 1, data: { status: 'pending' } },
    { id: 'new', action: 'late_request', match_id: 'game', subject: member, seq: 2, data: { status: 'pending' } },
    { action: 'review_late', seq: 3, data: { requestId: 'new', status: 'approved' } },
  ];
  const known = { ...input, actual: { ...input.actual, [owner]: { status: 'ontime' } }, events };
  assert.equal(attendanceReadiness(known).ready, true);
  assert.equal(attendanceReadiness({ ...known, events: null }).ready, false);
  assert.equal(attendanceReadiness({ ...known, fines: [{ id: owner, type: 'late' }] }).ready, false);
  assert.equal(attendanceReadiness({ ...known, fines: [{ id: owner, type: 'late' }], events: [...events, { match_id: 'game', subject: owner, action: 'violation', data: { type: 'late' } }] }).ready, true);
});

test('real RPC workflow: finish/zero expense do not clear attendance; other admin confirms self, pending requests gate finalization; repeated finalization creates no extra money', async () => {
  const db = await createMasterDb();
  try {
    for (const name of ['202610190001_match_lifecycle.sql', '202610200001_product_audit.sql'])
      await db.exec(await readFile(new URL('../supabase/migrations/' + name, import.meta.url), 'utf8'));
    const team = 'workflow-regression', id = 'workflow-game';
    const action = (name, payload = {}, key = randomUUID()) => rpc(db, 'no_match_action', [team, id, name, payload, key]);
    await asUser(db, owner);
    await rpc(db, 'no_app_create_team', [team, 'Đội dùng một lần', {}]);
    await db.exec('reset role');
    await db.query("insert into no_gov_members(team_id,user_id,name,role,status) values($1,$2,'Thành viên','member','active'),($1,$3,'Admin','admin','active')", [team, member, outsider]);
    await asUser(db, owner);
    const future = new Date(Date.now() + 864e5).toISOString();
    await rpc(db, 'no_app_commit', [team, (await rpc(db, 'no_app_snapshot', [team])).revision, randomUUID(), { matches: [{ id, status: 'upcoming', title: 'Kiểm thử sau trận', datetime: future, deadline: new Date(Date.parse(future) - 36e5).toISOString() }] }]);
    await asUser(db, member);
    await rpc(db, 'no_gov_mutate', [team, 'late_request', { matchId: id, eta: new Date(Date.parse(future) + 6e5).toISOString(), reason: 'Xin đến muộn kiểm thử' }, randomUUID()]);
    await db.exec('reset role');
    const past = new Date(Date.now() - 72e5).toISOString();
    await db.query("update no_app_workspaces set data=jsonb_set(data,'{matches}',(select jsonb_agg(m||jsonb_build_object('datetime',$2::text,'deadline',$3::text)) from jsonb_array_elements(data->'matches') m)) where team_id=$1", [team, past, new Date(Date.parse(past) - 36e5).toISOString()]);
    await db.query('update no_gov_matches set kickoff=$2,attendance_deadline=$3 where team_id=$1', [team, past, new Date(Date.parse(past) - 36e5).toISOString()]);
    await asUser(db, owner);
    await action('finish', { home: 8, away: 1 });
    await action('actual', { entries: [{ id: member, status: 'absent' }, { id: outsider, status: 'absent' }], reason: 'Đã kiểm tra thực tế' });
    await action('cost', { total: 0, support: 0, confirmed: true, allocations: [] });
    let state = await action('state');
    assert.equal(state.record.finalized_at, null);
    assert.equal(state.finance.zero, true);
    assert.equal(state.actual[owner], undefined);
    await assert.rejects(() => action('actual', { entries: [{ id: owner, status: 'absent' }], reason: 'Tự xác nhận' }), /quản trị viên khác/);
    await assert.rejects(() => action('finalize'), /chưa xác nhận/);
    await asUser(db, outsider);
    await action('actual', { entries: [{ id: owner, status: 'present', arrivedAt: past }], reason: 'Đã xác minh đội trưởng tại sân' });
    await asUser(db, owner);
    await assert.rejects(() => action('finalize'), /yêu cầu xin muộn/);
    const gov = await rpc(db, 'no_gov_snapshot', [team]);
    const request = gov.events.find(e => e.action === 'late_request');
    await rpc(db, 'no_gov_mutate', [team, 'review_late', { requestId: request.id, status: 'approved', reason: 'Đã kiểm tra yêu cầu' }, randomUUID()]);
    const preview = await action('preview_fines');
    assert.equal(preview.record.finalized_at, null);
    const finalized = await action('finalize');
    assert.ok(finalized.record.finalized_at);
    state = await action('finalize');
    assert.equal(state.record.finalized_at, finalized.record.finalized_at);
    assert.equal(state.record.score_home, 8);
    const snapshot = await rpc(db, 'no_app_snapshot', [team]);
    assert.deepEqual(matchPendingTasks(snapshot.data.matches[0], manager), []);
    assert.equal(snapshot.data.funds.transactions.length, 0);
    assert.equal((await rpc(db, 'no_fund_action', [team, 'state', {}, null])).charges.length, 0);
  } finally { await db.close(); }
});

