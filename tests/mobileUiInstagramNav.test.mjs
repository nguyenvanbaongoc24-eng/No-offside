import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import renderer from 'react-test-renderer';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
const built=await build({entryPoints:['src/components/FloatingBottomNavigation.jsx'],bundle:true,platform:'node',format:'cjs',write:false,external:['react']});
const module={exports:{}};
new Function('require','module','exports',built.outputFiles[0].text)(createRequire(import.meta.url),module,module.exports);
const Navigation=module.exports.default;
const tabs=['Trang chủ','Sa bàn','Chat','Tài khoản'].map((label,id)=>({id:String(id),label,Icon:()=>React.createElement('svg')}));
test('capsule exposes four named destinations, preserves routing and selected tab',()=>{
 const visited=[];
 const tree=renderer.create(React.createElement(Navigation,{tabs,activeTab:'1',onNavigate:id=>visited.push(id)}));
 const buttons=tree.root.findAllByType('button');
 assert.deepEqual(buttons.map(b=>b.props['aria-label']),tabs.map(t=>t.label));
 assert.equal(buttons.filter(b=>b.props['aria-current']==='page').length,1);
 assert.equal(buttons[1].findByProps({className:'nav-label'}).children[0],'Sa bàn');
 buttons.forEach(b=>b.props.onClick()); assert.deepEqual(visited,['0','1','2','3']);
 tree.unmount();
});
test('hidden capsule is excluded from keyboard and accessibility navigation',()=>{
 const tree=renderer.create(React.createElement(Navigation,{tabs,activeTab:'0',visible:false,onNavigate:()=>{}}));
 assert.equal(tree.root.findByType('nav').props['aria-hidden'],true);
 assert.equal(tree.root.findByType('nav').props.inert,'');
 assert.ok(tree.root.findAllByType('button').every(b=>b.props.tabIndex===-1));
 tree.unmount();
});

test('unread badge caps display at 99+, hides zero, and announces the real count',()=>{
 for(const count of [0,1,99,100]){
 const tree=renderer.create(React.createElement(Navigation,{tabs:[{...tabs[2],unreadCount:count}],activeTab:'3',onNavigate(){}}));
 const badges=tree.root.findAllByProps({className:'chat-unread-badge'});
 assert.equal(badges.length,count?1:0);if(count)assert.equal(badges[0].children[0],count>99?'99+':String(count));
 assert.equal(tree.root.findByType('button').props['aria-label'],'Chat'+(count?`, ${count} tin chưa đọc`:''));tree.unmount();
 }
});

test('management FAB is separate, role gated by its caller, and invokes quick actions',()=>{
 let calls=0; const tree=renderer.create(React.createElement(Navigation,{tabs,activeTab:'0',canManage:true,onQuickActions:()=>calls++}));
 const fab=tree.root.findByProps({className:'navigation-fab'});fab.props.onClick();assert.equal(calls,1);assert.equal(tree.root.findAllByType('button').length,5);
 tree.update(React.createElement(Navigation,{tabs,activeTab:'0',canManage:false}));assert.equal(tree.root.findAllByProps({className:'navigation-fab'}).length,0);tree.unmount();
});
