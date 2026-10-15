import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import renderer,{act} from 'react-test-renderer';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
const built=await build({stdin:{resolveDir:process.cwd(),loader:'jsx',contents:"export {default as Gate} from './src/components/StartupGate.jsx';export {default as Splash} from './src/components/SplashScreen.jsx';"},bundle:true,platform:'node',format:'cjs',write:false,external:['react']});
const mod={exports:{}};new Function('require','module','exports',built.outputFiles[0].text)(createRequire(import.meta.url),mod,mod.exports);
const {Gate,Splash}=mod.exports;
const text=tree=>JSON.stringify(tree.toJSON());
test('splash uses repository logo and contains no navigation or form',()=>{
 let tree;act(()=>tree=renderer.create(React.createElement(Splash)));
 assert.equal(tree.root.findByType('img').props.src,'/pwa-512x512.png');assert.equal(tree.root.findAllByType('nav').length,0);assert.equal(tree.root.findAllByType('form').length,0);assert.equal(tree.root.findAllByType('button').length,0);assert.match(text(tree),/Hẹn nhau ra sân/);act(()=>tree.unmount());
});
test('pending startup does not render login or destination; real readiness reveals destination immediately',()=>{
 let tree,renders=0;function Destination(){renders++;return React.createElement('p',null,'Dashboard');}
 act(()=>tree=renderer.create(React.createElement(Gate,{pending:true},React.createElement(Destination))));assert.equal(renders,0);assert.match(text(tree),/NO OFFSIDE/);
 act(()=>tree.update(React.createElement(Gate,{pending:false},React.createElement(Destination))));assert.equal(renders,1);assert.match(text(tree),/Dashboard/);assert.doesNotMatch(text(tree),/NO OFFSIDE/);act(()=>tree.unmount());
});
test('already ready startup has no artificial delay or splash and does not replay on later updates',()=>{
 let tree;act(()=>tree=renderer.create(React.createElement(Gate,{pending:false},React.createElement('p',null,'Đăng nhập'))));assert.doesNotMatch(text(tree),/NO OFFSIDE/);assert.match(text(tree),/Đăng nhập/);
 act(()=>tree.update(React.createElement(Gate,{pending:true},React.createElement('p',null,'Đổi tài khoản'))));assert.doesNotMatch(text(tree),/NO OFFSIDE/);act(()=>tree.unmount());
});
test('startup error gives explicit retry rather than an indefinite loader',()=>{
 let tree,retries=0;act(()=>tree=renderer.create(React.createElement(Gate,{error:'Không tải được thông tin đội',onRetry:()=>retries++})));
 assert.equal(tree.root.findAllByProps({role:'alert'}).length,1);assert.equal(tree.root.findAllByProps({className:'splash-progress'}).length,0);act(()=>tree.root.findByType('button').props.onClick());assert.equal(retries,1);act(()=>tree.unmount());
});
test('timeout is bounded, clears its timer and requires deliberate retry even if a late response arrives',()=>{
 const nativeSet=setTimeout,nativeClear=clearTimeout;let timeout,cleared=false,tree;
 globalThis.setTimeout=(fn,ms)=>{assert.equal(ms,15000);timeout=fn;return 42;};globalThis.clearTimeout=id=>{if(id===42)cleared=true;};
 try {act(()=>tree=renderer.create(React.createElement(Gate,{pending:true,onRetry(){}})));act(()=>timeout());assert.equal(cleared,true);assert.equal(tree.root.findAllByProps({role:'alert'}).length,1);act(()=>tree.update(React.createElement(Gate,{pending:false,onRetry(){}})));assert.match(text(tree),/Thử lại/);act(()=>tree.unmount());}finally{globalThis.setTimeout=nativeSet;globalThis.clearTimeout=nativeClear;}
});
test('workspace startup failure offers a deliberate sign-in recovery without revealing destination',async()=>{
 let tree,exits=0;await act(async()=>{tree=renderer.create(React.createElement(Gate,{error:'Workspace unavailable',onRetry(){},onExit:async()=>{exits++;}},React.createElement('p',null,'Private team')));});
 assert.doesNotMatch(text(tree),/Private team/);const exit=tree.root.findAllByType('button').find(b=>b.props.children==='Đăng nhập lại');assert.ok(exit);await act(async()=>{await exit.props.onClick();});assert.equal(exits,1);await act(async()=>tree.unmount());
});
