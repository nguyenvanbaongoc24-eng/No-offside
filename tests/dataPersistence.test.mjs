import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createMasterDb,asUser,rpc,owner,member,outsider} from './helpers/masterDb.mjs';
let db;
before(async()=>{db=await createMasterDb();});after(async()=>{await db.close();});
test('canonical create is atomic, retry-safe, and cannot overwrite another owner',async()=>{
 await asUser(db,owner);const first=await rpc(db,'no_app_create_team',['team-a','FC Alpha',{}]);
 assert.equal(first.team.ownerId,owner);assert.equal(first.team.members.length,1);
 const again=await rpc(db,'no_app_create_team',['team-a','Changed by retry',{}]);assert.equal(again.team.teamName,'FC Alpha');
 await asUser(db,outsider);await assert.rejects(()=>rpc(db,'no_app_create_team',['team-a','Stolen',{}]),/đã được sử dụng/);
 await rpc(db,'no_app_create_team',['team-b','FC Beta',{}]);
 await db.exec('reset role');assert.equal((await db.query('select count(*)::int as n from no_gov_teams')).rows[0].n,2);
});
test('invite membership binds authenticated identity; team ID bypass denied; locked cannot rejoin',async()=>{
 await asUser(db,owner);const invite=await rpc(db,'no_gov_create_invite',['team-a']);
 await asUser(db,member);await assert.rejects(()=>rpc(db,'no_gov_join_team',['team-a','Member']),/permission denied/);
 const join=await rpc(db,'no_gov_join_via_invite',[invite.code,'Member',19,'Tiền vệ']);assert.equal(join.me.user_id,member);assert.equal(join.me.role,'member');
 await asUser(db,null);await assert.rejects(()=>rpc(db,'no_gov_join_via_invite',[invite.code,'Anonymous',20,'Tiền vệ']),/Authentication|đăng nhập|permission denied/);
});
test('workspace reads enforce team isolation and private profile RLS',async()=>{
 await asUser(db,outsider);await assert.rejects(()=>rpc(db,'no_app_snapshot',['team-a']),/không có quyền/);
 const rows=await db.query('select id from profiles');assert.deepEqual(rows.rows.map(p=>p.id),[outsider]);
 await assert.rejects(()=>db.query('select * from no_app_workspaces'),/permission denied/);
});
test('workspace commits validate membership, receipts are idempotent, concurrent revision cannot overwrite',async()=>{
 await asUser(db,owner);const key=randomUUID();const patch={matches:[{id:'match-1',status:'upcoming',datetime:'2099-10-16T12:00:00Z',deadline:'2099-10-16T11:00:00Z'}]};
 const saved=await rpc(db,'no_app_commit',['team-a',0,key,patch]);assert.equal(saved.revision,1);
 const retry=await rpc(db,'no_app_commit',['team-a',0,key,patch]);assert.equal(retry.revision,1);
 await assert.rejects(()=>rpc(db,'no_app_commit',['team-a',0,randomUUID(),{notices:[]}]),/thiết bị khác/);
 await asUser(db,member);await assert.rejects(()=>rpc(db,'no_app_commit',['team-a',1,randomUUID(),{matches:[]}]),/ban quản trị/);
 await assert.rejects(()=>rpc(db,'no_app_commit',['team-a',1,randomUUID(),{ownerId:member}]),/không được phép/);
});
test('attendance changes self only; server validates deadline and preserves peer votes',async()=>{
 await asUser(db,member);
 await assert.rejects(()=>rpc(db,'no_app_commit',['team-a',1,randomUUID(),{attendance:{'match-1':{[owner]:'absent'}}}]),/chính mình/);
 const saved=await rpc(db,'no_app_commit',['team-a',1,randomUUID(),{attendance:{'match-1':{[member]:'attending'}}}]);assert.equal(saved.data.attendance['match-1'][member],'attending');
 await asUser(db,owner);await rpc(db,'no_app_commit',['team-a',2,randomUUID(),{matches:[{id:'match-1',status:'completed',datetime:'2099-10-16T12:00:00Z',deadline:'2099-10-16T11:00:00Z',createdAt:saved.data.matches[0].createdAt}]}]);
 await asUser(db,member);await assert.rejects(()=>rpc(db,'no_app_commit',['team-a',3,randomUUID(),{attendance:{'match-1':{[member]:'absent'}}}]),/hết hạn/);
});
test('member cannot rewrite ledger or peer reports; historical transactions cannot disappear',async()=>{
 await asUser(db,member);await assert.rejects(()=>rpc(db,'no_app_commit',['team-a',3,randomUUID(),{funds:{transactions:[{id:'forged',amount:1,type:'income'}],pendingApprovals:[],debtors:[]}}]),/sổ quỹ/);
 await assert.rejects(()=>rpc(db,'no_app_commit',['team-a',3,randomUUID(),{reports:{[owner]:{'match-1':{goals:10,assists:0}}}}]),/chính mình/);
 await asUser(db,owner);await rpc(db,'no_app_commit',['team-a',3,randomUUID(),{funds:{transactions:[{id:'tx1',amount:100,type:'income'}],pendingApprovals:[],debtors:[]}}]);
 await assert.rejects(()=>rpc(db,'no_app_commit',['team-a',4,randomUUID(),{funds:{transactions:[],pendingApprovals:[],debtors:[]}}]),/xóa lịch sử/);
 await db.exec('reset role');await assert.rejects(()=>db.exec('delete from no_app_receipts'),/append-only|immutable|bất biến|audit/i);
});
test('team settings reject privilege fields; personal profile updates use database acknowledgment',async()=>{
 await asUser(db,owner);await assert.rejects(()=>rpc(db,'no_app_settings',['team-a',{members:[],ownerId:member}]),/không được phép/);
 const profile=await rpc(db,'no_app_save_profile',[{name:'Tên mới',number:10,role:'Tiền vệ',teamId:'team-a'}]);assert.equal(profile.full_name,'Tên mới');
 await asUser(db,member);await assert.rejects(()=>rpc(db,'no_app_settings',['team-a',{teamName:'Stolen'}]),/không có quyền/i);
});

