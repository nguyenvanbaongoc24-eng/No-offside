import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import {lateArrivalInstant, matchTimeLabel} from '../src/lib/matchTime.js';
import {acquireScrollLock} from '../src/lib/scrollLock.js';
import {domStyle} from './helpers/domStyle.mjs';

test('late time uses the match day and team clock even when the device is overseas', () => {
  const before = process.env.TZ;
  try {
    process.env.TZ = 'America/Los_Angeles';
    assert.equal(lateArrivalInstant('2026-10-24T11:30:00Z','18:45'), '2026-10-24T11:45:00.000Z');
    assert.equal(matchTimeLabel('2026-10-24T11:30:00Z'), '18:30 - 24/10/2026');
    assert.equal(matchTimeLabel(undefined), 'Chưa rõ thời gian');
    assert.throws(()=>lateArrivalInstant('2026-10-24T11:30:00Z','18:30'), /phải sau/);
    assert.throws(()=>lateArrivalInstant('2026-10-24T11:30:00Z','18:29'), /phải sau/);
    assert.throws(()=>lateArrivalInstant('2026-10-24T11:30:00Z','00:15'), /phải sau/);
    assert.throws(()=>lateArrivalInstant('2026-10-24T00:00:00Z','20:00'), /12 giờ/);
    assert.throws(()=>lateArrivalInstant('2026-10-24T11:30:00Z',''), /Chọn giờ/);
  } finally { if(before===undefined) delete process.env.TZ; else process.env.TZ=before; }
});

test('nested chat/dialog locks release in either order and restore body/html including priorities', () => {
  globalThis.document = {body:{style:domStyle()},documentElement:{style:domStyle()}};
  document.body.style.setProperty('overflow','auto','important');
  for (const order of [[0,1],[1,0]]) {
    const releases=[acquireScrollLock(),acquireScrollLock()];
    assert.equal(document.body.style.overflow,'hidden');
    assert.equal(document.documentElement.style.overflow,'hidden');
    releases[order[0]](); assert.equal(document.body.style.overflow,'hidden');
    releases[order[1]](); releases[order[1]]();
    assert.equal(document.body.style.overflow,'auto');
    assert.equal(document.body.style.getPropertyPriority('overflow'),'important');
    assert.equal(document.documentElement.style.getPropertyValue('overflow'),'');
  }
});

const output=await build({stdin:{loader:'jsx',resolveDir:process.cwd(),contents:"export {default as Late} from './src/components/LateArrivalPanel'; export {default as Match} from './src/components/MatchFormSheet';"},bundle:true,platform:'node',format:'cjs',write:false,external:['react'],plugins:[{name:'ui-renderer',setup(b){
  b.onResolve({filter:/^react-dom$/},()=>({path:'portal',namespace:'fixture'}));
  b.onLoad({filter:/portal/,namespace:'fixture'},()=>({contents:'export const createPortal=children=>children;'}));
  b.onResolve({filter:/useLayerBack$/},()=>({path:'back',namespace:'fixture'}));
  b.onLoad({filter:/back/,namespace:'fixture'},()=>({contents:'export const useLayerBack=()=>{};'}));
  b.onResolve({filter:/^framer-motion$/},()=>({path:'motion',namespace:'fixture'}));
  b.onLoad({filter:/motion/,namespace:'fixture'},()=>({contents:`import React from 'react';export const useReducedMotion=()=>true;export const motion=new Proxy({},{get:(_,tag)=>React.forwardRef(({whileTap,whileHover,transition,...p},ref)=>React.createElement(tag,{...p,ref}))});`}));
}}]});
const mod={exports:{}};new Function('require','module','exports',output.outputFiles[0].text)(createRequire(import.meta.url),mod,mod.exports);
const {Late,Match}=mod.exports;

test('late form rejects equal time inline and sends the edited native control values with a trimmed reason', async()=>{
  const calls=[],kickoff=new Date(Date.now()+864e5).toISOString().slice(0,10)+'T11:30:00Z';
  const governance={snapshot:{team:{timezone:'Asia/Ho_Chi_Minh'},me:{status:'active'},matches:[{id:'m',kickoff,late_before:0}],events:[]},mutate:async(...args)=>calls.push(args)};
  let tree;act(()=>tree=renderer.create(React.createElement(Late,{governance,matchId:'m',userId:'me'})));
  act(()=>tree.root.findAllByType('button').find(b=>b.props.children?.some?.(v=>v==='Xin đến muộn')).props.onClick());
  const input=tree.root.findByType('input');assert.equal(input.props.type,'time');
  act(()=>input.props.onInput({currentTarget:{value:'18:45'}}));
  act(()=>tree.root.findByType('textarea').props.onChange({target:{value:'Kẹt xe'}}));
  assert.equal(tree.root.findByType('input').props.value,'18:45');
  const submit=time=>tree.root.findByType('form').props.onSubmit({preventDefault(){},currentTarget:{elements:{namedItem:name=>({value:name==='eta'?time:'  Kẹt xe ở đường đến sân  '})}}});
  await act(async()=>{await submit('18:30');});assert.equal(calls.length,0);
  assert.match(JSON.stringify(tree.toJSON()),/Giờ dự kiến đến phải sau/);
  // Simulates a native wheel's final committed value even before another React render.
  await act(async()=>{await submit('18:50');});
  assert.equal(calls.length,1);assert.equal(calls[0][1].eta,kickoff.slice(0,10)+'T11:50:00.000Z');
  assert.equal(calls[0][1].reason,'Kẹt xe ở đường đến sân');assert.equal(tree.root.findAllByType('form').length,0);
  act(()=>tree.unmount());
});

test('match fine inputs normalize leading zeros and quick amounts replace numeric state',()=>{
  let draft={opponent:'FC',datetime:'2026-10-24T18:30',penaltyEnabled:true,penaltyFine:0,lateConfig:{fine:0}},tree;
  const render=()=>React.createElement(Match,{draft,onChange:next=>{draft=next;tree.update(render());},onClose(){},onSubmit(){}});
  act(()=>tree=renderer.create(render()));
  const fine=()=>tree.root.findAllByType('input').find(n=>n.props.placeholder==='50000');
  act(()=>fine().props.onChange({target:{value:'020000'}}));assert.equal(draft.penaltyFine,20000);assert.equal(fine().props.value,'20.000');
  act(()=>tree.root.findAllByType('button').find(n=>Array.isArray(n.props.children) && n.props.children[0]===50 && n.props.children[1]==='k').props.onClick());
  assert.equal(draft.penaltyFine,50000);assert.equal(fine().props.value,'50.000');
  act(()=>fine().props.onChange({target:{value:''}}));assert.equal(draft.penaltyFine,0);
  act(()=>tree.unmount());
});
