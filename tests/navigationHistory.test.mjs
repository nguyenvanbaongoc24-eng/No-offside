import test from 'node:test';import assert from 'node:assert/strict';import React from 'react';import renderer,{act} from 'react-test-renderer';import {useAppNavigation,initialRoute} from '../src/hooks/useAppNavigation.js';import {useLayerBack} from '../src/hooks/useLayerBack.js';
let stack,index,listeners,nav,closeCount;
function setup(state={}){stack=[state];index=0;listeners=new Set();globalThis.window={location:{pathname:'/'},history:{get state(){return stack[index];},pushState(s){stack.splice(++index);stack[index]=s;},replaceState(s){stack[index]=s;},back(){if(index){index--;for(const fn of [...listeners])fn({state:stack[index]});}}},addEventListener:(name,fn)=>{if(name==='popstate')listeners.add(fn);},removeEventListener:(name,fn)=>listeners.delete(fn)};}
function Harness(){nav=useAppNavigation();return null;}
test('detail routes return to the exact internal source and root tabs have no artificial Back',()=>{
 setup({noOffsideTab:'profile',noOffsideDetail:'management'});let tree;act(()=>{tree=renderer.create(React.createElement(Harness));});
 act(()=>nav.navigate('governance'));assert.equal(nav.tab,'governance');assert.equal(nav.hasParent,true);act(()=>nav.back('profile'));assert.equal(nav.tab,'profile');assert.equal(window.history.state.noOffsideDetail,'management');
 act(()=>nav.navigate('dashboard',{root:true}));act(()=>nav.navigate('fund'));act(()=>nav.back());assert.equal(nav.tab,'dashboard');
 act(()=>nav.navigate('fund',{root:true}));assert.equal(nav.hasParent,false);act(()=>tree.unmount());assert.equal(listeners.size,0);
});
test('untrusted or direct history uses local fallback without leaving the app, including reload',()=>{
 setup({noOffsideTab:'governance',noOffsideParent:{tab:'https://other.test'}});let tree;act(()=>{tree=renderer.create(React.createElement(Harness));});act(()=>nav.back('profile'));assert.equal(nav.tab,'profile');assert.equal(index,0);act(()=>tree.unmount());
 setup({noOffsideApp:'v2',noOffsideTab:'fund',noOffsideParent:{tab:'profile'}});act(()=>{tree=renderer.create(React.createElement(Harness));});assert.equal(nav.hasParent,true);act(()=>tree.unmount());
});
test('browser Back closes a local sheet before leaving its parent and removes listeners',()=>{
 setup({noOffsideTab:'governance'});closeCount=0;let tree;function Layer({open}){useLayerBack(open,()=>closeCount++);return null;}
 act(()=>{tree=renderer.create(React.createElement(Layer,{open:true}));});assert.equal(index,1);act(()=>window.history.back());assert.equal(closeCount,1);assert.equal(window.history.state.noOffsideTab,'governance');act(()=>tree.update(React.createElement(Layer,{open:false})));assert.equal(index,0);act(()=>tree.unmount());assert.equal(listeners.size,0);
});

test('direct detail URLs are recognized without fabricating an internal parent',()=>{assert.equal(initialRoute('/governance',null),'governance');assert.equal(initialRoute('/fund',null),'fund');assert.equal(initialRoute('/profile',null),'profile');});

test('nested sheets close one level at a time rather than leaving the fund screen',()=>{
 setup({noOffsideTab:'fund'});let a,b,outer=0,inner=0;
 function Layer({open,onClose}){useLayerBack(open,onClose);return null;}
 act(()=>{a=renderer.create(React.createElement(Layer,{open:true,onClose:()=>outer++}));});act(()=>{b=renderer.create(React.createElement(Layer,{open:true,onClose:()=>inner++}));});
 act(()=>window.history.back());assert.equal(inner,1);assert.equal(outer,0);act(()=>b.unmount());act(()=>window.history.back());assert.equal(outer,1);act(()=>a.unmount());assert.equal(listeners.size,0);
});


test('match deep link survives refresh and match IDs stay distinct in history',()=>{
 assert.equal(initialRoute('/matches/game-a',null),'match-detail');
 setup();window.location.pathname='/matches/game-a';let tree;
 act(()=>{tree=renderer.create(React.createElement(Harness));});assert.equal(nav.tab,'match-detail');assert.equal(nav.matchId,'game-a');
 act(()=>nav.navigate('match-detail',{matchId:'game-b'}));assert.equal(nav.matchId,'game-b');assert.equal(window.history.state.noOffsideMatchId,'game-b');
 act(()=>tree.unmount());assert.equal(listeners.size,0);
});


test('closing a conditionally mounted form retires its history entry without undoing new navigation',async()=>{
 setup({noOffsideTab:'profile'});let tree;function Layer(){useLayerBack(true,()=>{});return null;}
 await act(async()=>{tree=renderer.create(React.createElement(Layer));});assert.equal(index,1);
 await act(async()=>{tree.unmount();await Promise.resolve();});assert.equal(index,0);assert.equal(listeners.size,0);
 await act(async()=>{tree=renderer.create(React.createElement(Layer));});
 window.history.pushState({noOffsideTab:'match-detail',noOffsideMatchId:'new-match'},'','/matches/new-match');
 await act(async()=>{tree.unmount();await Promise.resolve();});assert.equal(window.history.state.noOffsideTab,'match-detail');
});
