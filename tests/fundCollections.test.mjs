import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {createMasterDb,asUser,rpc,owner,member,outsider} from './helpers/masterDb.mjs';
let db,schedule,collection,charge;
const call=(action,payload={},key=randomUUID(),team='collections-a')=>rpc(db,'no_fund_action',[team,action,payload,key]);
const ledger=async()=>{const r=await db.query("select data->'funds'->'transactions' as tx from no_app_workspaces where team_id='collections-a'");return r.rows[0].tx;};
const balance=xs=>xs.reduce((n,x)=>n+(x.type==='income'?1:-1)*x.amount,0);
before(async()=>{
 db=await createMasterDb();
 await asUser(db,owner);await rpc(db,'no_app_create_team',['collections-a','Đội A',{}]);
 await asUser(db,outsider);await rpc(db,'no_app_create_team',['collections-b','Đội B',{}]);
 await db.exec('reset role');await db.query("insert into no_gov_members(team_id,user_id,name,role,status,jersey_number) values('collections-a',$1,'Nguyễn Văn An','member','active',10)",[member]);
});
after(async()=>db.close());
test('monthly schedule clamps 31, snapshots members, retries once per period and never creates income',async()=>{
 await asUser(db,owner);schedule=randomUUID();await call('schedule_save',{id:schedule,title:'Quỹ tháng',amount:100000,recipients:'all',repeat:'monthly',day:31,sendAt:'2027-01-31T02:00:00Z',dueDate:'2027-01-31'});
 await db.exec('reset role');await rpc(db,'no_fund_tick',['2027-01-31T02:00:00Z']);await rpc(db,'no_fund_tick',['2027-01-31T02:00:00Z']);
 assert.equal((await db.query('select count(*)::int n from no_fund_collections')).rows[0].n,1);
 const next=(await db.query('select next_run from no_fund_schedules')).rows[0].next_run;assert.match(new Date(next).toISOString(),/2027-02-28/);
 collection=(await db.query('select id from no_fund_collections')).rows[0].id;
 charge=(await db.query('select id from no_pro_charges where collection_id=$1 and subject=$2',[collection,member])).rows[0].id;
 assert.equal((await ledger()).length,0);
 await db.query("insert into no_gov_members(team_id,user_id,name,role,status) values('collections-a',$1,'Người mới','member','active')",[outsider]);
 assert.equal((await db.query('select count(*)::int n from no_pro_charges where collection_id=$1',[collection])).rows[0].n,2);
 await rpc(db,'no_fund_tick',['2027-02-28T02:00:00Z']);await rpc(db,'no_fund_tick',['2027-02-28T02:00:00Z']);
 assert.equal((await db.query('select count(*)::int n from no_fund_collections')).rows[0].n,2);
 assert.equal((await db.query('select count(*)::int n from no_pro_charges')).rows[0].n,5);
});
test('member report stays pending; confirmed partial receipt is atomic and retry safe',async()=>{
 await asUser(db,member);await call('payment_request',{chargeId:charge,amount:50000});await call('payment_request',{chargeId:charge,amount:50000});
 await db.exec('reset role');assert.equal((await ledger()).length,0);
 const req=(await db.query("select data->'funds'->'pendingApprovals' as p from no_app_workspaces where team_id='collections-a'")).rows[0].p;
 assert.equal(req.length,1);await asUser(db,owner);const key=randomUUID();await call('payment_approve',{requestId:req[0].id},key);await call('payment_approve',{requestId:req[0].id},key);await call('payment_approve',{requestId:req[0].id});
 await db.exec('reset role');assert.equal((await ledger()).length,1);assert.equal(balance(await ledger()),50000);
 assert.equal(Number((await db.query('select paid_amount from no_pro_charges where id=$1',[charge])).rows[0].paid_amount),50000);
 await asUser(db,owner);await assert.rejects(()=>call('payment',{chargeId:charge,amount:50001}),/vượt/);
});
test('edits and void preserve audit, update debt, and cannot be bypassed through generic commit or Pro',async()=>{
 await db.exec('reset role');const tx=(await ledger())[0];await asUser(db,owner);
 await call('transaction_save',{id:tx.id,title:'Sửa khoản đã nhận',amount:30000,type:'income',occurredAt:new Date().toISOString(),reason:'Đối soát lại số tiền'});
 let state=await rpc(db,'no_app_snapshot',['collections-a']);await assert.rejects(()=>rpc(db,'no_app_commit',['collections-a',state.revision,randomUUID(),{funds:{...state.data.funds,transactions:[]}}]),/liên kết/);
 await assert.rejects(()=>rpc(db,'no_pro_action',['collections-a','charge-paid',{chargeId:charge,reason:'Bypass'},randomUUID()]),/Quỹ đội/);
 await call('transaction_void',{id:tx.id,reason:'Chưa nhận tiền thực tế'});
 await db.exec('reset role');assert.equal(balance(await ledger()),0);assert.equal((await ledger())[0].originalAmount,30000);
 assert.equal(Number((await db.query('select paid_amount from no_pro_charges where id=$1',[charge])).rows[0].paid_amount),0);
 assert.equal((await db.query("select count(*)::int n from no_fund_events where action in ('transaction_save','transaction_void')")).rows[0].n,2);
});
test('treasurer permission is team scoped, does not promote admin, and revocation affects API immediately',async()=>{
 await asUser(db,owner);await call('permission',{userId:member,canManageFunds:true,receiveAttendance:true});
 await asUser(db,member);assert.equal((await call('state')).canManage,true);assert.equal((await rpc(db,'no_app_snapshot',['collections-a'])).role,'member');
 await assert.rejects(()=>call('state',{},randomUUID(),'collections-b'),/quyền/);
 await assert.rejects(()=>call('permission',{userId:owner,canManageFunds:true,receiveAttendance:true}),/chủ đội/);
 await asUser(db,owner);await call('permission',{userId:member,canManageFunds:false,receiveAttendance:true});await asUser(db,member);
 await assert.rejects(()=>call('transaction_save',{title:'Thu',amount:100,type:'income',occurredAt:new Date().toISOString()}),/quản lý quỹ/);
});
test('both bill funding paths preserve every dong, partial collections and support cannot double count',async()=>{
 await asUser(db,owner);const allocations=[{id:owner,amount:45000},{id:member,amount:45000}],personal=randomUUID();
 await call('bill',{title:'Buổi giao lưu',total:100001,support:10001,payerKind:'member',payerId:owner,allocations,occurredAt:new Date().toISOString()},personal);
 await db.exec('reset role');assert.equal(balance(await ledger()),0);
 const c=(await db.query('select id from no_pro_charges where bill_id=$1 and subject=$2',[personal,member])).rows[0].id;
 await asUser(db,owner);await call('payment',{chargeId:c,amount:45000});await call('bill_support',{id:personal});await assert.rejects(()=>call('bill_support',{id:personal}),/chờ chi/);
 await db.exec('reset role');assert.equal(balance(await ledger()),-10001);
 const fund=randomUUID();await asUser(db,owner);await call('bill',{title:'Quỹ đã trả hóa đơn',total:100001,support:10001,payerKind:'fund',allocations,confirmed:true,occurredAt:new Date().toISOString()},fund);
 await db.exec('reset role');assert.equal(balance(await ledger()),-110002);
 const fc=(await db.query('select id from no_pro_charges where bill_id=$1 and subject=$2',[fund,member])).rows[0].id;
 await asUser(db,owner);await call('payment',{chargeId:fc,amount:20000});await db.exec('reset role');assert.equal(balance(await ledger()),-90002);
});
test('server schedules on days 5 and 6 create one collection each month, and pause stops future issuance',async()=>{
 await asUser(db,outsider);const ids=[randomUUID(),randomUUID()];
 for(let i=0;i<2;i++)await call('schedule_save',{id:ids[i],title:'Thu ngày '+(5+i),amount:100000,recipients:'all',repeat:'monthly',day:5+i,sendAt:'2028-01-0'+(5+i)+'T02:00:00Z',dueDate:'2028-01-0'+(6+i)},randomUUID(),'collections-b');
 await db.exec('reset role');
 const count=async()=>Number((await db.query("select count(*) n from no_fund_collections where team_id='collections-b'")).rows[0].n);
 await rpc(db,'no_fund_tick',['2028-01-05T02:00:00Z']);await rpc(db,'no_fund_tick',['2028-01-05T02:00:00Z']);assert.equal(await count(),1);
 await rpc(db,'no_fund_tick',['2028-01-06T02:00:00Z']);await rpc(db,'no_fund_tick',['2028-01-06T02:00:00Z']);assert.equal(await count(),2);
 await rpc(db,'no_fund_tick',['2028-02-06T02:00:00Z']);await rpc(db,'no_fund_tick',['2028-02-06T02:00:00Z']);assert.equal(await count(),4);
 await asUser(db,outsider);await call('schedule_status',{id:ids[0],status:'paused'},randomUUID(),'collections-b');await call('schedule_status',{id:ids[1],status:'cancelled'},randomUUID(),'collections-b');
 await db.exec('reset role');await rpc(db,'no_fund_tick',['2028-03-06T02:00:00Z']);assert.equal(await count(),4);
 const state=(await db.query("select data->'funds'->'transactions' tx from no_app_workspaces where team_id='collections-b'")).rows[0];assert.equal(balance(state.tx),0);
});
test('removed or currently locked members cannot fetch even their own fund state',async()=>{
 for(const status of ['removed','locked']){
  await db.exec('reset role');await db.query("update no_gov_members set status=$1,locked_until=clock_timestamp()+interval '1 day' where team_id='collections-a' and user_id=$2",[status,member]);
  await asUser(db,member);await assert.rejects(()=>call('state'),/quyền truy cập/);
 }
 await db.exec('reset role');await db.query("update no_gov_members set status='active',locked_until=null where team_id='collections-a' and user_id=$1",[member]);
});
