import test,{before,after} from 'node:test';import assert from 'node:assert/strict';import {createMasterDb,asUser,rpc,owner,member} from './helpers/masterDb.mjs';
let db;
before(async()=>{db=await createMasterDb();await asUser(db,owner);await rpc(db,'no_gov_create_team',['legacy-a','Legacy FC','Asia/Ho_Chi_Minh']);});after(async()=>db.close());
test('trusted import preserves originals, parses legacy local dates in team timezone, and never imports JSON owner claims',async()=>{
 const original={funds:{transactions:[{id:'old',title:'Tiền sân',amount:50000,type:'expense',date:'12/10/2026'}],pendingApprovals:[],debtors:[]},matches:[{id:'old-match',title:'Trận cũ',datetime:'2026-10-24T18:30',deadline:'2026-10-24T12:00',status:'upcoming'}],attendance:{},reports:{},notices:[]};
 await db.exec('reset role;set role service_role');await rpc(db,'no_app_seed',['legacy-a',{ownerId:member,members:[{id:member,roleType:'owner'}]},original]);
 await asUser(db,owner);const state=await rpc(db,'no_app_snapshot',['legacy-a']);assert.equal(state.team.ownerId,owner);assert.equal(state.team.members.length,1);assert.equal(new Date(state.data.matches[0].datetime).toISOString(),'2026-10-24T11:30:00.000Z');assert.equal(state.data.funds.transactions[0].occurredAt,undefined);
 await db.exec('reset role');const archive=(await db.query("select original_data from no_app_legacy_workspaces where team_id='legacy-a'")).rows[0].original_data;assert.deepEqual(archive,original);await assert.rejects(()=>db.exec('delete from no_app_legacy_workspaces'),/append-only|immutable|audit/i);
 await asUser(db,member);await assert.rejects(()=>rpc(db,'no_app_seed',['legacy-a',{},original]),/permission denied/);
});
test('chat legacy import preserves the raw archive, authentic historical timestamps and explicit unverified attribution',async()=>{
 const legacy=[{id:'old-message-1',senderId:'unlinked-legacy-author',sender:'Tên cũ',text:'Hẹn ra sân',createdAt:'2026-10-12T10:00:00Z'},{id:'unparseable',text:'Nội dung cũ chưa có giờ'}];
 await db.exec('reset role;set role service_role');await rpc(db,'no_app_import_chat',['legacy-a',legacy]);await rpc(db,'no_app_import_chat',['legacy-a',[]]);
 await asUser(db,owner);const messages=(await db.query("select * from no_team_messages where team_id='legacy-a'")).rows;assert.equal(messages.length,1);assert.equal(messages[0].sender_id,null);assert.equal(messages[0].legacy_sender_name,'Tên cũ');assert.equal(messages[0].legacy_unverified,true);assert.equal(new Date(messages[0].created_at).toISOString(),'2026-10-12T10:00:00.000Z');
 await db.exec('reset role');const archive=(await db.query("select payload,unreadable_count from no_app_chat_archives where team_id='legacy-a'")).rows[0];assert.deepEqual(archive.payload,legacy);assert.equal(archive.unreadable_count,1);
});
test('legacy manual role claims never become authority; private contact is shown only to team leaders',async()=>{
 await asUser(db,owner);await rpc(db,'no_gov_create_team',['private-legacy','Private legacy','Asia/Ho_Chi_Minh']);
 await db.exec('reset role;set role service_role');await rpc(db,'no_app_seed',['private-legacy',{members:[{id:'manual-old',name:'Manual player',number:22,isManual:true,roleType:'owner',phone:'0900000000'}]},{funds:{transactions:[],pendingApprovals:[],debtors:[]},matches:[],attendance:{},reports:{},notices:[]}]);
 await asUser(db,owner);const state=await rpc(db,'no_app_snapshot',['private-legacy']);assert.equal(state.team.members.find(m=>m.id==='manual-old').roleType,'member');assert.equal(state.team.members.find(m=>m.id==='manual-old').phone,'0900000000');
 const invite=await rpc(db,'no_gov_create_invite',['private-legacy']);await asUser(db,member);await rpc(db,'no_gov_join_via_invite',[invite.code,'Member',19,'MF']);
 const limited=await rpc(db,'no_app_snapshot',['private-legacy']);assert.equal(limited.team.members.find(m=>m.id==='manual-old').phone,undefined);assert.equal(limited.team.ownerId,owner);assert.equal(limited.team.manualMembers,undefined);assert.equal(JSON.stringify(limited).includes('0900000000'),false);
});
