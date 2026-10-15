import test,{before,after} from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {createMasterDb,asUser,rpc,owner,member,outsider} from './helpers/masterDb.mjs';
let db,period;
before(async()=>{db=await createMasterDb();await asUser(db,owner);await rpc(db,'no_app_create_team',['fund-a','FC Fund',{}]);await db.exec('reset role');await db.query("insert into no_gov_members(team_id,user_id,name,role,status,jersey_number) values('fund-a',$1,'Member','member','active',19)",[member]);period=(await db.query("select to_char(clock_timestamp() at time zone 'Asia/Ho_Chi_Minh','YYYY-MM') as value")).rows[0].value;await asUser(db,owner);await rpc(db,'no_app_commit',['fund-a',0,randomUUID(),{funds:{transactions:[],pendingApprovals:[],debtors:[{id:'debt1',playerId:member,name:'Member',month:period,amount:150000,phone:'private-test-contact'},{id:'debt2',playerId:owner,name:'Owner',month:period,amount:200000}]}}]);});
after(async()=>db.close());
test('request computes amount and period at server, persists once, and member sees only own ledger',async()=>{
 await asUser(db,member);const key=randomUUID();const first=await rpc(db,'no_app_payment',['fund-a','request','','',key]);const again=await rpc(db,'no_app_payment',['fund-a','request','','',randomUUID()]);
 assert.equal(first.data.funds.pendingApprovals.length,1);assert.equal(again.data.funds.pendingApprovals.length,1);assert.equal(first.data.funds.pendingApprovals[0].amount,150000);assert.equal(first.data.funds.pendingApprovals[0].month,period);
 assert.equal(first.data.funds.debtors.length,1);assert.equal(first.data.funds.debtors[0].phone,undefined);assert.equal(first.data.notices.length,0);
 await assert.rejects(()=>rpc(db,'no_app_payment',['fund-a','approve',first.data.funds.pendingApprovals[0].id,'',randomUUID()]),/ban quản trị/);
});
test('manual approval retries cannot duplicate income, clear unrelated debt, or mark another user notifications read',async()=>{
 await asUser(db,owner);let state=await rpc(db,'no_app_snapshot',['fund-a']);const payment=state.data.funds.pendingApprovals[0];assert.equal(state.data.notices.filter(n=>n.unread).length,1);
 await rpc(db,'no_app_read_notices',['fund-a',state.data.notices.map(n=>n.id)]);state=await rpc(db,'no_app_snapshot',['fund-a']);assert.equal(state.data.notices.filter(n=>n.unread).length,0);
 const attempts=await Promise.all([rpc(db,'no_app_payment',['fund-a','approve',payment.id,'Đã đối soát thủ công',randomUUID()]),rpc(db,'no_app_payment',['fund-a','approve',payment.id,'Retry',randomUUID()])]);
 assert.equal(attempts[1].data.funds.transactions.length,1);assert.equal(attempts[1].data.funds.transactions[0].amount,150000);assert.equal(attempts[1].data.funds.debtors.length,1);assert.equal(attempts[1].data.funds.debtors[0].playerId,owner);
 await asUser(db,member);state=await rpc(db,'no_app_snapshot',['fund-a']);assert.equal(state.data.notices.filter(n=>n.unread).length,1);assert.equal(state.data.notices[0].route,'fund');assert.equal(state.data.funds.transactions.length,1);
 await rpc(db,'no_app_read_notices',['fund-a',state.data.notices.map(n=>n.id)]);assert.equal((await rpc(db,'no_app_snapshot',['fund-a'])).data.notices.filter(n=>n.unread).length,0);
});
test('rejection requires a reason, retains immutable evidence and allows a new request',async()=>{
 await asUser(db,owner);let state=await rpc(db,'no_app_snapshot',['fund-a']);await rpc(db,'no_app_commit',['fund-a',state.revision,randomUUID(),{funds:{...state.data.funds,debtors:[...state.data.funds.debtors,{id:'debt3',playerId:member,month:period,name:'Member',amount:30000}]}}]);
 await asUser(db,member);state=await rpc(db,'no_app_payment',['fund-a','request','','',randomUUID()]);const id=state.data.funds.pendingApprovals[0].id;
 await asUser(db,owner);await assert.rejects(()=>rpc(db,'no_app_payment',['fund-a','reject',id,'',randomUUID()]),/lý do/);await rpc(db,'no_app_payment',['fund-a','reject',id,'Chưa tìm thấy giao dịch đối soát',randomUUID()]);
 await asUser(db,member);state=await rpc(db,'no_app_snapshot',['fund-a']);assert.equal(state.data.funds.rejectedPayments[0].reason,'Chưa tìm thấy giao dịch đối soát');assert.equal(state.data.funds.pendingApprovals.length,0);assert.equal(state.data.funds.debtors.length,1);
 const resubmitted=await rpc(db,'no_app_payment',['fund-a','request','','',randomUUID()]);assert.notEqual(resubmitted.data.funds.pendingApprovals[0].id,id);
 await asUser(db,outsider);await assert.rejects(()=>rpc(db,'no_app_payment',['fund-a','request','','',randomUUID()]),/quyền/);
});
test('expired team locks allow existing membership; current locks and removal expose only own retained history',async()=>{
 await db.exec('reset role');await db.query("update no_gov_members set status='locked',locked_until=clock_timestamp()+interval '1 day' where team_id='fund-a' and user_id=$1",[member]);
 await asUser(db,member);let state=await rpc(db,'no_app_snapshot',['fund-a']);assert.equal(state.restricted,true);assert.equal(state.team.members.length,1);assert.equal(state.team.members[0].id,member);await assert.rejects(()=>rpc(db,'no_app_payment',['fund-a','request','','',randomUUID()]),/quyền/);
 await db.exec('reset role');await db.query("update no_gov_members set locked_until=clock_timestamp()-interval '1 second' where team_id='fund-a' and user_id=$1",[member]);await asUser(db,member);assert.equal((await rpc(db,'no_gov_my_memberships',[]))[0].status,'active');assert.equal((await rpc(db,'no_app_snapshot',['fund-a'])).restricted,false);assert.equal(await rpc(db,'no_app_is_member',['fund-a']),true);
 await db.exec('reset role');await db.query("update no_gov_members set status='removed' where team_id='fund-a' and user_id=$1",[member]);await asUser(db,member);state=await rpc(db,'no_app_snapshot',['fund-a']);assert.equal(state.restricted,true);assert.equal(state.membershipStatus,'removed');assert.equal(state.data.funds.transactions.length,1);assert.equal(await rpc(db,'no_app_is_member',['fund-a']),false);
});
