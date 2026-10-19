import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {createMasterDb,asUser,rpc,owner,member,outsider} from './helpers/masterDb.mjs';
import {normalizeMatchDraft,lifecycle,actualCounts,matchDraft} from '../src/lib/matchLifecycle.js';
let db,match,key;const team='match-life';
const action=(name,payload={},id='game',key=randomUUID())=>rpc(db,'no_match_action',[team,id,name,payload,key]);
before(async()=>{
 db=await createMasterDb();await db.exec(await readFile(new URL('../supabase/migrations/202610190001_match_lifecycle.sql',import.meta.url),'utf8'));
 await asUser(db,owner);await rpc(db,'no_app_create_team',[team,'Đội kiểm thử',{}]);
 await db.exec('reset role');await db.query("insert into no_gov_members(team_id,user_id,name,role,status) values($1,$2,'Thành viên','member','active'),($1,$3,'Quản trị','admin','active')",[team,member,outsider]);
 await asUser(db,owner);
});
after(async()=>db.close());
test('native date/time normalization supports internal/TBD and midnight without fake estimates or results',()=>{
 const n=normalizeMatchDraft({matchType:'internal',opponent:'',venue:'',datetime:'2026-10-25T23:30',timeoutDatetime:'2026-10-25T21:00',durationMinutes:120});
 assert.equal(n.endsAt,'2026-10-25T18:30:00.000Z');assert.equal(n.datetime,'2026-10-25T16:30:00.000Z');assert.equal(n.venue,'');assert.equal(n.opponent,'');
 assert.throws(()=>normalizeMatchDraft({datetime:'2026-10-25T19:00',timeoutDatetime:'2026-10-25T19:00'}),/Hạn/);
 assert.throws(()=>normalizeMatchDraft({datetime:'2026-10-25T19:00',timeoutDatetime:'2026-10-25T17:00',endDatetime:'2026-10-25T18:00'}),/kết thúc/);
 const m={datetime:n.datetime,endsAt:n.endsAt,status:'upcoming'};
 assert.equal(lifecycle(m,Date.parse(n.datetime)-1).key,'upcoming');assert.equal(lifecycle(m,Date.parse(n.datetime)+1).key,'live');assert.equal(lifecycle(m,Date.parse(n.endsAt)+1).key,'awaiting');assert.equal(lifecycle({...m,status:'completed'},0).key,'completed');
 assert.equal(lifecycle({datetime:'2020-01-01',status:'upcoming'},Date.now()).key,'unknown');
 assert.equal(matchDraft({id:'old',datetime:n.datetime,status:'completed',scoreHome:5,endsAt:n.endsAt},{},true).datetime,'');
 assert.deepEqual(actualCounts([{id:'a'},{id:'b'},{id:'c'}],{a:{status:'late'},b:{status:'ontime'}}),{ontime:1,late:1,absent:0,unknown:1});
});
test('real commit accepts unconfirmed opponent/venue; enforces date order and retry does not duplicate match/notices',async()=>{
 const kickoff=new Date(Date.now()+864e5).toISOString(),deadline=new Date(Date.now()+82e6).toISOString();
 match={id:'game',status:'upcoming',title:'Trận nội bộ',matchType:'internal',opponent:'',venue:'',datetime:kickoff,deadline,endsAt:new Date(Date.parse(kickoff)+54e5).toISOString(),modelVersion:2,expectedPitch:1200000,expectedOther:0,paymentPlan:'mixed',penaltyEnabled:false};
 const state=await rpc(db,'no_app_snapshot',[team]);key=randomUUID();await rpc(db,'no_app_commit',[team,state.revision,key,{matches:[match]}]);await rpc(db,'no_app_commit',[team,state.revision,key,{matches:[match]}]);
 const updated=await rpc(db,'no_app_snapshot',[team]);assert.equal(updated.data.matches.length,1);assert.equal(updated.data.notices.length,1);assert.equal((await rpc(db,'no_fund_action',[team,'state',{},null])).charges.length,0);assert.equal(updated.data.funds.transactions.length,0);
 await assert.rejects(()=>rpc(db,'no_app_commit',[team,updated.revision,randomUUID(),{matches:[{...updated.data.matches[0],endsAt:deadline}]}]),/Ngày giờ/);
 await asUser(db,member);await assert.rejects(()=>rpc(db,'no_app_commit',[team,updated.revision,randomUUID(),{matches:[{...match,title:'Không có quyền'}]}]),/ban quản trị/);await asUser(db,owner);
});
test('member/cross-team access cannot manage or read private tables',async()=>{
 await asUser(db,member);assert.equal((await action('state')).canManage,false);await assert.rejects(()=>action('finish',{}),/quyền/);
 await assert.rejects(()=>db.query('select * from no_match_records'),/permission denied/);
 await asUser(db,outsider);await rpc(db,'no_app_create_team',['other-match-team','Đội khác',{}]);await assert.rejects(()=>rpc(db,'no_match_action',['other-match-team','game','state',{},null]),/Không tìm/);
 await asUser(db,owner);await assert.rejects(()=>action('finish',{home:1,away:0}),/Chưa đến/);
});
test('finish and unknown result stay independent from actual attendance, fines and ledger',async()=>{
 await db.exec('reset role');const kick=new Date(Date.now()-7200000).toISOString();
 await db.query("update no_app_workspaces set data=jsonb_set(data,'{matches}',(select jsonb_agg(x||jsonb_build_object('datetime',$2::text,'deadline',$3::text,'endsAt',$4::text)) from jsonb_array_elements(data->'matches') x)) where team_id=$1",[team,kick,new Date(Date.parse(kick)-3600000).toISOString(),new Date(Date.parse(kick)+3600000).toISOString()]);
 await db.query('update no_gov_matches set kickoff=$2,attendance_deadline=$3 where team_id=$1',[team,kick,new Date(Date.parse(kick)-3600000).toISOString()]);
 await db.query("insert into no_gov_rules(team_id,version,content,effective_at,actor) values($1,99,'Nội quy đã có trước giờ đá',$2,$3)",[team,new Date(Date.now()-864e5).toISOString(),owner]);
 await db.query("insert into no_pro_settings(team_id,policy) values($1,'{\"late\":true,\"absence\":true}') on conflict(team_id) do update set policy=excluded.policy",[team]);
 await asUser(db,owner);await assert.rejects(()=>action('finish',{home:1.5,away:0}),/nguyên/);
 const requestKey=randomUUID();const state=await action('finish',{home:null,away:null,note:'Chưa nhập tỷ số'},'game',requestKey);await action('finish',{home:null,away:null},'game',requestKey);
 assert.equal(state.match.status,'completed');assert.equal(state.record.score_home,null);assert.equal(state.record.finalized_at,null);assert.equal(Object.keys(state.actual).length,0);
 assert.equal((await rpc(db,'no_fund_action',[team,'state',{},null])).charges.length,0);assert.equal((await rpc(db,'no_app_snapshot',[team])).data.funds.transactions.length,0);
 await assert.rejects(()=>action('finalize'),/chưa xác nhận/);await assert.rejects(()=>action('actual',{entries:[{id:owner,status:'absent'}],reason:'Tự xác nhận'}),/quản trị viên khác/);
});
test('confirmed actual groups never use RSVP or ETA; preview/chốt is explicit, immutable and idempotent',async()=>{
 let state=await action('state');const kick=state.match.datetime;
 state=await action('actual',{entries:[{id:member,status:'present',arrivedAt:new Date(Date.parse(kick)+12*60000).toISOString()}],reason:'Đã kiểm tra tại sân'});
 assert.equal(state.actual[member].status,'late');assert.equal(state.record.finalized_at,null);
 const preview=await action('preview_fines');assert.equal(preview.fines.find(p=>p.id===member).fine,50000);
 await asUser(db,outsider);await action('actual',{entries:[{id:owner,status:'present',arrivedAt:kick}],reason:'Xác nhận đội trưởng đã đến'});
 await asUser(db,owner);await action('actual',{entries:[{id:outsider,status:'absent'}],reason:'Xác nhận không có mặt'});
 const finalized=await action('finalize');assert.ok(finalized.record.finalized_at);assert.equal(finalized.record.finalized_by,owner);
 const again=await action('finalize');assert.equal(again.record.finalized_at,finalized.record.finalized_at);
 const fund=await rpc(db,'no_fund_action',[team,'state',{},null]);assert.equal(fund.charges.length,1);assert.equal(fund.charges[0].amount,30000,'existing automatic team policy amount is preserved');
 assert.equal((await rpc(db,'no_gov_snapshot',[team])).events.find(e=>e.action==='violation'&&e.subject===member).data.fine,50000,'disciplinary match rule is preserved separately');
 await assert.rejects(()=>action('actual',{entries:[{id:member,status:'absent'}],reason:'Không được sửa thường'}),/đã chốt/);
 await assert.rejects(()=>rpc(db,'no_gov_mutate',[team,'arrival',{matchId:'game',subject:member,arrivedAt:kick,reason:'Sửa không hợp lệ'},randomUUID()]),/đã chốt/);
});
test('linked cost uses the shared ledger, exact split, approved money only and cannot be created twice',async()=>{
 const state=await action('cost',{total:1200000,support:200000,payerKind:'fund',confirmed:true,allocations:[{id:member,amount:1000000}],occurredAt:new Date().toISOString()});
 assert.ok(state.record.collection_id);assert.equal(state.finance.required,1000000);assert.equal(state.finance.paid,0);
 let fund=await rpc(db,'no_fund_action',[team,'state',{},null]);const charge=fund.charges.find(c=>c.kind==='match');assert.equal(charge.collection_id,state.record.collection_id);
 assert.equal(fund.bills.filter(b=>b.details.purpose==='match').length,1);
 await assert.rejects(()=>action('cost',{total:1200000,support:200000}),/đã xác nhận/);
 await asUser(db,member);await rpc(db,'no_fund_action',[team,'payment_request',{chargeId:charge.id,amount:800000,note:'Chờ đối soát'},randomUUID()]);assert.equal((await action('state')).finance.paid,0);
 await asUser(db,owner);fund=await rpc(db,'no_fund_action',[team,'state',{},null]);const pending=fund.pendingRequests.find(p=>p.chargeId===charge.id);
 await rpc(db,'no_fund_action',[team,'payment_approve',{requestId:pending.id},randomUUID()]);
 const after=await action('state');assert.equal(after.finance.paid,800000);assert.equal(after.finance.required-after.finance.paid,200000);
 const workspace=await rpc(db,'no_app_snapshot',[team]);assert.equal(workspace.data.funds.transactions.filter(t=>t.type==='expense').length,1);assert.equal(workspace.data.funds.transactions.filter(t=>t.type==='income').length,1);
});
test('cancel keeps match/history and stops registration; completed history cannot be rescheduled',async()=>{
 let snap=await rpc(db,'no_app_snapshot',[team]);const old=snap.data.matches[0];await assert.rejects(()=>rpc(db,'no_app_commit',[team,snap.revision,randomUUID(),{matches:[{...old,datetime:new Date(Date.now()+864e5).toISOString(),endsAt:new Date(Date.now()+9e7).toISOString()}]}]),/không được đổi giờ|finalized history|đã chốt/);
 const future={...match,id:'cancelled',datetime:new Date(Date.now()+864e5).toISOString(),deadline:new Date(Date.now()+8e7).toISOString(),endsAt:new Date(Date.now()+9e7).toISOString()};
 await rpc(db,'no_app_commit',[team,snap.revision,randomUUID(),{matches:[old,future]}]);const cancelled=await action('cancel',{reason:'Sân đóng cửa'},'cancelled');assert.ok(cancelled.match.cancelledAt);assert.equal(cancelled.history[0].action,'cancel');
 await asUser(db,member);await assert.rejects(()=>rpc(db,'no_gov_mutate',[team,'attendance',{matchId:'cancelled',status:'attending'},randomUUID()]),/archived/);
 assert.equal((await action('state',{},'cancelled')).match.id,'cancelled');
});

