import test from 'node:test';import assert from 'node:assert/strict';import React from 'react';import renderer,{act} from 'react-test-renderer';import {build} from 'esbuild';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url),root=fileURLToPath(new URL('../',import.meta.url));
const bundle=await build({absWorkingDir:root,stdin:{resolveDir:root,loader:'js',contents:"export {useAppVersion} from './src/hooks/useAppVersion.js';export {beginPendingWrite,pendingWriteCount} from './src/lib/pendingWrites.js';"},bundle:true,platform:'node',format:'cjs',write:false,external:['react'],define:{__APP_VERSION__:JSON.stringify('version-a')}});
const compiled={exports:{}};new Function('require','module','exports',bundle.outputFiles[0].text)(require,compiled,compiled.exports);const {useAppVersion,beginPendingWrite,pendingWriteCount}=compiled.exports;
class Surface extends EventTarget{listeners=new Map();addEventListener(type,callback,options){super.addEventListener(type,callback,options);this.listeners.set(callback,type);}removeEventListener(type,callback,options){super.removeEventListener(type,callback,options);this.listeners.delete(callback);}}
test('new version is offered, never forced; active writes, dirty forms and failed draft storage prevent reload',async()=>{
 const win=new Surface(),doc=new Surface();let reloads=0,cacheDeletes=0;win.location={reload(){reloads++;}};doc.visibilityState='visible';
 globalThis.window=win;globalThis.document=doc;globalThis.CustomEvent=class extends Event{constructor(type,options={}){super(type,options);}};Object.defineProperty(globalThis,'navigator',{configurable:true,value:{onLine:true}});globalThis.caches={delete(){cacheDeletes++;}};globalThis.fetch=async()=>({ok:true,json:async()=>({version:'version-b'})});
 let current,tree;function Harness(){current=useAppVersion();return null;}
 await act(async()=>{tree=renderer.create(React.createElement(Harness));await Promise.resolve();});assert.equal(current.availableVersion,'version-b');assert.equal(reloads,0);
 const finish=beginPendingWrite();assert.equal(pendingWriteCount(),1);await act(async()=>assert.equal(await current.applyUpdate(),false));assert.match(current.updateError,/Đang lưu/);finish();assert.equal(pendingWriteCount(),0);
 const form={isConnected:true};doc.closest=()=>form;act(()=>doc.dispatchEvent(new Event('input')));await act(async()=>assert.equal(await current.applyUpdate(),false));assert.match(current.updateError,/biểu mẫu/);form.isConnected=false;
 const fail=event=>event.preventDefault();win.addEventListener('save-active-drafts',fail);await act(async()=>assert.equal(await current.applyUpdate(),false));assert.match(current.updateError,/bản nháp/);assert.equal(reloads,0);win.removeEventListener('save-active-drafts',fail);
 await act(async()=>assert.equal(await current.applyUpdate(),true));assert.equal(reloads,1);assert.equal(cacheDeletes,0);
 await act(async()=>tree.unmount());assert.equal(win.listeners.size,0);assert.equal(doc.listeners.size,0);
});
test('finishing one concurrent write cannot clear another write barrier',()=>{const endA=beginPendingWrite(),endB=beginPendingWrite();assert.equal(pendingWriteCount(),2);endA();assert.equal(pendingWriteCount(),1);assert.equal(window.__no_offside_busy_saving,true);endA();assert.equal(pendingWriteCount(),1);endB();assert.equal(pendingWriteCount(),0);assert.equal(window.__no_offside_busy_saving,false);});
test('recently applied version or dismissed version suppresses repeated update button prompts',async()=>{
 const win=new Surface(),doc=new Surface();win.location={reload(){}};doc.visibilityState='visible';
 globalThis.window=win;globalThis.document=doc;
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{onLine:true}});
 const storage=new Map();globalThis.sessionStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)};
 globalThis.fetch=async()=>({ok:true,json:async()=>({version:'version-b'})});
 let current,tree;function Harness(){current=useAppVersion();return null;}
 await act(async()=>{tree=renderer.create(React.createElement(Harness));await Promise.resolve();});
 assert.equal(current.availableVersion,'version-b');
 // Dismissing suppresses re-prompt
 act(()=>current.dismissUpdate());
 assert.equal(current.availableVersion,null);
 await act(async()=>{await current.checkVersion();});
 assert.equal(current.availableVersion,null);
 // Clearing dismissed and simulating recent apply:
 storage.delete('no_offside_dismissed_version');
 storage.set('no_offside_applied_version','version-b');
 storage.set('no_offside_applied_at',String(Date.now()));
 await act(async()=>{await current.checkVersion();});
 assert.equal(current.availableVersion,null);
 // If server reports current version matches, applied marker is cleared
 globalThis.fetch=async()=>({ok:true,json:async()=>({version:'version-a'})});
 await act(async()=>{await current.checkVersion();});
 assert.equal(current.availableVersion,null);
 assert.equal(storage.has('no_offside_applied_version'),false);
 await act(async()=>tree.unmount());
});
test('applyUpdate waits for installing worker or unregisters stale worker when no waiting worker exists',async()=>{
 const win=new Surface(),doc=new Surface();let reloads=0,unregistered=false,skipWaitingSent=false;
 win.location={reload(){reloads++;}};doc.visibilityState='visible';
 globalThis.window=win;globalThis.document=doc;
 const storage=new Map();globalThis.sessionStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)};
 globalThis.fetch=async()=>({ok:true,json:async()=>({version:'version-c'})});
 const mockWorker=new Surface();mockWorker.state='installing';
 const mockReg={
   installing:mockWorker,
   waiting:null,
   update:async()=>{},
   unregister:async()=>{unregistered=true;}
 };
 const swSurface=new Surface();
 Object.defineProperty(globalThis,'navigator',{
   configurable:true,
   value:{
     onLine:true,
     serviceWorker:Object.assign(swSurface,{
       getRegistration:async()=>mockReg,
       controller:{}
     })
   }
 });
 let current,tree;function Harness(){current=useAppVersion();return null;}
 await act(async()=>{tree=renderer.create(React.createElement(Harness));await Promise.resolve();});
 assert.equal(current.availableVersion,'version-c');
 // Trigger applyUpdate while worker is installing: transition worker to installed
 const applyPromise=current.applyUpdate();
 setTimeout(()=>{
   mockWorker.state='installed';
   mockReg.waiting={
     postMessage:(msg)=>{if(msg?.type==='SKIP_WAITING')skipWaitingSent=true;}
   };
   mockWorker.dispatchEvent(new Event('statechange'));
   setTimeout(()=>swSurface.dispatchEvent(new Event('controllerchange')),10);
 },20);
 await act(async()=>{assert.equal(await applyPromise,true);});
 assert.equal(skipWaitingSent,true);
 assert.equal(reloads,1);
 // Next test: stale worker without waiting worker calls unregister
 mockReg.installing=null;mockReg.waiting=null;reloads=0;storage.clear();
 globalThis.fetch=async()=>({ok:true,json:async()=>({version:'version-d'})});
 await act(async()=>{await current.checkVersion();});
 assert.equal(current.availableVersion,'version-d');
 await act(async()=>{assert.equal(await current.applyUpdate(),true);});
 assert.equal(unregistered,true);
 assert.equal(reloads,1);
 await act(async()=>tree.unmount());
});

