import test from 'node:test';import assert from 'node:assert/strict';import {watchTeamUpdates} from '../src/lib/teamUpdates.js';
test('team signal includes first INSERT, reconnect and foreground resync, with complete cleanup',async()=>{
 const win=new Map(),doc=new Map();globalThis.window={addEventListener:(n,f)=>win.set(n,f),removeEventListener:n=>win.delete(n)};globalThis.document={hidden:false,addEventListener:(n,f)=>doc.set(n,f),removeEventListener:n=>doc.delete(n)};
 let signal,status,filter,removed=0,count=0;const ch={on(_type,f,callback){filter=f;signal=callback;return this;},subscribe(callback){status=callback;return this;}};const client={channel:()=>ch,removeChannel:()=>removed++};
 const stop=watchTeamUpdates(client,'member:team-a','team-a',()=>{count++;});
 try{assert.equal(filter.event,'*');assert.equal(filter.filter,'team_id=eq.team-a');signal({eventType:'INSERT'});await Promise.resolve();assert.equal(count,1);document.hidden=true;signal();await Promise.resolve();assert.equal(count,1);document.hidden=false;status('SUBSCRIBED');await Promise.resolve();assert.equal(count,2);win.get('online')();doc.get('visibilitychange')();await Promise.resolve();assert.equal(count,4);}finally{stop();}
 signal();status('SUBSCRIBED');await Promise.resolve();assert.equal(count,4);assert.equal(removed,1);assert.equal(win.size,0);assert.equal(doc.size,0);delete globalThis.window;delete globalThis.document;
});


test('fund, governance and detail share one subscription and release it only after the last consumer',async()=>{
 const win=new Map(),doc=new Map();globalThis.window={addEventListener:(n,f)=>win.set(n,f),removeEventListener:n=>win.delete(n)};globalThis.document={hidden:false,addEventListener:(n,f)=>doc.set(n,f),removeEventListener:n=>doc.delete(n)};
 let channels=0,removed=0,signal,a=0,b=0;const channel={on(type,filter,callback){signal=callback;return this;},subscribe(){return this;}};const client={channel(){channels++;return channel;},removeChannel(){removed++;}};
 const first=watchTeamUpdates(client,'fund:account-a','same-team',()=>a++),second=watchTeamUpdates(client,'detail:account-a','same-team',()=>b++);
 try{assert.equal(channels,1);signal();await Promise.resolve();assert.equal(a,1);assert.equal(b,1);first();assert.equal(removed,0);signal();await Promise.resolve();assert.equal(a,1);assert.equal(b,2);second();assert.equal(removed,1);assert.equal(win.size,0);assert.equal(doc.size,0);}finally{first();second();delete globalThis.window;delete globalThis.document;}
});
