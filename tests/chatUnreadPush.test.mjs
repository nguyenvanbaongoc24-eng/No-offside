import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createMasterDb,asUser,rpc,owner,member,outsider} from './helpers/masterDb.mjs';
import {dispatchPush,validSubscription} from '../api/_push.js';
let db;
const secret='x'.repeat(43), device=randomUUID(),secondDevice=randomUUID();
const subscription=(suffix='one')=>({endpoint:'https://fcm.googleapis.com/fcm/send/'+suffix,keys:{p256dh:Buffer.concat([Buffer.from([4]),Buffer.alloc(64,1)]).toString('base64url'),auth:Buffer.alloc(16,2).toString('base64url')}});
const send=async(text='Tin nhắn')=>rpc(db,'no_app_send_message',['push-a',randomUUID(),text]);
const claim=async()=>{await db.exec('reset role');return rpc(db,'no_push_claim',[20]);};
before(async()=>{db=await createMasterDb();await asUser(db,owner);await rpc(db,'no_app_create_team',['push-a','Đội test',{}]);await rpc(db,'no_app_create_team',['push-b','Đội khác',{}]);await send('Lịch sử cũ');await db.exec('reset role');await db.query("insert into no_gov_members(team_id,user_id,name,role,status,jersey_number) values('push-a',$1,'Member','member','active',19),('push-b',$1,'Member','member','active',19)",[member]);});
after(async()=>db.close());
test('backend unread ignores historical baseline and own sends; viewed boundary never clears a later arrival',async()=>{
 await asUser(db,member);assert.equal((await rpc(db,'no_chat_unread',[])).total,0);await send('Của tôi');assert.equal((await rpc(db,'no_chat_unread',[])).total,0);
 await asUser(db,owner);const first=await send('Một');const later=await send('Hai');
 await asUser(db,member);assert.equal((await rpc(db,'no_chat_unread',[])).total,2);
 assert.equal((await rpc(db,'no_chat_mark_read',['push-a',first.id])).total,1);
 assert.equal((await rpc(db,'no_chat_mark_read',['push-a',first.id])).total,1);
 await assert.rejects(()=>rpc(db,'no_chat_mark_read',['push-b',later.id]),/not found/);
 assert.equal((await rpc(db,'no_chat_mark_read',['push-a',later.id])).total,0);
 await assert.rejects(()=>db.query('update no_chat_reads set last_read_sequence=999999'),/permission denied/);
 await asUser(db,outsider);assert.equal((await rpc(db,'no_chat_unread',[])).total,0);await assert.rejects(()=>rpc(db,'no_chat_mark_read',['push-a',first.id]),/denied/);
});
test('private subscriptions require installation proof, group opt-in, and cannot be enumerated',async()=>{
 await asUser(db,member);await rpc(db,'no_push_register',[device,secret,subscription(),{messages:true},true]);await rpc(db,'no_push_register',[secondDevice,secret,subscription('two'),{messages:true},false]);
 await assert.rejects(()=>db.query('select * from no_push_devices'),/permission denied/);
 await assert.rejects(()=>rpc(db,'no_push_claim',[20]),/permission denied/);
 await asUser(db,outsider);assert.equal((await rpc(db,'no_push_device_state',[device,secret])).enabled,false);await assert.rejects(()=>rpc(db,'no_push_register',[device,'z'.repeat(43),subscription(),{},true]),/proof/);
 await assert.rejects(()=>rpc(db,'no_push_register',[randomUUID(),secret,{...subscription(),endpoint:'https://internal.local/secret'}, {},true]),/Unsupported/);
 await assert.rejects(()=>rpc(db,'no_push_register',[randomUUID(),secret,subscription('bad'),{messages:'yes'},true]),/Invalid/);
});
test('committed send creates one job per recipient device; retries are idempotent and previews private',async()=>{
 await asUser(db,owner);const key=randomUUID();const message=await rpc(db,'no_app_send_message',['push-a',key,'Nội dung riêng']);await rpc(db,'no_app_send_message',['push-a',key,'Nội dung riêng']);
 const jobs=await claim();assert.equal(jobs.length,2);assert.ok(jobs.every(j=>j.payload.accountId===member));assert.equal(jobs.find(j=>j.deviceId===device).payload.body,'Bạn có tin nhắn mới.');assert.match(jobs.find(j=>j.deviceId===secondDevice).payload.body,/Nội dung riêng/);assert.match(jobs[0].payload.url,/view=chat/);
 assert.deepEqual(await claim(),[]);
 for(const j of jobs)await rpc(db,'no_push_finish',[j.id,j.lease,'accepted',201]);
 await asUser(db,member);await rpc(db,'no_chat_mark_read',['push-a',message.id]);
 await asUser(db,owner);await send('Burst 1');await send('Burst 2');assert.deepEqual(await claim(),[]);
 await db.exec("update no_push_channels set last_sent_at=clock_timestamp()-interval '31 seconds'");
 const next=await claim();assert.equal(next.length,2);for(const j of next)await rpc(db,'no_push_finish',[j.id,j.lease,'accepted',201]);
 assert.equal((await db.query("select count(*)::int as n from no_push_outbox where state='pending'")).rows[0].n,0);
});
test('foreground, read, locked, and detached installations cannot receive stale content',async()=>{
 await db.exec("update no_push_channels set last_sent_at=clock_timestamp()-interval '31 seconds'");
 await asUser(db,member);await rpc(db,'no_chat_presence_update',[device,'push-a',true]);await asUser(db,owner);await send('Đang xem');assert.deepEqual(await claim(),[]);
 await asUser(db,member);await rpc(db,'no_chat_presence_update',[device,'push-a',false]);await rpc(db,'no_push_detach',[device,secret]);assert.equal((await rpc(db,'no_push_device_state',[device,secret])).enabled,false);assert.equal((await rpc(db,'no_push_device_state',[secondDevice,secret])).enabled,true);
 await db.exec('reset role');await db.query("update no_gov_members set status='locked',locked_until=clock_timestamp()+interval '1 day' where team_id='push-a' and user_id=$1",[member]);await asUser(db,owner);await send('Không được nhận');assert.deepEqual(await claim(),[]);await asUser(db,member);assert.equal((await rpc(db,'no_chat_unread',[])).total,0);
});
test('provider errors have bounded retry and expired subscriptions disable only that installation',async()=>{
 await db.exec('reset role');await db.query("update no_gov_members set status='active',locked_until=null where team_id='push-a' and user_id=$1",[member]);await asUser(db,owner);await send('Retry');const [job]=await claim();assert.ok(job);
 for(let attempt=1;attempt<=4;attempt++){
  const row=attempt===1?job:(await claim())[0];assert.ok(row);await rpc(db,'no_push_finish',[row.id,row.lease,'retry',503]);await db.exec("update no_push_outbox set available_at=clock_timestamp()-interval '1 second' where state='pending'");
 }
 assert.deepEqual(await claim(),[]);assert.equal((await db.query('select state from no_push_outbox where id=$1',[job.id])).rows[0].state,'failed');
 await asUser(db,owner);await send('Expired');const [expired]=await claim();await rpc(db,'no_push_finish',[expired.id,expired.lease,'expired',410]);await asUser(db,member);assert.equal((await rpc(db,'no_push_device_state',[secondDevice,secret])).enabled,false);
});
test('notice and governance pushes follow opt-in groups and current audience, not every event',async()=>{
 await asUser(db,member);await rpc(db,'no_push_register',[device,secret,subscription(),{messages:false,matches:true,funds:true,governance:true},false]);
 await asUser(db,owner);let snapshot=await rpc(db,'no_app_snapshot',['push-a']);
 await rpc(db,'no_app_commit',['push-a',snapshot.revision,randomUUID(),{matches:[{id:'new-match',title:'Trận mới',datetime:'2026-11-15T18:30:00+07:00',deadline:'2026-11-15T12:00:00+07:00',venue:'Sân test',opponent:'FC Test',status:'upcoming'}]}]);
 const notices=await claim();assert.equal(notices.length,1);assert.equal(notices[0].payload.kind,'matches');await rpc(db,'no_push_finish',[notices[0].id,notices[0].lease,'accepted',201]);
 await asUser(db,owner);await rpc(db,'no_gov_mutate',['push-a','rules',{content:'Nội quy kiểm thử',effectiveAt:new Date(Date.now()+60000).toISOString(),requireAck:true},randomUUID()]);
 const rules=await claim();assert.equal(rules.length,1);assert.equal(rules[0].payload.kind,'governance');assert.match(rules[0].payload.body,/nội quy/);await rpc(db,'no_push_finish',[rules[0].id,rules[0].lease,'accepted',201]);
 await asUser(db,member);await rpc(db,'no_push_register',[device,secret,subscription(),{messages:false,matches:false,funds:false,governance:false},true]);await asUser(db,owner);await send('Không opt in');assert.deepEqual(await claim(),[]);
});
test('server dispatcher never sends invalid endpoints and distinguishes provider acceptance from delivery',async()=>{
 assert.equal(validSubscription(subscription()),true);assert.equal(validSubscription({...subscription(),endpoint:'https://fcm.googleapis.com.attacker.test/'}),false);
 const finished=[],jobs=[{id:'one',lease:'lease',deviceId:'device',subscription:subscription(),payload:{tag:'messages:team'}},{id:'bad',lease:'lease',deviceId:'other',subscription:{endpoint:'http://localhost/'},payload:{tag:'x'}}];let sent=0;
 const client={rpc:async(name,args)=>{if(name==='no_push_claim')return {data:jobs};finished.push(args);return {};}};
 const result=await dispatchPush({client,send:async()=>{sent++;return {statusCode:201};}});assert.equal(sent,1);assert.equal(result.accepted,1);assert.equal(finished.find(x=>x.p_id==='bad').p_outcome,'expired');
 finished.length=0;await dispatchPush({client,send:async()=>{throw {statusCode:410};}});assert.equal(finished.find(x=>x.p_id==='one').p_outcome,'expired');
});


