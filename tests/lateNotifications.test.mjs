import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createMasterDb,asUser,rpc,owner,member,outsider} from './helpers/masterDb.mjs';
let db,kickoff,eta,first;
const receiver='00000000-0000-4000-8000-000000000004';
const sub=id=>({endpoint:'https://fcm.googleapis.com/fcm/send/'+id,keys:{p256dh:Buffer.concat([Buffer.from([4]),Buffer.alloc(64,1)]).toString('base64url'),auth:Buffer.alloc(16,2).toString('base64url')}});
const request=(payload,key=randomUUID())=>rpc(db,'no_gov_mutate',['late-notice','late_request',payload,key]);
before(async()=>{
 db=await createMasterDb();await asUser(db,owner);await rpc(db,'no_app_create_team',['late-notice','Đội đúng',{}]);await asUser(db,outsider);await rpc(db,'no_app_create_team',['late-other','Đội khác',{}]);
 await db.exec('reset role');await db.query("insert into auth.users(id,email) values($1,'receiver@example.test')",[receiver]);
 await db.query("insert into no_gov_members(team_id,user_id,name,role,status,jersey_number,receive_attendance) values('late-notice',$1,'Nguyễn Văn An','member','active',10,false),('late-notice',$2,'Người nhận được chỉ định','member','active',2,true)",[member,receiver]);
 kickoff=new Date(Date.now()+2*864e5).toISOString();eta=new Date(Date.parse(kickoff)+15*60000).toISOString();
 await db.query("insert into no_gov_matches(team_id,id,title,kickoff,attendance_deadline) values('late-notice','match-late','Gặp FC Bình Minh',$1,$2)",[kickoff,new Date(Date.parse(kickoff)-3600000).toISOString()]);
 for(const who of [owner,receiver,outsider]){await asUser(db,who);await rpc(db,'no_push_register',[randomUUID(),'x'.repeat(43),sub(who),{messages:false,matches:false,funds:false,governance:true},false]);}
});
after(async()=>db.close());
test('late notification persists the actual member, jersey, match, ETA, reason, sent timestamp and exact deep link',async()=>{
 await asUser(db,member);first=await request({matchId:'match-late',eta,reason:'Kẹt xe trên đường đến sân'});
 await asUser(db,owner);const snapshot=await rpc(db,'no_app_snapshot',['late-notice']);
 assert.equal(snapshot.data.notices.length,1);const n=snapshot.data.notices[0];
 assert.equal(n.title,'Nguyễn Văn An · #10 xin đến muộn');assert.match(n.content,/FC Bình Minh/);assert.match(n.content,/15 phút/);assert.match(n.content,/Kẹt xe/);assert.match(n.content,/Gửi lúc/);
 assert.equal(n.matchId,'match-late');assert.equal(n.memberId,member);assert.equal(n.route,'dashboard');assert.equal(n.unread,true);
 await asUser(db,receiver);assert.equal((await rpc(db,'no_app_snapshot',['late-notice'])).data.notices.length,1);
 await asUser(db,outsider);assert.equal((await rpc(db,'no_app_snapshot',['late-other'])).data.notices.length,0);
 await db.exec('reset role');const jobs=await rpc(db,'no_push_claim',[20]);assert.equal(jobs.length,2);
 assert.ok(jobs.every(j=>j.payload.teamId==='late-notice'&&j.payload.body.includes('15 phút')&&j.payload.url.includes('&view=dashboard&match=match-late&member='+member)));
 assert.equal((await db.query("select count(*)::int n from no_push_outbox where governance_event is not null")).rows[0].n,0);
});
test('retries with new keys do not duplicate events/notices, changes are explicit, finalized data stays locked',async()=>{
 await asUser(db,member);await request({matchId:'match-late',eta,reason:'Kẹt xe trên đường đến sân'});await request({matchId:'match-late',eta,reason:'Kẹt xe trên đường đến sân'});
 await db.exec('reset role');assert.equal((await db.query("select count(*)::int n from no_gov_events where action='late_request'")).rows[0].n,1);
 await asUser(db,member);await request({matchId:'match-late',eta:new Date(Date.parse(eta)+5*60000).toISOString(),reason:'Đã cập nhật giờ đến'});
 await asUser(db,owner);const state=await rpc(db,'no_app_snapshot',['late-notice']);assert.equal(state.data.notices.length,2);assert.ok(state.data.notices.some(n=>/cập nhật xin/.test(n.title)));
 await db.exec('reset role');await db.query("insert into no_gov_events(team_id,actor,subject,match_id,action,request_key,data) values('late-notice',$1,$2,'match-late','violation',$3,'{\"type\":\"late\"}')",[owner,member,randomUUID()]);
 await asUser(db,member);await assert.rejects(()=>request({matchId:'match-late',eta:new Date(Date.parse(eta)+8*60000).toISOString(),reason:'Không được sửa bản đã chốt'}),/finalized/);
});
test('realtime signal carries no ledger data and is inaccessible across teams',async()=>{
 await asUser(db,member);const own=await db.query("select * from no_team_updates where team_id='late-notice'");assert.equal(own.rows.length,1);assert.ok(Number(own.rows[0].version)>0);assert.deepEqual(Object.keys(own.rows[0]).sort(),['team_id','version']);
 assert.equal((await db.query("select * from no_team_updates where team_id='late-other'")).rows.length,0);
});
