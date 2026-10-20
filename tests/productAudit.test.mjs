import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {createMasterDb,asUser,rpc,owner,member,outsider} from './helpers/masterDb.mjs';
import {getMonthFundSummary,getMembersMonthStatus,getMemberMonthHistory} from '../src/lib/fundCollections.js';
let db,charges;const team='product-audit';
const fund=(action,payload={},key=randomUUID())=>rpc(db,'no_fund_action',[team,action,payload,key]);
const match=(action,payload={},key=randomUUID())=>rpc(db,'no_match_action',[team,'audit-game',action,payload,key]);
before(async()=>{
 db=await createMasterDb();
 for(const file of ['supabase/migrations/202610190001_match_lifecycle.sql','tests/fixtures/match_action_before_archive.sql'])await db.exec(await readFile(new URL('../'+file,import.meta.url),'utf8'));
 const prior=await db.query("select position('archivedBy' in pg_get_functiondef('no_match_action(text,text,text,jsonb,uuid)'::regprocedure))>0 as archives");assert.equal(prior.rows[0].archives,false);
 await db.exec(await readFile(new URL('../supabase/migrations/202610200001_product_audit.sql',import.meta.url),'utf8'));
 await asUser(db,owner);await rpc(db,'no_app_create_team',[team,'Đội kiểm thử audit',{}]);
 await db.exec('reset role');await db.query("insert into no_gov_members(team_id,user_id,name,role,status) values($1,$2,'Thành viên test','member','active'),($1,$3,'Admin test','admin','active')",[team,member,outsider]);
 await asUser(db,owner);
});
after(async()=>db.close());

test('period wins over due/creation month; match costs never become monthly dues',()=>{
 const collections=[{id:'sep',period:'2026-09',due_date:'2026-10-05',created_at:'2026-10-02'},{id:'oct',period:'2026-10',due_date:'2026-11-05',created_at:'2026-10-02'},{id:'pitch',period:'match:game',due_date:'2026-10-05'}];
 const rows=[['a','sep',100,'fund'],['b','oct',200,'fund'],['c','pitch',1000000,'match']].map(([id,collection_id,amount,kind])=>({id,collection_id,subject:member,amount,kind,paid_amount:0,status:'owed'}));
 const result=getMonthFundSummary('2026-10',collections,rows,[],[{type:'income',amount:50,chargeId:'a',occurredAt:'2026-10-01T02:00Z'},{type:'income',amount:60,occurredAt:'2026-09-30T18:00Z'}]);
 assert.equal(result.totalRequired,200);assert.equal(result.charges.length,1);assert.equal(result.unlinkedIncomeTotal,60,'team timezone and linked payment exclusion');
});

test('multiple obligations aggregate per person; pending is not paid and a paid subcharge does not clear other debt',()=>{
 const collections=[{id:'a',period:'2026-10'},{id:'b',period:'2026-10'}];
 const rows=[{id:'paid',collection_id:'a',subject:member,kind:'fund',amount:100000,paid_amount:100000,status:'paid'},{id:'owed',collection_id:'b',subject:member,kind:'fund',amount:200000,paid_amount:50000,status:'owed'}];
 const pending=[{id:'p',chargeId:'owed',amount:50000}];const summary=getMonthFundSummary('2026-10',collections,rows,pending);
 const person=getMembersMonthStatus('2026-10',[{id:member,name:'Test'}],summary,rows,pending)[0];
 assert.equal(summary.totalCount,1);assert.equal(summary.paidCount,0);assert.equal(summary.partialCount,1);
 assert.equal(person.amount,300000);assert.equal(person.paidAmount,150000);assert.equal(person.remaining,150000);assert.equal(person.status,'pending');assert.equal(person.charges.length,2);assert.equal(summary.totalPending,50000);
});

