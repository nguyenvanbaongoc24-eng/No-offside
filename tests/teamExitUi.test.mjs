import test from 'node:test';import assert from 'node:assert/strict';import React from 'react';import renderer,{act} from 'react-test-renderer';import {build} from 'esbuild';import {createRequire} from 'node:module';
const compiled=await build({entryPoints:['src/components/TeamExit.jsx'],bundle:true,platform:'node',format:'cjs',write:false,external:['react'],plugins:[{name:'portal-fixture',setup(b){b.onResolve({filter:/^react-dom$/},()=>({path:'portal',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export const createPortal=children=>children;'}));}}]});const mod={exports:{}};new Function('require','module','exports',compiled.outputFiles[0].text)(createRequire(import.meta.url),mod,mod.exports);const TeamExit=mod.exports.default;globalThis.document={body:{}};
test('owner confirmation requires the exact team name and suppresses duplicate requests until server acknowledgment',async()=>{
 let tree,ack,calls=0;const payload=[];act(()=>tree=renderer.create(React.createElement(TeamExit,{team:{teamName:'FC 37'},role:'owner',onExit:(...args)=>{calls++;payload.push(args);return new Promise(resolve=>ack=resolve);}})));
 act(()=>tree.root.findByType('button').props.onClick());const confirm=()=>tree.root.findAllByType('button').find(b=>b.props.children==='Giải tán đội');assert.equal(confirm().props.disabled,true);
 act(()=>tree.root.findByType('input').props.onChange({target:{value:'fc 37'}}));assert.equal(confirm().props.disabled,true);act(()=>tree.root.findByType('input').props.onChange({target:{value:'FC 37'}}));assert.equal(confirm().props.disabled,false);
 let pending;act(()=>{pending=tree.root.findByType('form').props.onSubmit({preventDefault(){}});});act(()=>{tree.root.findByType('form').props.onSubmit({preventDefault(){}});});assert.equal(calls,1);assert.deepEqual(payload,[['dissolve','FC 37']]);assert.equal(tree.root.findAllByType('form').length,1);
 await act(async()=>{ack({success:true});await pending;});assert.equal(tree.root.findAllByType('form').length,0);act(()=>tree.unmount());
});
test('member sees only leave; failed server response keeps the confirmation open for retry',async()=>{
 let tree;act(()=>tree=renderer.create(React.createElement(TeamExit,{team:{teamName:'FC'},role:'member',onExit:async action=>{assert.equal(action,'leave');throw Error('Không có kết nối');}})));
 assert.equal(tree.root.findByType('button').props.children[1],'Rời đội');act(()=>tree.root.findByType('button').props.onClick());assert.equal(tree.root.findAllByType('input').length,0);
 await act(async()=>await tree.root.findByType('form').props.onSubmit({preventDefault(){}}));assert.equal(tree.root.findAllByType('form').length,1);assert.equal(tree.root.findByProps({role:'alert'}).children[0],'Không có kết nối');act(()=>tree.unmount());
});