test('result corrections require a reason, preserve finalization and cannot bypass the audited endpoint',async()=>{
 await asUser(db,owner);
 await assert.rejects(()=>action('result',{home:3,away:2}),/lý do/);
 let state=await action('state');const endedAt=state.record.ended_at,finalizedAt=state.record.finalized_at;
 state=await action('result',{home:3,away:2,note:'Đối soát kết quả',reason:'Xác nhận với hai đội'});
 assert.equal(state.record.score_home,3);assert.equal(state.record.score_away,2);assert.equal(state.record.ended_at,endedAt);assert.equal(state.record.finalized_at,finalizedAt);
 let snap=await rpc(db,'no_app_snapshot',[team]);assert.equal(snap.data.matches.find(m=>m.id==='game').detailState.finalized,true);
 const changed=snap.data.matches.map(m=>m.id==='game'?{...m,scoreHome:4}:m);
 await assert.rejects(()=>rpc(db,'no_app_commit',[team,snap.revision,randomUUID(),{matches:changed}]),/quy trình/);
 const removed=snap.data.matches.map(m=>{const n={...m};if(m.id==='game')delete n.scoreHome;return n;});
 await assert.rejects(()=>rpc(db,'no_app_commit',[team,snap.revision,randomUUID(),{matches:removed}]),/quy trình/);
 await rpc(db,'no_app_commit',[team,snap.revision,randomUUID(),{matches:snap.data.matches}]);
 await db.exec('reset role');const raw=await db.query("select data->'matches' as matches from no_app_workspaces where team_id=$1",[team]);assert.equal(raw.rows[0].matches.some(m=>m.detailState),false);
 await asUser(db,member);await assert.rejects(()=>action('result',{home:4,away:2,reason:'Không có quyền'}),/quyền/);
});

