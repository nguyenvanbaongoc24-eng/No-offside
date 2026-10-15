import test from 'node:test';
import assert from 'node:assert/strict';
import {getAdminClient,setTestAdminClient,readJson} from '../api/_storageHelper.js';
import inviteHandler from '../api/invites.js';
import syncHandler from '../api/sync.js';
import teamsHandler from '../api/teams.js';
import chatHandler from '../api/chat.js';
const userId='00000000-0000-4000-8000-000000000001';
function response(){return {statusCode:0,headers:{},setHeader(k,v){this.headers[k]=v;},status(code){this.statusCode=code;return this;},json(value){this.body=value;return this;},end(){return this;}};}
test('missing server credentials fail closed, with no mock identity or memory storage',()=>{
 const saved={...process.env};delete process.env.SUPABASE_SECRET_KEY;delete process.env.SUPABASE_SERVICE_ROLE_KEY;delete process.env.SUPABASE_URL;delete process.env.VITE_SUPABASE_URL;
 try{assert.throws(()=>getAdminClient(),/chưa cấu hình/);}finally{Object.assign(process.env,saved);}
});
test('private APIs return 401 before accessing configuration when no bearer is present',async()=>{
 for(const handler of [syncHandler,teamsHandler,chatHandler]){const res=response();await handler({method:'GET',headers:{},url:'/api?teamId=other'},res);assert.equal(res.statusCode,401);assert.match(res.headers['Cache-Control'],/no-store/);}
});
test('Storage outages do not become empty successful datasets',async()=>{
 const client={storage:{from:()=>({download:async()=>({data:null,error:{statusCode:503,message:'offline'}})})}};
 await assert.rejects(()=>readJson(client,'anything',[]),/Không đọc được/);
 const missing={storage:{from:()=>({download:async()=>({data:null,error:{statusCode:404}})})}};assert.deepEqual(await readJson(missing,'anything',[]),[]);
});
test('invite mutations require provider identity; publish/sync cannot rewrite teams',async()=>{
 let calls=[];
 setTestAdminClient({userClient:()=>({auth:{getUser:async token=>token==='verified-test-token' ? {data:{user:{id:userId}}} : {error:Error('invalid')}},rpc:async(name,args)=>{calls.push([name,args]);return {data:{success:true,valid:false,error:'Revoked'}};}})});
 for(const action of ['sync','join','revoke']){const res=response();await inviteHandler({method:'POST',headers:{},body:{action,team:{ownerId:userId}}},res);assert.equal(res.statusCode,401);}
 let res=response();await inviteHandler({method:'POST',headers:{authorization:'Bearer verified-test-token'},body:{action:'sync',team:{ownerId:userId}}},res);assert.equal(res.statusCode,400);assert.equal(calls.length,0);
 res=response();await inviteHandler({method:'GET',headers:{},url:'/api/invites?code=ABCDEF'},res);assert.equal(res.statusCode,404);assert.equal(res.body.valid,false);assert.equal(calls[0][0],'no_gov_get_invite');
 setTestAdminClient(null);
});
test('old whole-workspace sync and privilege fields are rejected before any write',async()=>{
 let calls=0;setTestAdminClient({userClient:()=>({auth:{getUser:async()=>({data:{user:{id:userId}}})},rpc:async()=>{calls++;return {data:{success:true}};}})});
 const res=response();await syncHandler({method:'POST',headers:{authorization:'Bearer verified-test-token'},body:{action:'sync-data',teamId:'team-a',data:{funds:{}},teamSettingsUpdates:{ownerId:userId}}},res);assert.equal(res.statusCode,400);assert.equal(calls,0);setTestAdminClient(null);
});
test('account lookup uses canonical RPCs, returns no fake availability on outage, and omits private identity fields',async()=>{
 const availability=(await import('../api/check-availability.js')).default,resolve=(await import('../api/resolve-username.js')).default;
 let fault=true,calls=[];
 setTestAdminClient({userClient:()=>({rpc:async(name,args)=>{calls.push([name,args]);return fault?{error:{code:'PGRST202'}}:{data:name==='no_auth_check_availability'?{usernameAvailable:false,emailAvailable:true}:{email:'player@example.test',id:userId,name:'Private profile'}};}})});
 try{
  let res=response();await availability({method:'POST',headers:{},body:{username:'player'}},res);assert.equal(res.statusCode,503);assert.equal(res.body.usernameAvailable,undefined);
  fault=false;res=response();await availability({method:'POST',headers:{},body:{username:'Player'}},res);assert.equal(res.body.usernameAvailable,false);assert.equal(calls.at(-1)[1].p_username,'player');
  res=response();await resolve({method:'POST',headers:{},body:{username:'Player'}},res);assert.deepEqual(res.body,{email:'player@example.test'});assert.match(res.headers['Cache-Control'],/no-store/);
 }finally{setTestAdminClient(null);}
});
