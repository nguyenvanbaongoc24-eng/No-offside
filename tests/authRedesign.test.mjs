import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import renderer,{act} from 'react-test-renderer';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
const compiled=await build({stdin:{resolveDir:process.cwd(),loader:'jsx',contents:"export {default as Login} from './src/pages/Login';"},bundle:true,platform:'node',format:'cjs',external:['react'],write:false,plugins:[{name:'auth-ui-boundaries',setup(b){b.onResolve({filter:/lib\/supabase$/},()=>({path:'auth',namespace:'test'}));b.onResolve({filter:/pro\/ProModal$/},()=>({path:'modal',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},args=>({loader:'jsx',contents:args.path==='auth'?"export const supabase=new Proxy({},{get:(_,key)=>globalThis.__authUiClient[key]});":"import React from 'react';export default function Modal({children,title}){return <section role='dialog' aria-label={title}>{children}</section>;}"}));}}]});
const mod={exports:{}};new Function('require','module','exports',compiled.outputFiles[0].text)(createRequire(import.meta.url),mod,mod.exports);const {Login}=mod.exports;
const text=n=>typeof n==='string'||typeof n==='number'?String(n):Array.isArray(n)?n.map(text).join(''):n?.props?text(n.props.children):'';
const button=(tree,label)=>tree.root.findAllByType('button').find(b=>text(b.props.children)===label);
const input=(tree,id)=>tree.root.findByProps({id});
function environment(accounts=[]){const data=new Map([['no_offside_remembered_accounts',JSON.stringify(accounts)]]);globalThis.localStorage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};globalThis.window={location:{search:'',hash:'',pathname:'/',origin:'https://review.example.test'},history:{replaceState(){}},matchMedia:()=>({matches:false,addEventListener(){},removeEventListener(){}})};globalThis.document={documentElement:{lang:'vi'},addEventListener(){},removeEventListener(){},getElementById:()=>({focus(){}})};globalThis.requestAnimationFrame=fn=>fn();globalThis.__authUiClient={auth:{onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},rpc:async()=>({data:{usernameAvailable:true,emailAvailable:true}})};return data;}
function cleanup(tree){if(tree)act(()=>tree.unmount());for(const key of ['window','document','localStorage','requestAnimationFrame','__authUiClient'])delete globalThis[key];}
const person=(username,name=username)=>({username,name,email:username+'@example.test',accountId:'test-'+username});

test('remembered account selection only fills username; forgetting is local-only and persists on remount',()=>{
 const storage=environment([person('first'),person('second','Tên thành viên rất dài')]);let tree,logins=0;
 try{act(()=>tree=renderer.create(React.createElement(Login,{onLoginSuccess:()=>logins++})));
  act(()=>tree.root.findAllByType('button').find(b=>b.props.className==='auth-account-row').props.onClick());
  assert.equal(input(tree,'login-username').props.value,'first');assert.equal(input(tree,'login-password').props.value,'');assert.equal(logins,0);
  act(()=>button(tree,'Đổi tài khoản').props.onClick());assert.equal(tree.root.findAllByProps({role:'dialog'}).length,1);
  act(()=>tree.root.findAllByType('button').find(b=>b.props['aria-label']==='Quên tài khoản trên thiết bị này · first').props.onClick({stopPropagation(){}}));
  assert.deepEqual(JSON.parse(storage.get('no_offside_remembered_accounts')).map(a=>a.username),['second']);assert.equal(logins,0);
  act(()=>tree.unmount());act(()=>tree=renderer.create(React.createElement(Login,{})));assert.equal(button(tree,'Đổi tài khoản'),undefined);assert.ok(button(tree,'Quản lý tài khoản trên thiết bị'));
  assert.ok(!JSON.stringify(tree.toJSON()).includes('Tiếp tục với first'));
 }finally{cleanup(tree);}
});

test('theme and language controls preserve every signup field and password policy',()=>{
 environment();let tree,theme;
 try{act(()=>tree=renderer.create(React.createElement(Login,{initialMode:'signup',theme:'light',onThemeChange:v=>theme=v})));
  for(const [id,value] of [['signup-name','Tên thử nghiệm'],['signup-email','review@example.test'],['signup-username','review_name'],['signup-password','123456'],['signup-confirm-password','123456']])act(()=>input(tree,id).props.onChange({target:{value}}));
  act(()=>input(tree,'theme-select-btn').props.onClick());act(()=>button(tree,'Tối').props.onClick());assert.equal(theme,'dark');
  act(()=>tree.update(React.createElement(Login,{initialMode:'signup',theme:'dark',onThemeChange:v=>theme=v})));
  act(()=>input(tree,'language-select-btn').props.onClick());act(()=>button(tree,'English').props.onClick());
  assert.equal(input(tree,'signup-name').props.value,'Tên thử nghiệm');assert.equal(input(tree,'signup-email').props.value,'review@example.test');assert.equal(input(tree,'signup-username').props.value,'review_name');
  for(const id of ['signup-password','signup-confirm-password']){assert.equal(input(tree,id).props.value,'123456');assert.equal(input(tree,id).props.maxLength,6);assert.equal(input(tree,id).props.autoComplete,'new-password');}
  assert.ok(button(tree,'Sign in'));assert.equal(tree.root.findAllByProps({role:'listbox'}).length,0);
 }finally{cleanup(tree);}
});

