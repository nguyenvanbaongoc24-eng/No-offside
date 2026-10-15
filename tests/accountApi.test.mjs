import test from 'node:test';import assert from 'node:assert/strict';
import handler from '../api/account.js';import {setTestAdminClient} from '../api/_storageHelper.js';
const res=()=>({setHeader(){},status(n){this.code=n;return this;},json(body){this.body=body;return this;}});
const request=body=>({method:'POST',headers:{authorization:'Bearer fixture-token'},body});
test('password change authenticates caller, verifies old password and never uses a supplied email/user id',async()=>{
 let updates=0,signedOut=0,identity,verifiedId='caller';
 const client={auth:{getUser:async()=>({data:{user:{id:'caller',email:'caller@example.test'}}}),signInWithPassword:async input=>{identity=input.email;return {data:{user:{id:verifiedId}}};},updateUser:async()=>{updates++;return {data:{user:{id:'caller'}}};},signOut:async options=>{assert.equal(options.scope,'local');signedOut++;}}};setTestAdminClient({userClient:()=>client});
 const missing=res();await handler({method:'POST',headers:{},body:{}},missing);assert.equal(missing.code,401);
 const bad=res();await handler(request({action:'password',oldPassword:'fixture-old',password:'123456\n'}),bad);assert.equal(bad.code,400);assert.equal(updates,0);
 verifiedId='other';const wrong=res();await handler(request({action:'password',oldPassword:'fixture-old',password:'654321'}),wrong);assert.equal(wrong.code,400);assert.equal(updates,0);
 verifiedId='caller';const ok=res();await handler(request({action:'password',oldPassword:'fixture-old',password:'654321',email:'attacker@example.test',userId:'other'}),ok);assert.equal(ok.code,200);assert.equal(updates,1);assert.equal(identity,'caller@example.test');assert.equal(signedOut,1);setTestAdminClient(null);
});
