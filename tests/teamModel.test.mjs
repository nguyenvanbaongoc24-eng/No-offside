import test from 'node:test';
import assert from 'node:assert/strict';
import { approvePayment, fundBalance, upsertReport, reportTotals, rosterFor, qrUrl, promoteMember, transferOwner, deleteTeamMatch, restoreTeamMatch } from '../src/lib/teamModel.js';

test('archiving a match selects another match and preserves attendance, reports and funds', () => {
  const data = { matches: [{id:'a'}, {id:'b'}], activeMatchId:'a', attendance:{a:{u:'attending'},b:{u:'absent'}}, reports:{u:{a:{goals:2,assists:1},b:{goals:1,assists:0}}}, funds:{transactions:[{id:'payment'}]} };
  const deleted = deleteTeamMatch(data, 'a');
  assert.equal(deleted.activeMatchId, 'b');
  assert.equal(deleted.attendance,data.attendance);
  assert.ok(deleted.matches.find(m=>m.id==='a').archivedAt);
  assert.equal(deleted.reports,data.reports);
  assert.equal(deleted.funds, data.funds);
  assert.equal(data.matches.length, 2);
  assert.equal(deleteTeamMatch(deleted, 'missing'), deleted);
  const empty = deleteTeamMatch(deleted, 'b');
  assert.equal(empty.matches.filter(m=>!m.archivedAt).length, 0);
  assert.equal(empty.activeMatchId, undefined);
});

test('undo restores match data while preserving unrelated changes and cannot duplicate a match', () => {
  const data = { matches:[{id:'b',title:'Edited'}], activeMatchId:'b', attendance:{b:{u:'absent'}}, reports:{u:{b:{goals:1,assists:0}}}, funds:{transactions:[{id:'new-payment'}]} };
  const snapshot = {match:{id:'a'},index:0,attendance:{u:'attending'},reports:{u:{goals:2,assists:1}}};
  const restored = restoreTeamMatch(data, snapshot);
  assert.deepEqual(restored.matches, [{id:'a'},{id:'b',title:'Edited'}]);
  assert.deepEqual(restored.attendance.a, snapshot.attendance);
  assert.deepEqual(restored.reports.u.a, snapshot.reports.u);
  assert.equal(restored.funds, data.funds);
  assert.deepEqual(reportTotals({matches:0,goals:0,assists:0}, restored.reports.u), {matches:2,goals:3,assists:1});
  assert.equal(restoreTeamMatch(restored, snapshot), restored);
});

test('approval is idempotent and clears only the correct debt', () => {
  const funds = {transactions:[],pendingApprovals:[{id:'p',playerId:'u',month:'2026-10',name:'Player',amount:150000}],debtors:[{playerId:'u',month:'2026-10'},{playerId:'u',month:'2026-11'}]};
  const approved=approvePayment(funds,'p','Captain');
  assert.equal(fundBalance(approved.transactions),150000);
  assert.equal(approved.debtors.length,1);
  assert.equal(approved.debtors[0].month,'2026-11');
  assert.deepEqual(approvePayment(approved,'p','Captain'),approved);
});
test('saving the same match replaces its report instead of double counting',()=>{
  const base={matches:5,goals:12,assists:4};
  const first=upsertReport({},'match',2,1);
  const second=upsertReport(first,'match',3,0);
  assert.deepEqual(reportTotals(base,second),{matches:6,goals:15,assists:4});
});
test('attendance groups and counts are derived from the same roster',()=>{
  const groups=rosterFor([{id:'a',name:'A'},{id:'b',name:'B'}],{a:'absent'},{id:'a',name:'Me'});
  assert.equal(groups.absent.length,1);assert.equal(groups.unvoted.length,1);assert.equal(groups.attending.length,0);
});
test('promoting and transferring ownership updates every role list',()=>{
  const settings={members:[{id:'a',roleType:'owner'},{id:'b',roleType:'member'}],subAdmins:[]};
  const promoted=promoteMember(settings,'b','Treasurer');
  const transferred=transferOwner(promoted,'a','b');
  assert.equal(transferred.members.find(m=>m.id==='b').roleType,'owner');
  assert.equal(transferred.members.find(m=>m.id==='a').roleType,'member');
  assert.equal(transferred.subAdmins.length,0);
  assert.equal(transferred.ownerId,'b');
});
test('QR reflects the bank, account and memo and rejects invalid accounts',()=>{
  const url=qrUrl({bankCode:'970436',accountNumber:'123456789',accountHolder:'TEST'},250000,'SO 9');
  assert.ok(url.includes('970436-123456789'));
  assert.equal(new URL(url).searchParams.get('amount'),'250000');
  assert.equal(new URL(url).searchParams.get('addInfo'),'SO 9');
  assert.equal(qrUrl({bankCode:'970436',accountNumber:'abc'}),'');
});