test('duplicate sign-in submits make one request; failures and unconfirmed email retain the form without success',async()=>{
 environment();let tree,resolve,calls=0,logins=0;
 __authUiClient.auth.signInWithPassword=()=>{calls++;return new Promise(r=>resolve=r);};
 try{act(()=>tree=renderer.create(React.createElement(Login,{onLoginSuccess:()=>logins++})));
  act(()=>input(tree,'login-username').props.onChange({target:{value:'review@example.test'}}));act(()=>input(tree,'login-password').props.onChange({target:{value:'123456'}}));
  let a,b;act(()=>{a=tree.root.findByType('form').props.onSubmit({preventDefault(){}});b=tree.root.findByType('form').props.onSubmit({preventDefault(){}});});assert.equal(calls,1);assert.ok(tree.root.findAllByType('button').filter(b=>b.props.type==='submit').every(b=>b.props.disabled));
  await act(async()=>{resolve({error:{message:'Invalid login credentials'}});await Promise.all([a,b]);});assert.equal(logins,0);assert.equal(input(tree,'login-username').props.value,'review@example.test');assert.equal(input(tree,'login-password').props.value,'123456');assert.ok(tree.root.findAllByProps({role:'alert'}).some(n=>text(n.props.children).includes('không chính xác')));
  __authUiClient.auth.signInWithPassword=async()=>({error:{message:'Email not confirmed',code:'email_not_confirmed'}});
  await act(async()=>tree.root.findByType('form').props.onSubmit({preventDefault(){}}));assert.ok(tree.root.findAllByProps({role:'alert'}).some(n=>text(n.props.children).includes('Email của bạn chưa được xác minh')));assert.ok(button(tree,'Gửi lại email xác minh'));assert.equal(logins,0);
  act(()=>input(tree,'language-select-btn').props.onClick());act(()=>button(tree,'English').props.onClick());assert.ok(tree.root.findAllByProps({role:'alert'}).some(n=>text(n.props.children).includes('Your email is not verified')));assert.ok(button(tree,'Resend verification email'));
 }finally{cleanup(tree);}
});

test('signup retains its original payload and returns to sign-in; Google, recovery and demo keep their handlers',async()=>{
 environment();let tree,payload,oauth,recovery,demo;const priorFetch=globalThis.fetch;
 globalThis.fetch=async()=>({ok:true,json:async()=>({usernameAvailable:true,emailAvailable:true})});
 __authUiClient.auth.signUp=async value=>{payload=value;return{data:{user:{id:'review-only'},session:null}};};
 __authUiClient.auth.signInWithOAuth=async value=>{oauth=value;return{};};
 __authUiClient.auth.resetPasswordForEmail=async(...value)=>{recovery=value;return{error:{message:'Lỗi mạng thử nghiệm'}};};
 try{act(()=>tree=renderer.create(React.createElement(Login,{initialMode:'signup',onLoginSuccess:value=>demo=value})));
  for(const [id,value] of [['signup-name','Tên thử nghiệm'],['signup-email','review@example.test'],['signup-username','review_name'],['signup-password','123456'],['signup-confirm-password','123456']])act(()=>input(tree,id).props.onChange({target:{value}}));
  await act(async()=>tree.root.findByType('form').props.onSubmit({preventDefault(){}}));assert.equal(payload.options.data.username,'review_name');assert.equal(payload.password,'123456');assert.equal(input(tree,'login-username').props.value,'review_name');assert.equal(input(tree,'login-password').props.value,'');assert.ok(tree.root.findAllByProps({role:'status'}).some(n=>text(n.props.children).includes('Đăng ký thành công')));
  await act(async()=>input(tree,'google-signin-btn').props.onClick());assert.equal(oauth.provider,'google');assert.equal(oauth.options.redirectTo,'https://review.example.test');
  act(()=>button(tree,'Quên mật khẩu?').props.onClick());act(()=>input(tree,'forgot-email').props.onChange({target:{value:'review@example.test'}}));await act(async()=>tree.root.findByType('form').props.onSubmit({preventDefault(){}}));assert.equal(recovery[0],'review@example.test');assert.match(recovery[1].redirectTo,/#reset-password$/);assert.ok(tree.root.findAllByProps({role:'alert'}).some(n=>text(n.props.children).includes('Lỗi mạng')));
  act(()=>tree.root.findAllByType('button').find(b=>b.props['aria-label']==='Quay lại đăng nhập').props.onClick());act(()=>input(tree,'demo-signin-btn').props.onClick());assert.deepEqual(demo,{demo:true});
 }finally{globalThis.fetch=priorFetch;cleanup(tree);}
});