test('manual players are durable profiles, have no Auth role, and removal retains their record',async()=>{
 await asUser(db,owner);const key=randomUUID();const first=await rpc(db,'no_app_member_action',['team-a','add-member','',{name:'Cầu thủ thủ công',number:23,role:'Tiền vệ'},key]);
 assert.equal(first.member.isManual,true);assert.equal(first.member.linkedUserId,null);assert.equal(first.member.avatar,'');assert.ok(first.team.members.some(m=>m.id===first.member.id));
 const again=await rpc(db,'no_app_member_action',['team-a','add-member','',{name:'Retry',number:23},key]);assert.equal(again.team.members.filter(m=>m.number===23).length,1);
 await assert.rejects(()=>rpc(db,'no_app_member_action',['team-a','add-member','',{name:'Duplicate',number:23},randomUUID()]),/được sử dụng/);
 const removed=await rpc(db,'no_app_member_action',['team-a','remove-member',first.member.id,{},randomUUID()]);assert.equal(removed.team.members.some(m=>m.id===first.member.id),false);
 await db.exec('reset role');const manual=(await db.query("select settings->'manualMembers' as value from no_app_workspaces where team_id='team-a'")).rows[0].value;assert.equal(manual[0].membershipStatus,'removed');
});
test('invite expiry/revocation is checked on every resolution; locked membership cannot bypass restriction',async()=>{
 await asUser(db,owner);let invite=await rpc(db,'no_gov_create_invite',['team-a']);await db.exec('reset role');await db.query("update no_gov_invites set expires_at=now()-interval '1 second' where code=$1",[invite.code]);
 await asUser(db,null);let result=await rpc(db,'no_gov_get_invite',[invite.code,'rotating-code']);assert.equal(result.valid,false);
 await asUser(db,owner);invite=await rpc(db,'no_gov_create_invite',['team-a']);await rpc(db,'no_gov_revoke_invite',['team-a']);await asUser(db,null);result=await rpc(db,'no_gov_get_invite',[invite.code,'another-client']);assert.equal(result.valid,false);
 await asUser(db,owner);invite=await rpc(db,'no_gov_create_invite',['team-a']);await db.exec('reset role');await db.query("update no_gov_members set status='locked' where team_id='team-a' and user_id=$1",[member]);await asUser(db,member);
 await assert.rejects(()=>rpc(db,'no_gov_join_via_invite',[invite.code,'Locked',19,'CM']),/hạn chế/);await assert.rejects(()=>rpc(db,'no_app_commit',['team-a',4,randomUUID(),{reports:{}}]),/không có quyền/);
 await db.exec('reset role');await db.query("update no_gov_members set status='active' where team_id='team-a' and user_id=$1",[member]);
});
test('invalid invite requests consume a shared rate limit instead of rolling back counters',async()=>{
 await asUser(db,null);for(let i=0;i<101;i++)await rpc(db,'no_gov_get_invite',['UNKNOWN'+i,'rotated-'+i]);
 const result=await rpc(db,'no_gov_get_invite',['UNKNOWN','fresh-client']);assert.equal(result.valid,false);assert.match(result.error,/Quá nhiều/);
});
test('owner transfer is atomic and retry cannot create two owners or grant roles from payload',async()=>{
 await asUser(db,member);await assert.rejects(()=>rpc(db,'no_app_member_action',['team-a','promote',outsider,{role:'owner'},randomUUID()]),/quyền/);
 await asUser(db,owner);await rpc(db,'no_app_member_action',['team-a','promote',member,{title:'Thủ quỹ'},randomUUID()]);
 const key=randomUUID();const transferred=await rpc(db,'no_app_member_action',['team-a','transfer',member,{},key]);assert.equal(transferred.role,'member');assert.equal(transferred.team.ownerId,member);
 const retry=await rpc(db,'no_app_member_action',['team-a','transfer',member,{},key]);assert.equal(retry.team.members.filter(m=>m.roleType==='owner').length,1);
 await assert.rejects(()=>rpc(db,'no_app_member_action',['team-a','demote',member,{},randomUUID()]),/quyền/);
});
test('manual profile linking binds an existing team account, preserves original and never grants Auth roles',async()=>{
 await asUser(db,member);const manual=await rpc(db,'no_app_member_action',['team-a','add-member','',{name:'Linked player',number:27},randomUUID()]);
 await assert.rejects(()=>rpc(db,'no_app_member_action',['team-a','link-member',manual.member.id,{userId:outsider},randomUUID()]),/eligible team member/);
 const key=randomUUID();const linked=await rpc(db,'no_app_member_action',['team-a','link-member',manual.member.id,{userId:owner},key]);
 assert.equal(linked.team.members.some(m=>m.id===manual.member.id),false);assert.equal(linked.team.members.find(m=>m.id===owner).number,27);assert.equal(linked.team.ownerId,member);
 const retry=await rpc(db,'no_app_member_action',['team-a','link-member',manual.member.id,{userId:owner},key]);assert.equal(retry.revision,linked.revision);
 await db.exec('reset role');const original=(await db.query("select settings->'manualMembers' as data from no_app_workspaces where team_id='team-a'")).rows[0].data.find(m=>m.id===manual.member.id);assert.equal(original.linkedUserId,owner);assert.equal(original.membershipStatus,'linked');
});
