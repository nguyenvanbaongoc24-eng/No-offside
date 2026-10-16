import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import {matchLateRequests} from '../src/lib/matchLateRequests.js';
const request=(id,subject,seq,match_id='match')=>({id,subject,seq,match_id,action:'late_request',data:{status:'pending',eta:'2026-10-18T12:45Z',reason:'Kẹt xe'}});
const events=[request('old','member',1),request('other','member',7,'different'),request('new','member',3),{id:'decision',seq:5,action:'review_late',data:{requestId:'old',status:'approved'}}];
test('match list keeps only latest request, exact match and decision for that request',()=>{
 const entries=matchLateRequests(events,'match');assert.equal(entries.length,1);assert.equal(entries[0].request.id,'new');assert.equal(entries[0].status,'pending');
 assert.equal(matchLateRequests([...events,{seq:8,action:'review_late',data:{requestId:'new',status:'rejected'}}],'match')[0].status,'rejected');
 assert.equal(matchLateRequests(events,'missing').length,0);
});
const built=await build({entryPoints:['src/components/MatchLateReview.jsx'],bundle:true,platform:'node',format:'cjs',write:false,external:['react'],loader:{'.css':'empty'},plugins:[{name:'boundaries',setup(b){
 b.onResolve({filter:/pro\/ProModal$/},()=>({path:'modal',namespace:'fixture'}));
 b.onResolve({filter:/lib\/feedback$/},()=>({path:'feedback',namespace:'fixture'}));
 b.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:args.path==='modal'?`import React from 'react';export default function Modal({open,children}){return open?React.createElement('section',null,children):null;}`:`export function notify(){}`}));
}}]});
const mod={exports:{}};new Function('require','module','exports',built.outputFiles[0].text)(createRequire(import.meta.url),mod,mod.exports);const Review=mod.exports.default;
const members=[{id:'member',name:'Cầu thủ A',number:55}];
const snapshot={team:{id:'team',timezone:'Asia/Ho_Chi_Minh'},me:{user_id:'owner',role:'owner',status:'active'},events,members:[]};
test('leader sees member name, attendance, ETA and uses latest ID; API errors remain visible',async()=>{
 let tree,calls=[];const governance={snapshot,mutate:async(...args)=>{calls.push(args);throw Error('Lỗi kết nối thử nghiệm');}};
 await act(async()=>tree=renderer.create(React.createElement(Review,{governance,matchId:'match',members,attendance:{member:'attending'}})));
 assert.match(JSON.stringify(tree.toJSON()),/Cầu thủ A/);assert.match(JSON.stringify(tree.toJSON()),/Đã điểm danh có mặt/);
 assert.match(JSON.stringify(tree.toJSON()),/19:45/);assert.doesNotMatch(JSON.stringify(tree.toJSON()),/different/);
 await act(async()=>tree.root.findAllByType('button').find(b=>b.props['aria-label']==='Duyệt đến muộn cho Cầu thủ A').props.onClick());
 await act(async()=>tree.root.findByType('form').props.onSubmit({preventDefault(){}}));
 assert.equal(calls[0][0],'review_late');assert.equal(calls[0][1].requestId,'new');assert.equal(calls[0][1].status,'approved');
 assert.match(JSON.stringify(tree.toJSON()),/Lỗi kết nối thử nghiệm/);act(()=>tree.unmount());
});
test('reject requires reason, member cannot manage and admin cannot self approve',async()=>{
 let tree,calls=[];const governance={snapshot,mutate:async(...args)=>calls.push(args)};
 await act(async()=>tree=renderer.create(React.createElement(Review,{governance,matchId:'match',members,attendance:{}})));
 await act(async()=>tree.root.findAllByType('button').find(b=>b.props['aria-label']==='Từ chối đến muộn của Cầu thủ A').props.onClick());
 await act(async()=>tree.root.findByType('form').props.onSubmit({preventDefault(){}}));assert.equal(calls.length,0);
 await act(async()=>tree.root.findByType('textarea').props.onChange({target:{value:'Không phù hợp thời gian'}}));
 await act(async()=>tree.root.findByType('form').props.onSubmit({preventDefault(){}}));assert.equal(calls[0][1].status,'rejected');
 for(const role of ['member','admin']){
  await act(async()=>tree.update(React.createElement(Review,{governance:{...governance,snapshot:{...snapshot,me:{user_id:'member',role,status:'active'}}},matchId:'match',members,attendance:{}})));
  assert.equal(tree.root.findAllByType('button').filter(b=>b.props['aria-label']?.includes('đến muộn')).length,0);
 }
 act(()=>tree.unmount());
});
