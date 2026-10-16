import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {createMasterDb,asUser,rpc,owner,member,outsider} from './helpers/masterDb.mjs';
let db,charge,collection;const team='sync-regression';
const fund=(a,p={},k=randomUUID())=>rpc(db,'no_fund_action',[team,a,p,k]);
const balance=async()=>{await db.exec('reset role');return (await db.query("select coalesce(sum(case x->>'type' when 'income' then (x->>'amount')::bigint else -(x->>'amount')::bigint end),0)::text balance from no_app_workspaces, lateral jsonb_array_elements(data->'funds'->'transactions') x where team_id=$1",[team])).rows[0].balance;};
before(async()=>{db=await createMasterDb();await asUser(db,owner);await rpc(db,'no_app_create_team',[team,'Đội hồi quy',{}]);await db.exec('reset role');await db.query("insert into no_gov_members(team_id,user_id,name,role,status) values($1,$2,'Thành viên đóng quỹ','member','active')",[team,member]);await asUser(db,owner);await fund('schedule_save',{title:'Quỹ kiểm thử khoản đóng dài',amount:12500000,recipients:[member],repeat:'once',day:5,sendAt:new Date().toISOString(),dueDate:new Date(Date.now()+864e5).toISOString().slice(0,10)});await db.exec('reset role');const row=(await db.query('select id,collection_id from no_pro_charges where team_id=$1',[team])).rows[0];charge=row.id;collection=row.collection_id;});
after(async()=>db.close());
test('pending requests are durable and scoped; rejection retains history, resubmission and duplicate approvals reconcile once',async()=>{
 await asUser(db,member);const key=randomUUID();let state=await fund('payment_request',{chargeId:charge,amount:50000,note:'Đối soát khoản thử'},key);await fund('payment_request',{chargeId:charge,amount:50000,note:'Đối soát khoản thử'},key);
 assert.equal(state.pendingRequests.length,1);assert.equal(state.pendingRequests[0].note,'Đối soát khoản thử');assert.equal(await balance(),'0');
 await asUser(db,owner);state=await fund('state');const n=(await rpc(db,'no_app_snapshot',[team])).data.notices.find(n=>n.title==='Chờ xác nhận đóng quỹ');assert.match(n.content,/Thành viên đóng quỹ.*Quỹ kiểm thử khoản đóng dài.*Kỳ once.*50000/);
 await fund('payment_reject',{requestId:state.pendingRequests[0].id,reason:'Chưa đối chiếu được khoản tiền'});
 await asUser(db,member);state=await fund('state');assert.equal(state.pendingRequests.length,0);assert.match(state.rejectedRequests[0].reason,/Chưa đối chiếu/);await fund('payment_request',{chargeId:charge,amount:50000});
 await asUser(db,owner);state=await fund('state');const request=state.pendingRequests[0].id;await Promise.all([fund('payment_approve',{requestId:request}),fund('payment_approve',{requestId:request})]);assert.equal(await balance(),'50000');
 await asUser(db,member);state=await fund('state');assert.equal(state.pendingRequests.length,0);assert.equal(Number(state.charges[0].paid_amount),50000);assert.equal(Number(state.charges[0].amount)-Number(state.charges[0].paid_amount),12450000);
 await asUser(db,outsider);await assert.rejects(()=>fund('state'),/quyền/);
});
test('notice reads persist per user and emit a revision; preference signals are private and never reset on read',async()=>{
 await asUser(db,member);let snap=await rpc(db,'no_app_snapshot',[team]);const notice=snap.data.notices[0];const revision=snap.revision;
 await rpc(db,'no_app_read_notices',[team,[notice.id]]);snap=await rpc(db,'no_app_snapshot',[team]);assert.equal(snap.data.notices.find(n=>n.id===notice.id).unread,false);assert.ok(snap.revision>revision);
 await rpc(db,'no_notification_settings',[{groups:{funds:true,governance:true},enabled:true}]);await asUser(db,owner);await rpc(db,'no_notification_settings',[{enabled:false}]);await asUser(db,member);const prefs=await rpc(db,'no_notification_settings',[null]);assert.equal(prefs.preferences.groups.funds,true);assert.equal(prefs.preferences.enabled,true);
 const signals=await db.query('select * from no_user_updates');assert.equal(signals.rows.length,1);assert.equal(signals.rows[0].user_id,member);assert.ok(Number(signals.rows[0].version)>=2);
});
test('governance attendance emits a safe team signal, and late requests do not overwrite attendance',async()=>{
 await db.exec('reset role');const kickoff=new Date(Date.now()+2*864e5).toISOString();await db.query("insert into no_gov_matches(team_id,id,title,kickoff,attendance_deadline) values($1,'sync-match','Trận đồng bộ',$2,$3)",[team,kickoff,new Date(Date.parse(kickoff)-3600000).toISOString()]);const version=Number((await db.query('select version from no_team_updates where team_id=$1',[team])).rows[0].version);
 await asUser(db,member);await rpc(db,'no_gov_mutate',[team,'attendance',{matchId:'sync-match',status:'attending'},randomUUID()]);await rpc(db,'no_gov_mutate',[team,'late_request',{matchId:'sync-match',eta:new Date(Date.parse(kickoff)+900000).toISOString(),reason:'Kiểm thử đồng bộ'},randomUUID()]);
 await asUser(db,owner);const snap=await rpc(db,'no_gov_snapshot',[team]);assert.ok(snap.events.some(e=>e.action==='attendance'));assert.ok(snap.events.some(e=>e.action==='late_request'));const signals=await db.query('select version from no_team_updates where team_id=$1',[team]);assert.ok(Number(signals.rows[0].version)>=version+2);
});
test('missed monthly ticks catch up only from schedule start without changing earlier collections',async()=>{
 await asUser(db,owner);const id=randomUUID();await fund('schedule_save',{id,title:'Kỳ chạy bù',amount:100000,recipients:[member],repeat:'monthly',day:5,sendAt:'2028-09-05T02:00Z',dueDate:'2028-09-06'});
 await db.exec('reset role');for(let i=0;i<6;i++)await rpc(db,'no_fund_tick',['2028-12-06T02:00Z']);const rows=await db.query('select period from no_fund_collections where schedule_id=$1 order by period',[id]);assert.deepEqual(rows.rows.map(x=>x.period),['2028-09','2028-10','2028-11','2028-12']);const old=await db.query('select paid_amount from no_pro_charges where collection_id=$1',[collection]);assert.equal(Number(old.rows[0].paid_amount),50000);
});
test('legacy monthly fine confirmation updates the same charge, blocks double payment, and void restores debt',async()=>{
 await db.exec('reset role');const id=randomUUID();await db.query("insert into no_pro_charges(id,team_id,subject,kind,source_key,label,amount,actor) values($1,$2,$3,'fine',$4,'Khoản phạt kiểm thử',20000,$5)",[id,team,member,'legacy-fine:'+id,owner]);
 const month=new Date().toISOString().slice(0,7);await db.query("update no_app_workspaces set data=jsonb_set(data,'{funds,debtors}',jsonb_build_array(jsonb_build_object('id',$1::text,'playerId',$2::text,'amount',20000,'month',$3::text))) where team_id=$4",['pro-'+id,member,month,team]);
 await asUser(db,member);await rpc(db,'no_app_payment',[team,'request','','',randomUUID()]);await asUser(db,owner);let snap=await rpc(db,'no_app_snapshot',[team]);const pending=snap.data.funds.pendingApprovals.find(p=>!p.chargeId);await rpc(db,'no_app_payment',[team,'approve',pending.id,'Đã đối soát',randomUUID()]);
 const state=await fund('state');assert.equal(Number(state.charges.find(c=>c.id===id).paid_amount),20000);await assert.rejects(()=>fund('payment',{chargeId:id,amount:20000}),/nghĩa vụ/);
 snap=await rpc(db,'no_app_snapshot',[team]);const tx=snap.data.funds.transactions.find(t=>t.paymentId===pending.id);assert.equal(tx.chargeAllocations[0].chargeId,id);assert.equal(await balance(),'70000');
 await asUser(db,owner);await fund('transaction_void',{id:tx.id,reason:'Hủy khoản xác nhận trong kiểm thử'});const after=await fund('state');assert.equal(Number(after.charges.find(c=>c.id===id).paid_amount),0);snap=await rpc(db,'no_app_snapshot',[team]);assert.equal(snap.data.funds.debtors.find(d=>d.id==='pro-'+id).amount,20000);assert.equal(await balance(),'50000');
});
