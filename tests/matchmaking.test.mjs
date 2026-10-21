import test, {before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {createMasterDb,asUser,rpc,owner,member,outsider} from './helpers/masterDb.mjs';
let db;
const a='mm-home',b='mm-away',c='mm-third';
const run=(team,action,payload={},key=randomUUID())=>rpc(db,'no_mm_action',[team,action,payload,key]);
const state=team=>rpc(db,'no_mm_state',[team]);
const conditions=(days=4)=>{const k=Date.now()+days*864e5;return {kickoff:new Date(k).toISOString(),endsAt:new Date(k+54e5).toISOString(),expiresAt:new Date(k-36e5).toISOString(),format:7,level:'regular',district:'Thủ Đức',venueStatus:'planned',venue:'Sân kiểm thử',address:'Địa chỉ công khai',mapUrl:'https://maps.google.com/',cost:1000000,sharing:'split',support:0,shirt:'Xanh',note:'Giao hữu',requirements:''};};
const publish=async(days=4,extra={})=>{await asUser(db,owner);return run(a,'publish',{conditions:conditions(days),...extra});};
const propose=async(offerId,team=b,actor=outsider)=>{await asUser(db,actor);return run(team,'propose',{offerId});};
before(async()=>{
 db=await createMasterDb();for(const n of ['202610190001_match_lifecycle.sql','202610200001_product_audit.sql','202610200002_matchmaking.sql','202610200003_matchmaking_private_notes.sql','202610200004_matchmaking_team_lifecycle.sql'])await db.exec(await readFile(new URL('../supabase/migrations/'+n,import.meta.url),'utf8'));
 for(const [id,name,user] of [[a,'FC Nhà',owner],[b,'FC Khách',outsider],[c,'FC Thứ ba',member]]){await asUser(db,user);await rpc(db,'no_app_create_team',[id,name,{}]);}
 await db.exec('reset role');await db.query("insert into no_gov_members(team_id,user_id,name,role,status) values($1,$2,'Member','member','active')",[a,member]);
});
beforeEach(async()=>{await db.exec('reset role');await db.exec("update no_mm_events set created_at=clock_timestamp()-interval '2 minutes'");});
after(async()=>db.close());

test('public minimal feed, team/representative rights and table RLS protect private conversations',async()=>{
 const offer=await publish();await asUser(db,null);
 const feed=await state(null);assert.ok(feed.offers.some(o=>o.id===offer.offerId));assert.equal(feed.offers.find(o=>o.id===offer.offerId).conditions.address,undefined);
 await assert.rejects(()=>state(a),/thành viên/);
 await asUser(db,member);await assert.rejects(()=>run(a,'publish',{conditions:conditions()}),/quản lý trận/);
 await assert.rejects(()=>db.query('select * from no_mm_messages'),/permission denied/);
 const proposal=await propose(offer.offerId);await run(b,'message',{proposalId:proposal.proposalId,body:'Trao đổi riêng giữa hai đại diện'});
 await asUser(db,member);assert.equal((await state(a)).messages.length,0);assert.equal((await state(c)).messages.length,0);
 await asUser(db,owner);assert.equal((await state(a)).messages.filter(m=>m.challenge_id===proposal.proposalId).length,1);
 await assert.rejects(()=>run(a,'propose',{offerId:offer.offerId}),/đội mình/);
 await assert.rejects(()=>rpc(db,'no_pro_action',[a,'accept',{challengeId:proposal.proposalId},randomUUID()]),/xác nhận hai đội/);
});

test('publish validates dates, overlap, idempotency keys; proposals withdraw/resend keep history',async()=>{
 await asUser(db,owner);const input={conditions:conditions(7)},key=randomUUID();
 const first=await run(a,'publish',input,key);assert.deepEqual(await run(a,'publish',input,key),first);
 await assert.rejects(()=>run(a,'publish',{...input,allowConflict:true},key),/Mã thao tác/);
 await assert.rejects(()=>run(a,'publish',input),/chồng lấn/);
 await assert.rejects(()=>run(a,'publish',{conditions:{...conditions(8),kickoff:'2020-01-01T12:00Z'}}),/tương lai/);
 const p=await propose(first.offerId);await assert.rejects(()=>run(b,'propose',{offerId:first.offerId}),/đã có/);
 await run(b,'withdraw',{proposalId:p.proposalId,reason:'Đổi kế hoạch thi đấu'});
 const again=await run(b,'propose',{offerId:first.offerId});assert.equal(again.proposalId,p.proposalId);
 const snap=await state(b);assert.equal(snap.proposals.find(x=>x.id===p.proposalId).current_version,2);assert.ok(snap.history.some(e=>e.action==='withdraw'&&e.challenge_id===p.proposalId));
});

test('existing match overlap requires consent; a selected source match is reused instead of duplicated',async()=>{
 await asUser(db,owner);const t=conditions(31),snap=await rpc(db,'no_app_snapshot',[a]);
 const source={id:'mm-existing-source',status:'upcoming',title:'Trận có sẵn',note:'PRIVATE: kế hoạch chiến thuật của đội nhà',datetime:t.kickoff,deadline:t.expiresAt,endsAt:t.endsAt,venue:'Sân cũ'};
 await rpc(db,'no_app_commit',[a,snap.revision,randomUUID(),{matches:[...snap.data.matches,source]}]);
 await assert.rejects(()=>run(a,'publish',{conditions:t}),/chồng lấn/);
 const offer=await run(a,'publish',{conditions:t,sourceMatch:source.id});const p=await propose(offer.offerId);
 await asUser(db,owner);await run(a,'confirm',{proposalId:p.proposalId,version:1});await asUser(db,outsider);await run(b,'confirm',{proposalId:p.proposalId,version:1});
 await asUser(db,owner);const w=await rpc(db,'no_app_snapshot',[a]);assert.equal(w.data.matches.filter(m=>Date.parse(m.datetime)===Date.parse(source.datetime)).length,1);assert.equal(w.data.matches.find(m=>m.sourceOffer===offer.offerId).id,source.id);assert.equal(w.data.matches.find(m=>m.id===source.id).note,source.note);await asUser(db,outsider);const away=await rpc(db,'no_app_snapshot',[b]);assert.ok(!JSON.stringify(away).includes(source.note));assert.ok(!JSON.stringify(await state(b)).includes(source.note));
});

test('same-version bilateral confirmation links exactly two private matches and closes other proposals',async()=>{
 const offer=await publish(10),p=await propose(offer.offerId),rival=await propose(offer.offerId,c,member);
 await asUser(db,owner);await run(a,'confirm',{proposalId:p.proposalId,version:1});
 assert.equal((await rpc(db,'no_app_snapshot',[a])).data.matches.filter(m=>m.sourceOffer===offer.offerId).length,0);
 await asUser(db,outsider);const key=randomUUID(),payload={proposalId:p.proposalId,version:1};await run(b,'confirm',payload,key);await run(b,'confirm',payload,key);
 const snap=await state(b);const link=snap.links.find(l=>l.offer_id===offer.offerId);assert.ok(link);
 for(const [team,actor] of [[a,owner],[b,outsider]]){await asUser(db,actor);const w=await rpc(db,'no_app_snapshot',[team]);assert.equal(w.data.matches.filter(m=>m.sourceOffer===offer.offerId).length,1);assert.equal(w.data.funds.transactions.length,0);}
 await asUser(db,member);assert.equal((await state(c)).proposals.find(x=>x.id===rival.proposalId).status,'closed');
 await assert.rejects(()=>run(c,'confirm',{proposalId:rival.proposalId,version:1}),/không còn|đã chốt/);
 await assert.rejects(()=>rpc(db,'no_match_action',[b,link.away_match,'state',{},null]),/quyền/);
 await asUser(db,owner);const w=await rpc(db,'no_app_snapshot',[a]);
 await assert.rejects(()=>rpc(db,'no_app_commit',[a,w.revision,randomUUID(),{matches:w.data.matches.map(m=>({...m,venue:'Tự đổi sân'}))}]),/Trận liên kết/);
});

test('amendment invalidates confirmations, leaves old linked matches until both agree; cancellation preserves ledger/history',async()=>{
 const offer=await publish(14),p=await propose(offer.offerId);await asUser(db,owner);await run(a,'confirm',{proposalId:p.proposalId,version:1});await asUser(db,outsider);await run(b,'confirm',{proposalId:p.proposalId,version:1});
 let snap=await state(b);const link=snap.links.find(x=>x.offer_id===offer.offerId),original=(await rpc(db,'no_app_snapshot',[b])).data.matches.find(x=>x.id===link.away_match);
 const terms={...snap.terms.find(x=>x.challenge_id===p.proposalId).conditions,venue:'Sân mới đã thống nhất'};
 await run(b,'terms',{proposalId:p.proposalId,version:1,conditions:terms});
 assert.equal((await rpc(db,'no_app_snapshot',[b])).data.matches.find(x=>x.id===link.away_match).venue,original.venue);
 await assert.rejects(()=>run(b,'confirm',{proposalId:p.proposalId,version:1}),/phiên bản mới/);
 await run(b,'confirm',{proposalId:p.proposalId,version:2});await asUser(db,owner);await run(a,'confirm',{proposalId:p.proposalId,version:2});
 assert.equal((await rpc(db,'no_app_snapshot',[a])).data.matches.find(x=>x.id===link.home_match).venue,terms.venue);
 await rpc(db,'no_match_action',[a,link.home_match,'cost',{total:1000,support:0,payerKind:'fund',confirmed:true,allocations:[{id:owner,amount:1000}],occurredAt:new Date().toISOString()},randomUUID()]);
 await run(a,'cancel',{proposalId:p.proposalId,reason:'Hai đội thống nhất hoãn'});
 for(const [team,actor] of [[a,owner],[b,outsider]]){await asUser(db,actor);const w=await rpc(db,'no_app_snapshot',[team]);assert.ok(w.data.matches.find(x=>x.sourceOffer===offer.offerId).cancelledAt);assert.equal(w.data.funds.transactions.length,team===a?1:0,'cancellation preserves the existing expense');assert.ok((await state(team)).links.find(x=>x.offer_id===offer.offerId).cancel_reason);}
});

test('independent post-match reports retain own results and flag disagreements without reputation claims',async()=>{
 const offer=await publish(55),p=await propose(offer.offerId);await asUser(db,owner);await run(a,'confirm',{proposalId:p.proposalId,version:1});await asUser(db,outsider);await run(b,'confirm',{proposalId:p.proposalId,version:1});
 const link=(await state(b)).links.find(x=>x.offer_id===offer.offerId);
 await assert.rejects(()=>run(b,'report',{proposalId:p.proposalId,home:3,away:1,played:true}),/kết thúc trận/);
 await db.exec('reset role');const kick=new Date(Date.now()-72e5).toISOString(),deadline=new Date(Date.now()-108e5).toISOString(),end=new Date(Date.now()-18e5).toISOString();
 await db.transaction(async tx=>{await tx.query("select set_config('no.mm_sync','yes',true)");for(const [team,mid] of [[a,link.home_match],[b,link.away_match]]){
 await tx.query("update no_app_workspaces set data=jsonb_set(data,'{matches}',(select jsonb_agg(case when m->>'id'=$2 then m||jsonb_build_object('datetime',$3::text,'deadline',$4::text,'endsAt',$5::text) else m end) from jsonb_array_elements(data->'matches') m)) where team_id=$1",[team,mid,kick,deadline,end]);await tx.query('update no_gov_matches set kickoff=$3,attendance_deadline=$4 where team_id=$1 and id=$2',[team,mid,kick,deadline]);}});
 for(const [team,actor,mid,home,away] of [[a,owner,link.home_match,2,1],[b,outsider,link.away_match,3,1]]){
 await asUser(db,actor);await rpc(db,'no_match_action',[team,mid,'finish',{home,away},randomUUID()]);await run(team,'report',{proposalId:p.proposalId,home,away,played:true});}
 let snap=await state(b);assert.equal(snap.reports.filter(x=>x.offer_id===offer.offerId).length,2);assert.equal((await rpc(db,'no_match_action',[b,link.away_match,'state',{},null])).record.score_home,3);
 await run(b,'report',{proposalId:p.proposalId,home:1,away:2,played:true});assert.equal((await rpc(db,'no_match_action',[b,link.away_match,'state',{},null])).record.score_home,3,'shared report must not overwrite the private match result');
 await assert.rejects(()=>run(b,'cancel',{proposalId:p.proposalId,reason:'Không hủy trận đã kết thúc'}),/kết thúc/);
});

test('expiry is checked in backend without scheduler; treasurer is not a representative',async()=>{
 const offer=await publish(18),p=await propose(offer.offerId);
 await db.exec('reset role');await db.query("update no_pro_offers set expires_at=clock_timestamp()-interval '1 minute' where id=$1",[offer.offerId]);await db.query("update no_mm_terms set conditions=jsonb_set(conditions,'{expiresAt}',to_jsonb((clock_timestamp()-interval '1 minute')::text)) where challenge_id=$1",[p.proposalId]);
 await asUser(db,owner);assert.equal((await state(a)).offers.find(o=>o.id===offer.offerId).status,'expired');assert.equal((await state(a)).proposals.find(x=>x.id===p.proposalId).status,'closed');await assert.rejects(()=>run(a,'confirm',{proposalId:p.proposalId,version:1}),/hết hạn/);
 await asUser(db,null);assert.ok(!(await state(null)).offers.some(o=>o.id===offer.offerId));
 await db.exec('reset role');await db.query("update no_gov_members set role='member',can_manage_funds=true where team_id=$1 and user_id=$2",[b,outsider]);
 await asUser(db,outsider);assert.equal((await rpc(db,'no_fund_action',[b,'state',{},null])).canManage,true);await assert.rejects(()=>run(b,'message',{proposalId:p.proposalId,body:'Không còn quyền'}),/quản lý trận/);assert.equal((await state(b)).messages.length,0);
 await db.exec('reset role');await db.query("update no_gov_members set role='owner' where team_id=$1 and user_id=$2",[b,outsider]);
});

test('Pro is server-enforced; protected admin grant, expiry retains assets and free matchmaking',async()=>{
 await asUser(db,owner);await assert.rejects(()=>run(a,'asset_save',{kind:'filters',name:'Sân 7',data:{format:7}}),/Pro còn hiệu lực/);
 await assert.rejects(()=>rpc(db,'no_mm_admin_entitlement',[a,new Date(Date.now()+864e5).toISOString(),'test']),/permission denied/);
 await db.exec('reset role');await rpc(db,'no_mm_admin_entitlement',[a,new Date(Date.now()+864e5).toISOString(),'isolated-test']);
 await asUser(db,owner);await run(a,'asset_save',{kind:'filters',name:'Sân 7',data:{format:7,secret:'must not persist'}});
 let snap=await state(a);assert.equal(snap.assets[0].data.secret,undefined);assert.equal(snap.entitlement.enabled,true);
 await db.exec('reset role');await db.query("update no_team_entitlements set status='expired' where team_id=$1",[a]);
 await asUser(db,owner);snap=await state(a);assert.equal(snap.entitlement.enabled,false);assert.ok(snap.assets.length);
 await assert.rejects(()=>run(a,'asset_save',{kind:'filters',name:'Mới',data:{format:5}}),/Pro còn hiệu lực/);
 assert.ok((await publish(25)).offerId);
});

test('saved templates clear dates, private opponents never auto-accept, and expired Pro blocks use',async()=>{
 const offer=await publish(40);await db.exec('reset role');await rpc(db,'no_mm_admin_entitlement',[a,new Date(Date.now()+864e5).toISOString(),'isolated-test']);
 await asUser(db,owner);await run(a,'asset_save',{kind:'templates',name:'Sân 7 thường đá',offerId:offer.offerId});
 await run(a,'asset_save',{kind:'opponents',name:'FC Khách',opponentId:b,note:'Ghi chú chỉ ban quản lý được thấy'});
 let snap=await state(a);const template=snap.assets.find(x=>x.kind==='templates'),familiar=snap.assets.find(x=>x.kind==='opponents');
 assert.equal(template.data.kickoff,undefined);assert.equal(template.data.expiresAt,undefined);assert.equal((await run(a,'asset_use',{assetId:template.id})).asset.id,template.id);
 await asUser(db,member);assert.ok(!(await state(a)).assets.some(x=>x.kind==='opponents'));await assert.rejects(()=>run(a,'asset_use',{assetId:familiar.id}),/Pro còn hiệu lực/);
 await asUser(db,owner);const invitation=await run(a,'publish',{conditions:conditions(45),familiarId:familiar.id});
 await asUser(db,outsider);snap=await state(b);assert.equal(snap.proposals.filter(x=>x.offer_id===invitation.offerId).length,0);assert.ok((await rpc(db,'no_app_snapshot',[b])).data.notices.some(n=>n.offerId===invitation.offerId));
 await db.exec('reset role');await db.query("update no_team_entitlements set status='expired' where team_id=$1",[a]);await asUser(db,owner);
 await assert.rejects(()=>run(a,'asset_use',{assetId:template.id}),/Pro còn hiệu lực/);
 await assert.rejects(()=>run(a,'publish',{conditions:conditions(47),templateId:template.id}),/Pro còn hiệu lực/);
});

test('remaining team can cancel by offer ID and keep history when the posting opponent dissolves',async()=>{
 const host='mm-dissolved-opponent';await asUser(db,owner);await rpc(db,'no_app_create_team',[host,'Đối thủ dừng hoạt động',{}]);
 const offer=await run(host,'publish',{conditions:conditions(90)}),openOffer=await run(host,'publish',{conditions:conditions(95)}),p=await propose(offer.offerId);
 await asUser(db,owner);await run(host,'confirm',{proposalId:p.proposalId,version:1});await asUser(db,outsider);await run(b,'confirm',{proposalId:p.proposalId,version:1});
 await db.exec('reset role');await db.query('update no_gov_teams set dissolved_at=clock_timestamp() where id=$1',[host]);
 await asUser(db,outsider);assert.ok((await state(b)).offers.some(x=>x.id===offer.offerId),'private history survives opponent dissolution');
 await assert.rejects(()=>run(b,'propose',{offerId:openOffer.offerId}),/không còn hoạt động/);
 await run(b,'cancel',{offerId:offer.offerId,reason:'Đội đối thủ đã dừng hoạt động'});
 assert.ok((await state(b)).links.find(x=>x.offer_id===offer.offerId).cancelled_at);
});

