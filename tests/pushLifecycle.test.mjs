import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {highestVisibleMessage} from '../src/hooks/useViewedMessages.js';
import {platformPushState,safePushTarget,disconnectPushDevice} from '../src/lib/pushDevice.js';
test('only a visible rendered message can advance a read boundary',()=>{
 const node=(sequence,top,bottom)=>({dataset:{messageSequence:sequence,messageId:'message-'+sequence},getBoundingClientRect:()=>({top,bottom,height:bottom-top})});
 const list={getBoundingClientRect:()=>({top:100,bottom:600}),querySelectorAll:()=>[node('1',-100,0),node('2',110,180),node('3',500,580),node('4',590,660),node('5',700,800)]};
 assert.deepEqual(highestVisibleMessage(list,844),{id:'message-3',sequence:'3'});
 assert.equal(highestVisibleMessage({...list,querySelectorAll:()=>[node('100',700,800)]},844),null);
});
test('platform detection guides iOS Home Screen and safely falls back without permission prompts',()=>{
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{userAgent:'iPhone',platform:'iPhone',serviceWorker:{}}});
 globalThis.window={location:{origin:'https://no-offside.vercel.app'},isSecureContext:true,matchMedia:()=>({matches:false})};
 globalThis.Notification={permission:'denied',requestPermission(){throw Error('Must not prompt');}};
 assert.equal(platformPushState(),'install');window.matchMedia=()=>({matches:true});window.PushManager=function(){};window.Notification=Notification;assert.equal(platformPushState(),'blocked');Notification.permission='default';assert.equal(platformPushState(),'supported');delete window.PushManager;assert.equal(platformPushState(),'unsupported');
 assert.equal(safePushTarget('https://evil.test/?team=ok&view=chat'),null);assert.equal(safePushTarget('/?team=team-a&view=admin'),null);assert.deepEqual(safePushTarget('/?team=team-a&view=chat&for=user'),{teamId:'team-a',view:'chat',accountId:'user'});
});
test('device logout still detaches backend when browser unsubscribe fails',async()=>{
 let detached=false;const storage=new Map();globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
 navigator.serviceWorker={getRegistration:async()=>({pushManager:{getSubscription:async()=>({unsubscribe:async()=>{throw Error('offline');}})}})};
 globalThis.fetch=async(url,options)=>{detached=JSON.parse(options.body).action==='detach';return {ok:true,json:async()=>({success:true}),text:async()=>'{"success":true}'};};
 await assert.rejects(()=>disconnectPushDevice(),/offline/);assert.equal(detached,true);
});
test('service worker protects old-account content, reconciles badge timestamps and validates click destinations',async()=>{
 const handlers={},shown=[],opened=[],messages=[],badges=[];const state={session:{accountId:'current'},badge:{accountId:'current',at:'2026-10-15T10:01:00Z'}};
 const context=vm.createContext({URL,console,self:{location:{origin:'https://no-offside.vercel.app'},addEventListener:(name,fn)=>handlers[name]=fn,navigator:{setAppBadge:async count=>badges.push(count)},registration:{showNotification:async(title,options)=>shown.push({title,...options})},clients:{matchAll:async()=>[],openWindow:async url=>opened.push(url)}}});
 vm.runInContext(await readFile(new URL('../public/push-worker.js',import.meta.url),'utf8'),context);
 context.pushRead=async key=>state[key];context.pushStore=async fn=>fn({put:(value,key)=>state[key]=value});
 const push=async data=>{let task;handlers.push({data:{json:()=>data},waitUntil:p=>task=p});await task;};
 await push({accountId:'old',title:'Secret team',body:'Secret text',unreadTotal:4,observedAt:'2026-10-15T10:02:00Z',url:'/?team=old-team&view=chat'});assert.equal(shown[0].title,'No Offside');assert.doesNotMatch(shown[0].body,/Secret/);assert.equal(badges.length,0);
 await push({accountId:'current',title:'FC',body:'Hello',unreadTotal:8,observedAt:'2026-10-15T10:00:00Z'});assert.equal(badges.length,0);
 await push({accountId:'current',title:'FC',body:'Hello',unreadTotal:9,observedAt:'2026-10-15T10:02:00Z',url:'https://evil.test/'});assert.deepEqual(badges,[9]);assert.equal(shown.at(-1).data.url,'/');
 let task;handlers.notificationclick({notification:{data:{accountId:'old',url:'/?team=old-team&view=chat'},close(){}},waitUntil:p=>task=p});await task;assert.deepEqual(opened,['/']);
 context.self.clients.matchAll=async()=>[{url:'https://no-offside.vercel.app/',focus:async()=>{},postMessage:value=>messages.push(value)}];
 handlers.notificationclick({notification:{data:{accountId:'current',url:'/?team=test-team&view=chat'},close(){}},waitUntil:p=>task=p});await task;assert.equal(messages[0].type,'NO_OFFSIDE_PUSH_OPEN');assert.match(messages[0].url,/team=test-team/);
});
