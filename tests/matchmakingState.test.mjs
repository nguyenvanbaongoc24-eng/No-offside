import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import renderer,{act} from 'react-test-renderer';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
const listeners=new Map();
const add=(name,fn)=>{if(!listeners.has(name))listeners.set(name,new Set());listeners.get(name).add(fn);};
const remove=(name,fn)=>listeners.get(name)?.delete(fn);
globalThis.window={location:{origin:'http://test.local'},addEventListener:add,removeEventListener:remove,dispatchEvent(){}};
globalThis.document={hidden:false,addEventListener:add,removeEventListener:remove};
const compiled=await build({stdin:{contents:"export {useMatchmaking} from './src/hooks/useMatchmaking';",resolveDir:process.cwd(),loader:'js'},bundle:true,format:'cjs',platform:'node',write:false,external:['react'],plugins:[{name:'test-only-client',setup(b){b.onResolve({filter:/lib\/supabase$/},()=>({path:'test-client',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export const supabase=null;'}));}}]});
const mod={exports:{}};new Function('require','module','exports',compiled.outputFiles[0].text)(createRequire(import.meta.url),mod,mod.exports);
let current;function Harness(props){current=mod.exports.useMatchmaking(props);return null;}
const reply=id=>({ok:true,status:200,headers:{get:()=>null},json:async()=>({success:true,offers:[],messages:[{id,body:'Private team '+id}]})});
test('team/account switch discards stale replies and cleans subscriptions, foreground/online listeners and timers',async()=>{
 let tree,release;
 globalThis.fetch=async(url,opts)=>{const body=JSON.parse(opts.body);if(body.teamId==='a')return new Promise(resolve=>{release=resolve;});return reply(body.teamId);};
 await act(async()=>{tree=renderer.create(React.createElement(Harness,{teamId:'a',accountId:'user-a',token:'token-a'}));});
 await act(async()=>{tree.update(React.createElement(Harness,{teamId:'b',accountId:'user-b',token:'token-b'}));});
 assert.equal(current.data.messages[0].id,'b');
 await act(async()=>{release(reply('a'));});assert.equal(current.data.messages[0].id,'b');
 globalThis.fetch=async()=>({ok:false,status:403,headers:{get:()=>null},json:async()=>({error:'Membership revoked'})});
 await act(async()=>{await current.refresh();});assert.equal(current.data.messages.length,0,'permission failure clears cached private content');
 assert.ok([...listeners.values()].some(set=>set.size));
 await act(async()=>tree.unmount());assert.equal([...listeners.values()].reduce((n,set)=>n+set.size,0),0);
});
