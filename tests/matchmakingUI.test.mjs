import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import renderer,{act} from 'react-test-renderer';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
const compiled=await build({entryPoints:['src/pages/Matchmaking.jsx'],bundle:true,format:'cjs',platform:'node',write:false,external:['react'],loader:{'.css':'empty'},plugins:[{name:'ui-boundaries',setup(b){
 b.onResolve({filter:/hooks\/useMatchmaking$/},()=>({path:'hook',namespace:'fixture'}));
 b.onResolve({filter:/components\/pro\/ProModal$/},()=>({path:'modal',namespace:'fixture'}));
 b.onResolve({filter:/components\/Pressable$/},()=>({path:'press',namespace:'fixture'}));
 b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:a.path==='hook'?`export const useMatchmaking=()=>({...(globalThis.__mmUIState||{}),data:{offers:[],proposals:[],terms:[],links:[],messages:[],confirmations:[],reports:[],assets:[],canManage:true,entitlement:{enabled:false}},loading:false,error:globalThis.__mmUIError||'',busy:false});`:a.path==='modal'?`import React from 'react';export default function Modal({open,children,title,onClose}){return open?React.createElement('section',{role:'dialog','aria-label':title},React.createElement('button',{'aria-label':'Đóng',onClick:onClose}),children):null}`:`import React from 'react';export default function Press({children,whileTap,...props}){return React.createElement('button',props,children)}`}));
}}]});
const mod={exports:{}};new Function('require','module','exports',compiled.outputFiles[0].text)(createRequire(import.meta.url),mod,mod.exports);
const content=node=>typeof node==='string'?node:node.children?.map(content).join('')||'';
const byButton=(tree,text)=>tree.root.findAllByType('button').find(b=>content(b)===text);
const dialog=tree=>tree.root.findByProps({role:'dialog'});
const field=(tree,text)=>dialog(tree).findAllByType('label').find(l=>l.children[0]===text).findAll(n=>['input','select'].includes(n.type))[0];
const change=(tree,text,value)=>act(()=>field(tree,text).props.onChange({target:{value}}));
const submit=tree=>act(()=>dialog(tree).findByType('form').props.onSubmit({preventDefault(){}}));
test('filter drafts cancel without applying; validation, reset, apply and tab switches preserve correct filters',()=>{
 let tree;act(()=>{tree=renderer.create(React.createElement(mod.exports.default,{team:{id:'a',teamName:'FC A'},user:{id:'user'}}));});
 act(()=>byButton(tree,'Bộ lọc').props.onClick());change(tree,'Khu vực','Thủ Đức');
 act(()=>dialog(tree).findByProps({'aria-label':'Đóng'}).props.onClick());
 assert.equal(tree.root.findAllByProps({className:'mm-filter-summary'}).length,0);
 act(()=>byButton(tree,'Bộ lọc').props.onClick());assert.equal(field(tree,'Khu vực').props.value,'');
 act(()=>field(tree,'Từ giờ').props.onInput({currentTarget:{value:'20:00'}}));change(tree,'Đến giờ','19:00');submit(tree);
 assert.match(tree.root.findByProps({role:'alert'}).children.join(''),/Giờ kết thúc/);
 assert.equal(tree.root.findAllByProps({role:'dialog'}).length,1);
 change(tree,'Đến giờ','21:00');change(tree,'Khu vực','Thủ Đức');submit(tree);
 assert.equal(tree.root.findAllByProps({role:'dialog'}).length,0);
 assert.match(tree.root.findByProps({className:'mm-filter-summary'}).findByType('span').children.join(''),/20:00–21:00/);
 act(()=>byButton(tree,'Tin của đội').props.onClick());
 assert.equal(tree.root.findAllByProps({className:'mm-filter-summary'}).length,1);
 act(()=>byButton(tree,'Bộ lọc •').props.onClick());assert.equal(field(tree,'Khu vực').props.value,'Thủ Đức');
 act(()=>byButton(tree,'Đặt lại').props.onClick());assert.equal(field(tree,'Khu vực').props.value,'');
 assert.equal(tree.root.findAllByProps({className:'mm-filter-summary'}).length,1,'reset remains draft until apply');
 submit(tree);assert.equal(tree.root.findAllByProps({className:'mm-filter-summary'}).length,0);
 act(()=>tree.unmount());
});

test('initial API failure shows retry instead of claiming that no offers exist',()=>{
 globalThis.__mmUIError='Connection failed';let tree;act(()=>{tree=renderer.create(React.createElement(mod.exports.default,{team:{id:'a'},user:{id:'user'}}));});
 assert.equal(tree.root.findAllByProps({role:'alert'}).length,1);assert.ok(byButton(tree,'Thử lại'));assert.equal(tree.root.findAllByProps({className:'mm-empty'}).length,0);
 act(()=>tree.unmount());delete globalThis.__mmUIError;
});
