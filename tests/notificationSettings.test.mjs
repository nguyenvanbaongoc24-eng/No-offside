import test from 'node:test';import assert from 'node:assert/strict';
import React from 'react';import renderer,{act} from 'react-test-renderer';
import {build} from 'esbuild';import {createRequire} from 'node:module';
const events=new Map();let permissionCalls=0,subscribeCalls=0,saveAck;
globalThis.window={addEventListener:(n,f)=>events.set(n,f),removeEventListener:n=>events.delete(n)};
globalThis.Notification={permission:'default',requestPermission:()=>{permissionCalls++;return Promise.resolve('granted');}};
const subscription={toJSON:()=>({endpoint:'test-only'})};
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{serviceWorker:{getRegistration:async()=>({active:true,pushManager:{getSubscription:async()=>null,subscribe:async()=>{subscribeCalls++;return subscription;}}})}}});
globalThis.notificationMock={platform:'supported',requests:[],request:async(token,body)=>{notificationMock.requests.push(body);if(body.action==='state')return {enabled:false};if(body.action==='subscribe')return new Promise(resolve=>{saveAck=resolve;});}};
const built=await build({entryPoints:['src/components/NotificationSettings.jsx'],bundle:true,platform:'node',format:'cjs',write:false,external:['react'],plugins:[{name:'notification-test-only',setup(b){b.onResolve({filter:/lib\/(pushDevice|serverRequest)$/},args=>({path:args.path,namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},args=>({loader:'js',contents:args.path.endsWith('serverRequest')?`export const serverRequest=async()=>({data:{configured:true,publicKey:'test-public'}});`:`export const platformPushState=()=>globalThis.notificationMock.platform;export const notificationRequest=(...args)=>globalThis.notificationMock.request(...args);export const deviceBody=()=>({installationId:'test-installation'});export const vapidBytes=()=>new Uint8Array();export const disconnectPushDevice=async()=>{};export const workerContext=async()=>{};` }));}}]});
const mod={exports:{}};new Function('require','module','exports',built.outputFiles[0].text)(createRequire(import.meta.url),mod,mod.exports);const Settings=mod.exports.default;
test('permission is requested only by explicit enable, and enabled UI awaits server acknowledgment',async()=>{
 let tree;await act(async()=>{tree=renderer.create(React.createElement(Settings,{token:'test-token'}));});assert.equal(permissionCalls,0);assert.equal(subscribeCalls,0);
 const enable=tree.root.findByProps({children:'Bật thông báo'});assert.equal(enable.props.disabled,false);
 let enabling;act(()=>{enabling=enable.props.onClick();});assert.equal(permissionCalls,1);await act(async()=>{await new Promise(resolve=>setImmediate(resolve));});assert.equal(subscribeCalls,1);assert.doesNotMatch(JSON.stringify(tree.toJSON()),/Đã bật trên thiết bị này/);
 await act(async()=>{saveAck({success:true});await enabling;});assert.match(JSON.stringify(tree.toJSON()),/Đã bật trên thiết bị này/);assert.equal(notificationMock.requests.at(-1).hidePreview,true);assert.deepEqual(notificationMock.requests.at(-1).groups,{messages:true,matches:false,funds:false,governance:false});act(()=>tree.unmount());assert.equal(events.size,0);
});
test('iOS installation and blocked states offer guidance without repeated permission prompts',async()=>{
 for(const platform of ['install','blocked','unsupported']){
 notificationMock.platform=platform;let tree;await act(async()=>{tree=renderer.create(React.createElement(Settings,{token:'test-token'}));});assert.equal(tree.root.findAllByType('button').filter(b=>b.props.children==='Bật thông báo').length,0);assert.equal(permissionCalls,1);act(()=>tree.unmount());
 }
});
