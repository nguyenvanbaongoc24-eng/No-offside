import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import renderer,{act} from 'react-test-renderer';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
const bundle=await build({stdin:{resolveDir:process.cwd(),loader:'jsx',contents:"export {default as Monthly} from './src/components/MonthlyFundCollection';"},bundle:true,platform:'node',format:'cjs',external:['react'],write:false,plugins:[{name:'dialog-test-boundary',setup(b){b.onResolve({filter:/pro\/ProModal$/},()=>({path:'modal',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({loader:'jsx',contents:"import React from 'react';export default function Modal({open,title,children}){return open?<section aria-label={title}>{children}</section>:null;}"}));}}]});
const mod={exports:{}};new Function('require','module','exports',bundle.outputFiles[0].text)(createRequire(import.meta.url),mod,mod.exports);const {Monthly}=mod.exports;
const text=node=>typeof node==='string'||typeof node==='number'?String(node):Array.isArray(node)?node.map(text).join(''):node?.props?text(node.props.children):'';
const button=(tree,label)=>tree.root.findAllByType('button').find(b=>text(b.props.children)===label);

test('successful collection save closes the form and reports success once; failure stays editable',async()=>{
 let writes=0,fail=false;const toasts=[];globalThis.window={dispatchEvent:e=>toasts.push(e.detail)};let tree;
 const fund={data:{collections:[],charges:[],pendingRequests:[]},mutate:async()=>{writes++;if(fail)throw Error('Server từ chối lưu');return {success:true};}};
 try{
  act(()=>{tree=renderer.create(React.createElement(Monthly,{fund,funds:{transactions:[]},canManage:true,teamMembers:[]}));});
  act(()=>button(tree,'Tạo đợt thu').props.onClick());
  assert.ok(tree.root.findByProps({type:'date'}).props.value>=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Ho_Chi_Minh'}));
  await act(async()=>tree.root.findByType('form').props.onSubmit({preventDefault(){}}));
  assert.equal(writes,1);assert.equal(tree.root.findAllByType('form').length,0);assert.equal(toasts.length,1);assert.match(toasts[0].message,/Đã tạo/);
  fail=true;act(()=>button(tree,'Tạo đợt thu').props.onClick());await act(async()=>tree.root.findByType('form').props.onSubmit({preventDefault(){}}));
  assert.equal(tree.root.findAllByType('form').length,1);assert.equal(toasts.length,1);assert.ok(tree.root.findAllByProps({role:'alert'}).some(n=>text(n.props.children).includes('Server từ chối')));
 }finally{if(tree)act(()=>tree.unmount());delete globalThis.window;}
});

test('a final one-VND remainder is payable, reported as pending, and never submitted as total monthly debt',async()=>{
 const now=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit'}).format(new Date());
 const month=now.slice(0,7),writes=[],toasts=[];globalThis.window={dispatchEvent:e=>toasts.push(e.detail)};let tree;
 const fund={data:{collections:[{id:'col',period:month}],charges:[{id:'last-vnd',subject:'me',collection_id:'col',kind:'fund',amount:100001,paid_amount:100000,status:'owed'}],pendingRequests:[]},mutate:async(action,payload)=>{writes.push({action,payload});return {success:true};}};
 try{
  act(()=>{tree=renderer.create(React.createElement(Monthly,{fund,funds:{transactions:[]},accountId:'me',canManage:false,teamMembers:[{id:'me',name:'Test'}]}));});
  act(()=>tree.root.findAllByType('article')[0].props.onClick());act(()=>button(tree,'Báo chuyển khoản này').props.onClick());
  const input=tree.root.findByProps({type:'number'});assert.equal(input.props.min,1);assert.equal(input.props.step,1);assert.equal(input.props.max,1);assert.equal(input.props.value,1);
  await act(async()=>tree.root.findByType('form').props.onSubmit({preventDefault(){}}));assert.equal(writes[0].action,'payment_request');assert.equal(writes[0].payload.amount,1);assert.match(toasts[0].message,/chờ Thủ quỹ duyệt/);
 }finally{if(tree)act(()=>tree.unmount());delete globalThis.window;}
});


test('member view does not label unseen peer obligations as missing or expose a team balance',()=>{
 let tree;
 const fund={data:{collections:[],charges:[],pendingRequests:[]}};
 try {
  act(()=>{tree=renderer.create(React.createElement(Monthly,{fund,funds:{transactions:[]},accountId:'me',canManage:false,teamMembers:[{id:'me',name:'Tên của tôi'},{id:'peer',name:'Người khác'}]}));});
  const content=JSON.stringify(tree.toJSON());
  assert.ok(content.includes('Tên của tôi'));assert.ok(!content.includes('Người khác'));assert.ok(button(tree,'Còn thiếu (0)'));
 } finally {if(tree)act(()=>tree.unmount());}
});
