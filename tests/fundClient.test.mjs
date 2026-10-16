import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import renderer,{act} from 'react-test-renderer';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import {allocateBill,collectionSummary,nextMonthlyStart,scheduleDueDate} from '../src/lib/fundCollections.js';

test('VND allocations and monthly calendar use exact integers and the Vietnam clock',()=>{
 assert.deepEqual(allocateBill(100001,10001,['b','a','c']),[{id:'a',amount:30000},{id:'b',amount:30000},{id:'c',amount:30000}]);
 const split=allocateBill(100001,0,['b','a','c']);assert.equal(split.reduce((n,x)=>n+x.amount,0),100001);assert.equal(split[0].amount-split.at(-1).amount,1);
 assert.throws(()=>allocateBill(100,101,['a']));
 assert.equal(nextMonthlyStart(31,'09:00',Date.parse('2027-02-01T03:00Z')),'2027-02-28T09:00');
 assert.equal(scheduleDueDate({next_run:'2027-02-28T02:00Z',repeat:'monthly',due_day:5,due_months:1}),'2027-03-05');
 assert.deepEqual(collectionSummary({id:'batch'},[{collection_id:'batch',amount:100,paid_amount:40,status:'owed'},{collection_id:'batch',amount:100,paid_amount:100,status:'paid'},{collection_id:'other',amount:1000,paid_amount:0,status:'owed'}]),{people:2,paid:1,partial:1,remaining:60});
});

const output=await build({stdin:{loader:'jsx',resolveDir:process.cwd(),contents:"export {useFundCollections} from './src/hooks/useFundCollections';export {roleQuickActions,quickActionItems} from './src/components/QuickActions';"},bundle:true,platform:'node',format:'cjs',external:['react'],write:false,plugins:[{name:'transport-fixture',setup(b){
 b.onResolve({filter:/lib\/supabase$/},()=>({path:'supabase',namespace:'fixture'}));b.onResolve({filter:/lib\/serverRequest$/},()=>({path:'request',namespace:'fixture'}));
 b.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:args.path==='supabase'?'export const supabase=null;':'export const serverRequest=(...args)=>globalThis.fundRequest(...args);'}));
}}]});
const mod={exports:{}};new Function('require','module','exports',output.outputFiles[0].text)(createRequire(import.meta.url),mod,mod.exports);
const {useFundCollections,roleQuickActions,quickActionItems}=mod.exports;
test('treasurer quick actions are first and narrow; other roles retain original relative order',()=>{
 assert.deepEqual(roleQuickActions('member',true,true).map(x=>x.id),['fund','reminder','finance']);
 assert.deepEqual(roleQuickActions('member',false,false),[]);
 assert.deepEqual(roleQuickActions('owner',true,false).slice(0,quickActionItems.length).map(x=>x.id),quickActionItems.map(x=>x.id));
});
test('a team switch cannot flash old fund rights; uncertain retries reuse the key, double taps do not issue two writes',async()=>{
 globalThis.window={addEventListener(){},removeEventListener(){}};globalThis.document={hidden:false};
 let current,tree,pendingA,writeResolve,fail=true;const keys=[];
 const data=(team,canManage)=>({success:true,teamId:team,canManage,treasurer:canManage,schedules:[],collections:[],charges:[],bills:[],members:[],history:[]});
 globalThis.fundRequest=async(url,options)=>{
  const body=JSON.parse(options.body);
  if(body.fundAction==='state'){
   if(body.teamId==='a')return {response:{ok:true},data:data('a',true)};
   return new Promise(resolve=>pendingA=()=>resolve({response:{ok:true},data:data('b',false)}));
  }
  keys.push(body.requestKey);if(fail){fail=false;throw Error('Network reply lost');}
  return new Promise(resolve=>writeResolve=()=>resolve({response:{ok:true},data:data(body.teamId,true)}));
 };
 function Harness(props){current=useFundCollections(props);return null;}
 try{
  await act(async()=>{tree=renderer.create(React.createElement(Harness,{teamId:'a',accountId:'me',token:'test'}));});assert.equal(current.data.canManage,true);
  await act(async()=>{await assert.rejects(()=>current.mutate('payment',{chargeId:'x',amount:50}),/reply lost/);});
  await act(async()=>tree.update(React.createElement(Harness,{teamId:'a',accountId:'me',token:'refreshed-token'})));
  let save;act(()=>{save=current.mutate('payment',{chargeId:'x',amount:50});});
  await assert.rejects(()=>current.mutate('payment',{chargeId:'x',amount:50}),/Đang xử lý/);assert.equal(keys.length,2);assert.equal(keys[0],keys[1]);
  act(()=>tree.update(React.createElement(Harness,{teamId:'b',accountId:'me',token:'test'})));assert.equal(current.data.canManage,false);assert.equal(current.loading,true);
  await act(async()=>{writeResolve();await save;});assert.equal(current.data.canManage,false);
  await act(async()=>{pendingA();});assert.equal(current.data.teamId,'b');assert.equal(current.data.canManage,false);
 }finally{if(tree)act(()=>tree.unmount());delete globalThis.fundRequest;}
});