test('linked third-half bills reject missing/cross-team/cancelled matches and personal advance does not debit fund',async()=>{
 await asUser(db,owner);const payload={title:'Giao lưu kiểm thử',total:100001,support:0,payerKind:'member',payerId:owner,allocations:[{id:owner,amount:50001},{id:member,amount:50000}],occurredAt:new Date().toISOString(),matchId:'missing'};
 await assert.rejects(()=>rpc(db,'no_fund_action',[team,'bill',payload,randomUUID()]),/Không tìm/);
 await assert.rejects(()=>rpc(db,'no_fund_action',[team,'bill',{...payload,matchId:'cancelled'},randomUUID()]),/đã hủy/);
 const before=await rpc(db,'no_app_snapshot',[team]);
 const billId=randomUUID();await rpc(db,'no_fund_action',[team,'bill',{...payload,matchId:'game'},billId]);
 const after=await rpc(db,'no_app_snapshot',[team]);assert.deepEqual(after.data.funds.transactions,before.data.funds.transactions);
 const fund=await rpc(db,'no_fund_action',[team,'state',{},null]);assert.equal(fund.bills.find(b=>b.id===billId).details.matchId,'game');assert.equal(fund.charges.filter(c=>c.bill_id===billId).reduce((n,c)=>n+Number(c.amount),0),100001);
});
