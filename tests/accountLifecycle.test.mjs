import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createMasterDb,asUser,rpc,owner,member,outsider} from './helpers/masterDb.mjs';
let db;const device=randomUUID(),second=randomUUID(),secret='x'.repeat(43),sub=s=>({endpoint:'https://fcm.googleapis.com/fcm/send/'+s,keys:{p256dh:'test',auth:'test'}});
before(async()=>{db=await createMasterDb();await asUser(db,owner);await rpc(db,'no_app_create_team',['exit-test','Đội xác nhận',{}]);await rpc(db,'no_app_create_team',['other-team','Đội khác',{}]);await db.exec('reset role');await db.query("insert into no_gov_members(team_id,user_id,name,role,status,jersey_number) values('exit-test',$1,'Thành viên','member','active',19),('other-team',$1,'Thành viên','member','active',19)",[member]);});
after(async()=>db.close());
test('account preferences survive sessions, apply to a new device, and cannot be read or changed as another user',async()=>{
 await asUser(db,member);const initial=await rpc(db,'no_notification_settings',[null]);assert.equal(initial.preferences.groups.messages,true);
 await rpc(db,'no_notification_settings',[{groups:{funds:true,messages:false},hidePreview:false}]);
 await rpc(db,'no_push_register',[device,secret,sub('one'),{messages:true},true]);
 await asUser(db,outsider);assert.equal((await rpc(db,'no_notification_settings',[null])).preferences.groups.funds,false);
 await assert.rejects(()=>db.query('select * from no_notification_preferences'),/permission denied/);
 await asUser(db,member);const settings=await rpc(db,'no_notification_settings',[null]);assert.equal(settings.preferences.groups.funds,true);assert.equal(settings.preferences.groups.messages,false);
 await rpc(db,'no_push_register',[second,secret,sub('two'),{messages:true},true]);
 const state=await rpc(db,'no_push_device_state',[second,secret]);assert.equal(state.hidePreview,false);assert.equal(state.groups.messages,false);assert.equal(state.groups.funds,true);
 await assert.rejects(()=>rpc(db,'no_notification_settings',[{groups:{messages:'false'}}]),/Invalid/);await assert.rejects(()=>rpc(db,'no_notification_settings',[{userId:outsider}]),/Invalid/);
});
test('account off switch suppresses pending delivery without unregistering other devices',async()=>{
 await asUser(db,member);await rpc(db,'no_notification_settings',[{enabled:true,groups:{messages:true}}]);
 await asUser(db,owner);await rpc(db,'no_app_send_message',['exit-test',randomUUID(),'Chỉ dữ liệu test']);
 await asUser(db,member);await rpc(db,'no_notification_settings',[{enabled:false}]);await db.exec('reset role');assert.deepEqual(await rpc(db,'no_push_claim',[20]),[]);
 assert.equal((await db.query('select enabled from no_push_devices where id=$1',[device])).rows[0].enabled,true);
});
test('member leave is idempotent, removes only own membership and preserves ledger/chat history',async()=>{
 await asUser(db,member);await assert.rejects(()=>rpc(db,'no_app_exit_team',['exit-test',true,'Đội xác nhận']),/Chỉ chủ đội/);
 await rpc(db,'no_app_exit_team',['exit-test',false,'']);await rpc(db,'no_app_exit_team',['exit-test',false,'']);
 assert.deepEqual((await rpc(db,'no_gov_my_memberships',[])).map(m=>m.teamId),['other-team']);
 await assert.rejects(()=>rpc(db,'no_app_send_message',['exit-test',randomUUID(),'Không được gửi']),/denied|không|quyền/i);
 await db.exec('reset role');assert.equal((await db.query("select count(*)::int n from no_team_lifecycle_events where team_id='exit-test' and action='leave'")).rows[0].n,1);assert.ok((await db.query("select count(*)::int n from no_team_messages where team_id='exit-test'")).rows[0].n>0);
});
test('only active owner can dissolve, exact name is required, invitations and access are revoked atomically',async()=>{
 await asUser(db,outsider);await assert.rejects(()=>rpc(db,'no_app_exit_team',['exit-test',true,'Đội xác nhận']),/quyền/);
 await asUser(db,owner);await assert.rejects(()=>rpc(db,'no_app_exit_team',['exit-test',false,'']),/Chủ đội/);await assert.rejects(()=>rpc(db,'no_app_exit_team',['exit-test',true,'Sai tên']),/chưa khớp/);
 const invite=await rpc(db,'no_gov_create_invite',['exit-test']);await rpc(db,'no_app_exit_team',['exit-test',true,'Đội xác nhận']);await rpc(db,'no_app_exit_team',['exit-test',true,'Đội xác nhận']);
 assert.equal((await rpc(db,'no_gov_my_memberships',[])).some(m=>m.teamId==='exit-test'),false);
 await db.exec('reset role');assert.equal((await db.query("select status from no_gov_invites where team_id='exit-test'")).rows[0].status,'revoked');
 await assert.rejects(()=>db.query("update no_gov_members set status='active' where team_id='exit-test' and user_id=$1",[member]),/giải tán/);
});
