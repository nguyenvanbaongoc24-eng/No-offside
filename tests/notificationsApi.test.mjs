import test from 'node:test';import assert from 'node:assert/strict';
import handler from '../api/notifications.js';
import {setTestAdminClient} from '../api/_storageHelper.js';
const response=()=>({statusCode:0,headers:{},setHeader(k,v){this.headers[k]=v;},status(code){this.statusCode=code;return this;},json(body){this.body=body;return this;},end(){return this;}});
test('counts and worker refuse unauthenticated callers; malformed bodies are rejected before DB',async()=>{
 for(const url of ['/api/notifications','/api/notifications?worker=1']){const res=response();await handler({url,method:'GET',headers:{}},res);assert.equal(res.statusCode,401);assert.match(res.headers['Cache-Control'],/no-store/);}
 const res=response();await handler({url:'/api/notifications',method:'POST',headers:{},body:'{'},res);assert.equal(res.statusCode,400);
});
test('public configuration exposes only the public VAPID key',async()=>{
 process.env.VAPID_PUBLIC_KEY='public-test-key';process.env.VAPID_PRIVATE_KEY='private-test-key';process.env.VAPID_SUBJECT='https://example.test';
 const res=response();await handler({url:'/api/notifications?config=1',method:'GET',headers:{}},res);assert.equal(res.statusCode,200);assert.deepEqual(res.body,{configured:true,publicKey:'public-test-key'});assert.doesNotMatch(JSON.stringify(res.body),/private-test-key/);
 delete process.env.VAPID_PUBLIC_KEY;delete process.env.VAPID_PRIVATE_KEY;delete process.env.VAPID_SUBJECT;
});
test('detach passes only installation proof to capability RPC, never a supplied user identity',async()=>{
 let parameters;setTestAdminClient({userClient:()=>({rpc:async(name,args)=>{parameters={name,args};return {data:{success:true}};}})});
 const res=response(),id='00000000-0000-4000-8000-000000000009';await handler({url:'/api/notifications',method:'POST',headers:{},body:{action:'detach',installationId:id,installationSecret:'x'.repeat(43),userId:'other-user'}},res);assert.equal(res.statusCode,200);assert.deepEqual(parameters,{name:'no_push_detach',args:{p_id:id,p_secret:'x'.repeat(43)}});setTestAdminClient(null);
});
