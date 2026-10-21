import test from 'node:test';
import assert from 'node:assert/strict';
import {blankConditions,conditionsDraft,normalizeConditions,matchFilter,overlappingItems,sharedResult} from '../src/lib/matchmaking.js';
import {setTestAdminClient} from '../api/_storageHelper.js';
import handler from '../api/sync.js';
const response=()=>({statusCode:0,headers:{},setHeader(k,v){this.headers[k]=v;},status(code){this.statusCode=code;return this;},json(body){this.body=body;return this;}});
test('midnight, fresh template dates, honest filters and perspective-aware shared results',()=>{
 const input={...blankConditions(),kickoff:'2026-11-01T23:30',endsAt:'2026-11-02T01:00',expiresAt:'2026-11-01T20:00',district:'Thủ Đức'};
 const t=normalizeConditions(input,Date.parse('2026-10-20'));assert.equal(t.kickoff,'2026-11-01T16:30:00.000Z');assert.equal(t.endsAt,'2026-11-01T18:00:00.000Z');assert.equal(t.cost,null);
 assert.equal(conditionsDraft(t,true).kickoff,'');assert.throws(()=>normalizeConditions({...input,endsAt:'2026-11-01T22:00'},0),/kết thúc/);
 const offer={id:'x',teamName:'Đội',status:'open',kickoff:t.kickoff,endsAt:t.endsAt,format:7,district:'Thủ Đức',level:'regular',conditions:t};
 assert.equal(matchFilter(offer,{district:'THỦ',day:'2026-11-01',from:'23:00',format:'7'}),true);assert.equal(matchFilter(offer,{maxCost:100}),false,'unknown cost never becomes fake zero');
 assert.equal(overlappingItems(t,[],[{id:'m',datetime:t.kickoff,status:'upcoming'}]).length,1);assert.equal(overlappingItems(t,[],[{id:'m',datetime:t.kickoff,status:'completed'}]).length,0);
 assert.match(sharedResult([{offer_id:'x',played:true,home:2,away:1}],'x'),/Chờ hai/);
 assert.match(sharedResult([{offer_id:'x',played:true,home:2,away:1},{offer_id:'x',played:true,home:1,away:2}],'x'),/Hai đội đã/);
 assert.match(sharedResult([{offer_id:'x',played:true,home:2,away:1},{offer_id:'x',played:true,home:2,away:1}],'x'),/chưa thống nhất/);
});
test('API public discovery uses anon-scoped client; private actions retain caller JWT and validation',async()=>{
 const calls=[];setTestAdminClient({userClient:req=>({auth:{getUser:async()=>({data:{user:{id:'caller'}}})},rpc:async(name,args)=>{calls.push({name,args,authorization:req.headers.authorization});return {data:{success:true,offers:[]}};}})});
 let res=response();await handler({method:'GET',url:'/api/sync?public=matchmaking',headers:{}},res);assert.equal(res.statusCode,200);assert.equal(calls[0].name,'no_mm_state');assert.equal(calls[0].args.p_team,null);assert.equal(calls[0].authorization,undefined);
 res=response();await handler({method:'POST',headers:{},body:{action:'matchmaking'}},res);assert.equal(res.statusCode,401);
 res=response();await handler({method:'POST',headers:{authorization:'Bearer caller-jwt'},body:{action:'matchmaking',teamId:'team',matchmakingAction:'confirm',payload:{version:3},requestKey:'retry-key'}},res);
 assert.equal(res.statusCode,200);assert.equal(calls.at(-1).name,'no_mm_action');assert.equal(calls.at(-1).authorization,'Bearer caller-jwt');assert.equal(calls.at(-1).args.p_payload.version,3);assert.match(res.headers['Cache-Control'],/no-store/);
});
