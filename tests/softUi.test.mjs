import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import renderer,{act} from 'react-test-renderer';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import {birthdaysToday,latestAnnouncements} from '../src/lib/announcements.js';

test('welcome uses the latest two real announcements without changing their source',()=>{
 const notices=[{id:'old',title:'Cũ',createdAt:'2026-10-01'},{id:'blank'},{id:'new',content:'Mới',createdAt:'2026-10-15'},{id:'second',title:'Gần đây',createdAt:'2026-10-14'}];
 assert.deepEqual(latestAnnouncements(notices).map(n=>n.id),['new','second']);assert.equal(notices[0].id,'old');
 assert.deepEqual(latestAnnouncements([{title:'Mới nhất'},{title:'Trước đó'},{title:'Cũ hơn'}]).map(n=>n.title),['Mới nhất','Trước đó']);
});
test('birthday follows the team timezone and excludes removed members',()=>{
 const members=[{id:1,birthday:'1999-10-16'},{id:2,birthday:'1999-10-15'},{id:3,birthday:'1999-10-16',membershipStatus:'removed'},{id:4,birthday:''}];
 assert.deepEqual(birthdaysToday(members,'Asia/Ho_Chi_Minh',new Date('2026-10-15T18:00:00Z')).map(m=>m.id),[1]);
 assert.deepEqual(birthdaysToday(members,'America/New_York',new Date('2026-10-15T18:00:00Z')).map(m=>m.id),[2]);
});
const result=await build({stdin:{loader:'jsx',resolveDir:process.cwd(),contents:"export {default as Welcome} from './src/components/WelcomeAnnouncementModal';export {default as Quick} from './src/components/QuickActions';"},bundle:true,platform:'node',format:'cjs',write:false,external:['react'],plugins:[{name:'renderer-host',setup(b){b.onResolve({filter:/^react-dom$/},()=>({path:'portal',namespace:'fixture'}));b.onLoad({filter:/portal/,namespace:'fixture'},()=>({contents:'export const createPortal=children=>children;'}));b.onResolve({filter:/^framer-motion$/},()=>({path:'motion',namespace:'fixture'}));b.onLoad({filter:/motion/,namespace:'fixture'},()=>({contents:`import React from 'react';export const useReducedMotion=()=>true;export const AnimatePresence=({children})=>children;export const motion=new Proxy({},{get:(_,tag)=>React.forwardRef(({initial,animate,exit,transition,drag,dragConstraints,dragElastic,onDragEnd,whileTap,...props},ref)=>React.createElement(tag,{...props,ref}))});`}));}}]});
const mod={exports:{}};new Function('require','module','exports',result.outputFiles[0].text)(createRequire(import.meta.url),mod,mod.exports);
const {Welcome,Quick}=mod.exports;
const store=new Map();globalThis.sessionStorage={getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)};globalThis.document={body:{}};globalThis.window={addEventListener(){},removeEventListener(){}};
test('welcome closes after five seconds and respects only the checked session opt-out',()=>{
 const original=globalThis.setTimeout,clear=globalThis.clearTimeout;let timeout,cleaned=false;
 globalThis.setTimeout=(fn,ms)=>{if(ms===5000){timeout=fn;return 42;}return original(fn,ms);};globalThis.clearTimeout=id=>{if(id===42)cleaned=true;else clear(id);};
 let tree;try{
 act(()=>{tree=renderer.create(React.createElement(Welcome,{accountId:'test',notices:[]}));});assert.ok(timeout);assert.equal(tree.root.findAll(node=>typeof node.type==='string' && node.props.role==='dialog').length,1);
 act(()=>tree.root.findByType('input').props.onChange({target:{checked:true}}));act(()=>timeout());assert.equal(store.get('no_offside_welcome_hidden_test'),'true');act(()=>tree.unmount());assert.equal(cleaned,true);
 act(()=>{tree=renderer.create(React.createElement(Welcome,{accountId:'test'}));});assert.equal(tree.root.findAll(node=>typeof node.type==='string' && node.props.role==='dialog').length,0);act(()=>tree.unmount());
 act(()=>{tree=renderer.create(React.createElement(Welcome,{accountId:'different'}));});assert.equal(tree.root.findAll(node=>typeof node.type==='string' && node.props.role==='dialog').length,1);act(()=>tree.unmount());
 }finally{globalThis.setTimeout=original;globalThis.clearTimeout=clear;}
});
test('quick actions use existing destinations and preserve owner-only team settings',()=>{
 let tree;const called=[];act(()=>tree=renderer.create(React.createElement(Quick,{open:true,role:'admin',onClose(){},onAction:id=>called.push(id)})));
 const items=tree.root.findAll(node=>node.type==='button' && node.props.className==='quick-sheet-action');assert.equal(items.length,5);assert.equal(items[4].props.disabled,true);act(()=>items[0].props.onClick());assert.deepEqual(called,['match']);
 act(()=>tree.update(React.createElement(Quick,{open:true,role:'owner',onClose(){},onAction:id=>called.push(id)})));assert.equal(tree.root.findAll(node=>node.type==='button' && node.props.className==='quick-sheet-action')[4].props.disabled,false);act(()=>tree.unmount());
});