test('upgrade archives a newly finished match without finalization or money; repeated/colliding actions cannot overwrite',async()=>{
 let snap=await rpc(db,'no_app_snapshot',[team]);const kick=new Date(Date.now()+864e5).toISOString();
 await rpc(db,'no_app_commit',[team,snap.revision,randomUUID(),{matches:[{id:'audit-game',status:'upcoming',title:'Trận kiểm thử',datetime:kick,deadline:new Date(Date.parse(kick)-36e5).toISOString(),endsAt:new Date(Date.parse(kick)+54e5).toISOString(),modelVersion:2,matchType:'internal',expectedPitch:0,expectedOther:0,paymentPlan:'mixed',penaltyEnabled:false}]}]);
 await db.exec('reset role');const past=new Date(Date.now()-72e5).toISOString();
 await db.query("update no_app_workspaces set data=jsonb_set(data,'{matches}',(select jsonb_agg(m||jsonb_build_object('datetime',$2::text,'deadline',$3::text,'endsAt',$4::text)) from jsonb_array_elements(data->'matches') m)) where team_id=$1",[team,past,new Date(Date.parse(past)-36e5).toISOString(),new Date(Date.parse(past)+54e5).toISOString()]);
 await db.query('update no_gov_matches set kickoff=$2,attendance_deadline=$3 where team_id=$1',[team,past,new Date(Date.parse(past)-36e5).toISOString()]);await asUser(db,owner);
 const key=randomUUID(),payload={home:2,away:1,note:'Kết quả xác nhận'};const result=await match('finish',payload,key);
 assert.ok(result.match.archivedAt);assert.equal(result.record.finalized_at,null);assert.equal(result.finance,null);
 assert.equal((await match('finish',payload,key)).match.archivedAt,result.match.archivedAt);
 assert.equal((await match('finish',{home:9,away:9})).record.score_home,2,'a fresh finish request cannot replace an already-finished result');
 await assert.rejects(()=>match('finish',{home:9,away:9},key),/Mã thao tác/);
 await match('cost',{total:0,support:0,confirmed:true,allocations:[]});
 await match('actual',{entries:[{id:member,status:'present',arrivedAt:past}],reason:'Đã kiểm tra tại sân'});
 const state=await match('state');assert.equal(state.actual[member].status,'ontime');assert.equal(state.record.finalized_at,null);
 assert.equal((await rpc(db,'no_app_snapshot',[team])).data.funds.transactions.length,0);
});

test('targeted reminder saves one notice, checks team/recipient/rights, and never changes money',async()=>{
 for(const amount of [10000,20000])await fund('schedule_save',{title:'Quỹ kiểm thử '+amount,amount,recipients:[member],repeat:'once',day:20,sendAt:new Date().toISOString(),dueDate:new Date(Date.now()+864e5).toISOString().slice(0,10)});
 const state=await fund('state');charges=state.charges.filter(c=>c.kind==='fund');const payload={subject:member,chargeIds:charges.map(c=>c.id)},key=randomUUID();
 await asUser(db,member);await assert.rejects(()=>fund('remind_member',payload),/quyền/);
 await asUser(db,owner);await assert.rejects(()=>fund('remind_member',{...payload,subject:owner}),/không thuộc/);
 await fund('remind_member',payload,key);await fund('remind_member',payload,key);await fund('remind_member',payload);
 await asUser(db,member);const snap=await rpc(db,'no_app_snapshot',[team]);const notices=snap.data.notices.filter(n=>n.title==='Nhắc đóng quỹ');
 assert.equal(notices.length,1);assert.match(notices[0].content,/30000/);assert.equal(notices[0].audience,member);assert.equal(snap.data.funds.transactions.length,0);
 await asUser(db,owner);await assert.rejects(()=>fund('remind_member',{subject:member,chargeIds:[randomUUID()]}),/không thuộc/);
 await asUser(db,outsider);await rpc(db,'no_app_create_team',['audit-other','Đội khác',{}]);await assert.rejects(()=>rpc(db,'no_fund_action',['audit-other','remind_member',payload,randomUUID()]),/tài khoản|không thuộc/);
 await asUser(db,owner);
});

test('pending, partial approval, duplicate approval and revocation still use the same ledger after upgrade',async()=>{
 await asUser(db,member);await fund('payment_request',{chargeId:charges[0].id,amount:1000});await asUser(db,owner);
 let state=await fund('state');const pending=state.pendingRequests[0];assert.equal((await rpc(db,'no_app_snapshot',[team])).data.funds.transactions.length,0);
 await fund('payment_approve',{requestId:pending.id});await fund('payment_approve',{requestId:pending.id});
 state=await fund('state');assert.equal(state.charges.find(c=>c.id===charges[0].id).paid_amount,1000);assert.equal((await rpc(db,'no_app_snapshot',[team])).data.funds.transactions.length,1);
 await fund('permission',{userId:member,canManageFunds:true,receiveAttendance:false});await asUser(db,member);assert.equal((await fund('state')).canManage,true);
 await asUser(db,owner);await fund('permission',{userId:member,canManageFunds:false,receiveAttendance:false});await asUser(db,member);await assert.rejects(()=>fund('remind_member',{subject:member,chargeIds:[charges[0].id]}),/quyền/);
 await assert.rejects(()=>fund('permission',{userId:member,canManageFunds:true,receiveAttendance:false}),/quyền/);
});


test('one-time named period stays consistent between summary and member history',()=>{
 const cols=[{id:'named',period:'once',title:'Quỹ tháng 9/2026',due_date:'2026-10-20'}];
 const rows=[{id:'named-charge',collection_id:'named',subject:member,kind:'fund',amount:100,paid_amount:0}];
 assert.equal(getMonthFundSummary('2026-09',cols,rows).totalRequired,100);
 assert.equal(getMonthFundSummary('2026-10',cols,rows).hasCollection,false);
 assert.equal(getMemberMonthHistory(member,cols,rows)[0].period,'2026-09');
});
