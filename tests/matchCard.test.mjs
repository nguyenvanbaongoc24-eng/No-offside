import test from 'node:test';
import assert from 'node:assert/strict';
import {finePolicy, deadlineState} from '../src/lib/matchCard.js';
import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {build} from 'esbuild';
import {createRequire} from 'node:module';

test('fine display distinguishes disabled, absent, malformed and explicitly zero settings', () => {
  assert.deepEqual(finePolicy(false, '50.000 đ'), {kind:'off'});
  for (const [enabled, amount] of [[undefined,50000],[true,undefined],[true,'abc50đ'],[true,-1],[true,NaN],[true,'1.5 đ'],[true,null]]) assert.equal(finePolicy(enabled,amount).kind,'unknown');
  for (const amount of [50000,'50.000 đ','50,000 VND','50000']) assert.deepEqual(finePolicy(true,amount),{kind:'configured',amount:50000});
  assert.deepEqual(finePolicy(true,0),{kind:'configured',amount:0});
});

test('deadline states stop on terminal matches and expiry, no negative time or fabricated deadline',()=>{
  const now=Date.parse('2026-10-16T10:00Z');
  assert.equal(deadlineState({},now).text,'Chưa đặt hạn điểm danh');
  const match={deadline:new Date(now+864e5+36e5).toISOString()};
  assert.equal(deadlineState(match,now).text,'Còn 1 ngày 1 giờ');
  assert.equal(deadlineState({...match,status:'completed'},now).running,false);
  assert.equal(deadlineState({...match,archivedAt:'today'},now).running,false);
  assert.equal(deadlineState({...match,status:'cancelled'},now).running,false);
  assert.deepEqual(deadlineState({deadline:new Date(now-1).toISOString()},now),{running:false,text:'Đã chốt điểm danh'});
  assert.equal(deadlineState({deadline:new Date(now+1000).toISOString()},now).nextUpdate,1000);
});

const output=await build({entryPoints:['src/components/matches/MatchCardSummary.jsx'],bundle:true,platform:'node',format:'cjs',write:false,external:['react']});
const mod={exports:{}};new Function('require','module','exports',output.outputFiles[0].text)(createRequire(import.meta.url),mod,mod.exports);
const {default:Summary,DeadlineStatus}=mod.exports;

test('countdown cleans its timer on completion, match switch and unmount; never schedules every second',()=>{
  const oldSet=globalThis.setTimeout,oldClear=globalThis.clearTimeout;const timers=new Map();let id=0,tree;
  globalThis.setTimeout=(fn,ms)=>{timers.set(++id,{fn,ms});return id;};globalThis.clearTimeout=key=>timers.delete(key);
  try {
    const match={deadline:new Date(Date.now()+3600000).toISOString()};
    act(()=>tree=renderer.create(React.createElement(DeadlineStatus,{match})));
    assert.equal(timers.size,1);assert.equal([...timers.values()][0].ms,60000);
    act(()=>tree.update(React.createElement(DeadlineStatus,{match:{...match,status:'completed'}})));
    assert.equal(timers.size,0);assert.match(JSON.stringify(tree.toJSON()),/Trận đã kết thúc/);
    act(()=>tree.update(React.createElement(DeadlineStatus,{match:{}})));
    assert.match(JSON.stringify(tree.toJSON()),/Chưa đặt hạn/);
    act(()=>tree.update(React.createElement(DeadlineStatus,{match})));
    assert.equal(timers.size,1);act(()=>tree.unmount());assert.equal(timers.size,0);
  } finally {if(tree)act(()=>tree.unmount());globalThis.setTimeout=oldSet;globalThis.clearTimeout=oldClear;}
});

test('summary preserves actual timezone and rules action without showing collection copy for disabled/unknown/zero',()=>{
  let tree,called=0;
  const match={title:'Đối thủ thật',datetime:'2026-10-24T11:30Z',deadline:'2026-10-24T10:30Z',venue:'Sân thật',penaltyEnabled:true,penaltyAmount:'50.000 đ',status:'completed'};
  act(()=>tree=renderer.create(React.createElement(Summary,{match,timeZone:'Asia/Ho_Chi_Minh',onOpenRules:()=>called++})));
  let text=JSON.stringify(tree.toJSON());assert.match(text,/18:30 · 24\/10\/2026/);assert.match(text,/Có thể bị phạt/);
  act(()=>tree.root.findByType('button').props.onClick());assert.equal(called,1);
  for(const patch of [{penaltyEnabled:false},{penaltyEnabled:undefined},{penaltyAmount:0}]) {
    act(()=>tree.update(React.createElement(Summary,{match:{...match,...patch}})));
    assert.doesNotMatch(JSON.stringify(tree.toJSON()),/Có thể bị phạt/);
  }
  act(()=>tree.unmount());
});
