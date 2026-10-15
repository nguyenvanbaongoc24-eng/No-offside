import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import renderer,{act} from 'react-test-renderer';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import {chatScope,messageGroup,dayLabel} from '../src/lib/chatPresentation.js';
const storage=new Map(), listeners={}; let deny=false;
globalThis.localStorage={getItem:key=>storage.get(key)||null,setItem:(key,value)=>{if(deny)throw Error('Quota');storage.set(key,value);}};
globalThis.document={body:{style:{}},activeElement:null,addEventListener(){},removeEventListener(){}};
globalThis.window={innerHeight:844,location:{origin:'http://fixture.local'},addEventListener:(key,fn)=>listeners[key]=fn,removeEventListener:(key)=>delete listeners[key],dispatchEvent:()=>{}};
const built=await build({stdin:{contents:"export {default as Chat} from './src/pages/Chat.jsx';export {default as Profile} from './src/pages/ProfileMenu.jsx';export {default as Details} from './src/pages/ProfileDetails.jsx';export {default as Avatar} from './src/components/Avatar.jsx';export {default as InviteShare} from './src/components/InviteShare.jsx';export {useScrollNavigation} from './src/hooks/useScrollNavigation.js';",resolveDir:process.cwd(),loader:'jsx'},bundle:true,platform:'node',format:'cjs',write:false,external:['react']});
const mod={exports:{}};new Function('require','module','exports',built.outputFiles[0].text)(createRequire(import.meta.url),mod,mod.exports);
const {Chat,Profile,Details,Avatar,InviteShare,useScrollNavigation}=mod.exports;
const user={id:'u1',name:'Minh Anh',number:9,role:'ST',height:175,weight:68,avatar:'',stats:{matches:2,goals:1,assists:0}};
const props={user,members:[user],teamId:'team-one',accountId:'account-one',birthdayEnabled:false};
const texts=tree=>JSON.stringify(tree.toJSON());
function mountChat(){const list={scrollTop:0,scrollHeight:1800,clientHeight:400}, inputNode={style:{},scrollHeight:44};let tree;act(()=>{tree=renderer.create(React.createElement(Chat,props),{createNodeMock:el=>el.props.className==='conversation-stream'?list:el.type==='textarea'?inputNode:null});});return {tree,list,inputNode};}
test('message grouping and date separators respect sender, day and time gap',()=>{
 const list=[{senderId:'a',createdAt:'2026-10-14T09:00:00'},{senderId:'a',createdAt:'2026-10-14T09:01:00'},{senderId:'b',createdAt:'2026-10-14T09:02:00'},{senderId:'b',createdAt:'2026-10-15T09:02:00'}];
 assert.equal(messageGroup(list,1).showSender,false);assert.equal(messageGroup(list,2).showSender,true);assert.equal(messageGroup(list,3).newDay,true);
 assert.equal(dayLabel('2026-10-14T08:00:00',new Date('2026-10-14T12:00:00')),'Hôm nay');assert.notEqual(chatScope('a','b'),chatScope('b','a'));
});
test('local send trims whitespace, rejects empty and duplicate submissions, and persists exact account/team scope',async()=>{
 storage.clear();deny=false;const {tree}=mountChat();const submit=()=>tree.root.findByType('form').props.onSubmit({preventDefault(){}});
 act(()=>submit());assert.equal(JSON.parse(storage.get('no_offside_messages_account-one::team-one')).length,0);
 act(()=>tree.root.findByType('textarea').props.onChange({target:{value:'  Xin chào\nđồng đội  '}}));act(()=>submit());await act(async()=>{});act(()=>submit());
 const data=JSON.parse(storage.get('no_offside_messages_account-one::team-one'));assert.equal(data.length,1);assert.equal(data[0].text,'Xin chào\nđồng đội');assert.equal(tree.root.findByType('textarea').props.value,'');assert.doesNotMatch(texts(tree),/Đã đọc|Đã nhận/);act(()=>tree.unmount());
});
test('storage failure preserves draft and does not append a supposedly sent message',()=>{
 storage.clear();deny=false;const {tree}=mountChat();act(()=>tree.root.findByType('textarea').props.onChange({target:{value:'Tin cần giữ'}}));deny=true;
 act(()=>tree.root.findByType('form').props.onSubmit({preventDefault(){}}));assert.equal(tree.root.findByType('textarea').props.value,'Tin cần giữ');assert.equal(tree.root.findAllByProps({role:'alert'}).length,1);assert.equal(JSON.parse(storage.get('no_offside_messages_account-one::team-one')).length,0);deny=false;act(()=>tree.unmount());
});
test('switching team resets draft/history; new messages do not move a reader away from old messages',()=>{
 storage.clear();const {tree,list}=mountChat();list.scrollTop=30;act(()=>tree.root.findByProps({className:'conversation-stream'}).props.onScroll());
 act(()=>listeners.storage({key:'no_offside_messages_account-one::team-one',newValue:JSON.stringify([{id:'received',senderId:'other',sender:'Đồng đội',text:'Tin mới',createdAt:'2026-10-14T09:00:00'}])}));assert.equal(list.scrollTop,30);assert.match(texts(tree),/Tin nhắn mới/);
 act(()=>tree.root.findByType('textarea').props.onChange({target:{value:'Draft đội cũ'}}));act(()=>tree.update(React.createElement(Chat,{...props,teamId:'team-two'})));assert.equal(tree.root.findByType('textarea').props.value,'');assert.doesNotMatch(texts(tree),/Tin mới/);assert.equal(JSON.parse(storage.get('no_offside_messages_account-one::team-two')).length,0);act(()=>tree.unmount());
});
test('personal management stays separate and member has no administrative actions',()=>{
 let tree;act(()=>tree=renderer.create(React.createElement(Profile,{user,teamSettings:{teamName:'FC',members:[]},currentUserRole:'member',onNavigate(){},hasTeam:true,onLogout(){}})));assert.doesNotMatch(texts(tree),/Quản lý đội|Phân quyền/);act(()=>tree.unmount());
 act(()=>tree=renderer.create(React.createElement(Profile,{user,teamSettings:{teamName:'FC',members:[],pendingAdminRequests:[]},currentUserRole:'owner',onNavigate(){},hasTeam:true,onLogout(){},initialDetail:'management'})));assert.match(texts(tree),/Phân quyền và quản trị/);act(()=>tree.unmount());
});
test('edit profile awaits success/failure, keeps typed data on rejection and never invents missing metrics',async()=>{
 let tree;const blank={...user,number:undefined,height:undefined,weight:undefined};act(()=>tree=renderer.create(React.createElement(Details,{user:blank,teamSettings:{members:[],subAdmins:[]},onUpdateProfile:async()=>{throw Error('Lưu thất bại');}})));
 assert.equal(tree.root.findByProps({id:'profile-height'}).props.value,'');assert.equal(tree.root.findByProps({id:'profile-number'}).props.value,'');
 act(()=>tree.root.findByProps({id:'profile-name'}).props.onChange({target:{value:'Tên đã sửa'}}));await act(async()=>await tree.root.findByType('form').props.onSubmit({preventDefault(){}}));assert.equal(tree.root.findByProps({id:'profile-name'}).props.value,'Tên đã sửa');assert.equal(tree.root.findAllByProps({role:'alert'}).length,1);assert.equal(tree.root.findAllByProps({role:'status'}).length,0);act(()=>tree.unmount());
});

test('keyboard viewport hides navigation callback, restores on close and cleans listeners',()=>{
 const callbacks=new Map();let keyboard=false;window.innerWidth=390;window.visualViewport={height:844,offsetTop:0,addEventListener:(type,fn)=>callbacks.set(type,fn),removeEventListener:type=>callbacks.delete(type)};
 let inputNode,tree;act(()=>tree=renderer.create(React.createElement(Chat,{...props,onKeyboardChange:value=>keyboard=value}),{createNodeMock:el=>el.type==='textarea'?(inputNode={style:{},scrollHeight:44}):null}));
 document.activeElement=inputNode;window.visualViewport.height=520;act(()=>callbacks.get('resize')());assert.equal(keyboard,true);assert.match(texts(tree),/chat-keyboard-open/);
 document.activeElement=null;window.visualViewport.height=844;act(()=>callbacks.get('resize')());assert.equal(keyboard,false);act(()=>tree.unmount());assert.equal(callbacks.size,0);assert.equal(keyboard,false);delete window.visualViewport;
});

test('avatar falls back to initials when image fails',()=>{
 let tree;act(()=>tree=renderer.create(React.createElement(Avatar,{src:'invalid-test-image',name:'Minh Anh'})));act(()=>tree.root.findByType('img').props.onError());assert.match(texts(tree),/avatar-fallback/);assert.match(texts(tree),/MA/);act(()=>tree.unmount());
});
test('profile save stays pending until its callback succeeds',async()=>{
 let finish,tree;const pending=new Promise(resolve=>finish=resolve);
 act(()=>tree=renderer.create(React.createElement(Details,{user,teamSettings:{members:[],subAdmins:[]},onUpdateProfile:()=>pending})));
 let submission;act(()=>submission=tree.root.findByType('form').props.onSubmit({preventDefault(){}}));assert.equal(tree.root.findAllByProps({role:'status'}).length,0);assert.ok(tree.root.findAllByType('button').some(b=>b.props.disabled));
 await act(async()=>{finish();await submission;});assert.equal(tree.root.findAllByProps({role:'status'}).length,1);assert.equal(tree.root.findAllByType('form').length,1);act(()=>tree.unmount());
});

test('personal invite status updates only after revoke/regenerate callback acknowledgement',async()=>{
 let tree;act(()=>tree=renderer.create(React.createElement(Profile,{user,teamSettings:{id:'team-one',teamName:'FC',inviteCode:'QA1234'},currentUserRole:'owner',hasTeam:true,onCreateInvite:async()=>({code:'QA5678'}),onRevokeInvite:async()=>({success:true}),onLogout(){}})));
 await act(async()=>await tree.root.findByProps({teamCode:'QA1234'}).props.onRevokeInvite());assert.equal(tree.root.findByProps({teamCode:'QA1234'}).props.inviteStatus,'revoked');
 await act(async()=>await tree.root.findByProps({teamCode:'QA1234'}).props.onCreateInvite());assert.equal(tree.root.findByProps({teamCode:'QA5678'}).props.inviteStatus,'active');act(()=>tree.unmount());
});

test('personal invitation opens immediately, reports denied server permission in sheet, and retries without fake code',async()=>{
 let tree, rejectRequest, calls=0;
 const request=new Promise((_,reject)=>rejectRequest=reject);
 const create=()=>{calls++;return calls===1 ? request : Promise.resolve({code:'SERVER42',teamId:'team-one'});};
 act(()=>tree=renderer.create(React.createElement(Profile,{user,teamSettings:{id:'team-one',teamName:'FC'},currentUserRole:'owner',onNavigate(){},onCreateInvite:create})));
 let pending;act(()=>pending=tree.root.findByProps({className:'profile-quick-grid'}).findAllByType('button')[1].props.onClick());
 assert.equal(tree.root.findByType(InviteShare).props.isOpen,true);assert.equal(tree.root.findByType(InviteShare).props.loading,true);assert.equal(tree.root.findAllByProps({className:'invite-qr'}).length,0);
 await act(async()=>{rejectRequest(Error('Chỉ quản trị viên có quyền'));await pending;});
 assert.match(texts(tree),/Chỉ quản trị viên có quyền/);assert.equal(tree.root.findByType(InviteShare).props.loading,false);
 await act(async()=>await tree.root.findByType(InviteShare).props.onRetry());assert.equal(tree.root.findByType(InviteShare).props.teamCode,'SERVER42');assert.equal(calls,2);act(()=>tree.unmount());
});
test('late invitation for previous team never becomes the code of the next team',async()=>{
 let tree,finish;const request=new Promise(resolve=>finish=resolve);
 const common={user,currentUserRole:'owner',onNavigate(){},onCreateInvite:()=>request};
 act(()=>tree=renderer.create(React.createElement(Profile,{...common,teamSettings:{id:'one',teamName:'One'}})));
 let pending;act(()=>pending=tree.root.findByProps({className:'profile-quick-grid'}).findAllByType('button')[1].props.onClick());
 act(()=>tree.update(React.createElement(Profile,{...common,teamSettings:{id:'two',teamName:'Two'}})));
 await act(async()=>{finish({code:'OLD123',teamId:'one'});await pending;});assert.equal(tree.root.findByType(InviteShare).props.teamCode,'');assert.equal(tree.root.findByType(InviteShare).props.teamName,'Two');act(()=>tree.unmount());
});
test('clipboard failure never reports copied; share fallback copies the exact team link and does not open another app',async()=>{
 let copied='', opened=false,tree;
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{clipboard:{writeText:async()=>{throw Error('denied');}}}});
 window.open=()=>opened=true;
 act(()=>tree=renderer.create(React.createElement(InviteShare,{teamName:'FC',teamCode:'REAL42',onClose(){}})));
 await act(async()=>await tree.root.findByProps({'aria-label':'Sao chép liên kết mời'}).props.onClick());assert.match(texts(tree),/Không sao chép được/);assert.doesNotMatch(texts(tree),/Đã sao chép liên kết/);
 navigator.clipboard.writeText=async value=>copied=value;
 const shareButton=tree.root.findAllByType('button').find(b=>b.props.className==='primary-button invite-share-action');
 await act(async()=>await shareButton.props.onClick());assert.equal(copied,'http://fixture.local/invite/REAL42');assert.equal(opened,false);assert.match(texts(tree),/Đã sao chép liên kết để chia sẻ/);act(()=>tree.unmount());
});

test('cached invitation is checked against the selected team and cannot share a revoked or wrong-team link',async()=>{
 let tree,checks=0;
 act(()=>tree=renderer.create(React.createElement(Profile,{user,teamSettings:{id:'right',teamName:'Right',inviteCode:'STALE'},currentUserRole:'owner',onNavigate(){},onCreateInvite:async()=>({code:'NEW',teamId:'right'}),onReadInvite:async(code,id)=>{checks++;assert.equal(id,'right');return {valid:true,teamId:'other',code};}})));
 await act(async()=>await tree.root.findByProps({className:'profile-quick-grid'}).findAllByType('button')[1].props.onClick());
 assert.equal(checks,1);assert.equal(tree.root.findByType(InviteShare).props.inviteStatus,'revoked');assert.equal(tree.root.findAllByProps({className:'invite-qr'}).length,0);assert.ok(tree.root.findByProps({'aria-label':'Sao chép liên kết mời'}).props.disabled);act(()=>tree.unmount());
});
test('repeated invitation taps share one pending request and server code must match team',async()=>{
 let tree,finish,calls=0;const request=new Promise(resolve=>finish=resolve);
 act(()=>tree=renderer.create(React.createElement(Profile,{user,teamSettings:{id:'right',teamName:'Right'},currentUserRole:'owner',onNavigate(){},onCreateInvite:()=>{calls++;return request;}})));
 const button=tree.root.findByProps({className:'profile-quick-grid'}).findAllByType('button')[1];let first,second;
 act(()=>{first=button.props.onClick();second=button.props.onClick();});assert.equal(calls,1);
 await act(async()=>{finish({code:'BAD',teamId:'other'});await Promise.all([first,second]);});assert.equal(tree.root.findByType(InviteShare).props.teamCode,'');assert.match(texts(tree),/không thuộc đội đang chọn/);act(()=>tree.unmount());
});

test('document navigation hides for keyboard, restores without scroll jump, cleans listeners and does not listen to chat stream',()=>{
 let keyboard=0,tree;const resizeListeners=new Map(),frames=[];
 globalThis.getComputedStyle=()=>({getPropertyValue:()=>String(keyboard)});
 globalThis.requestAnimationFrame=fn=>{frames.push(fn);return frames.length;};globalThis.cancelAnimationFrame=()=>{};
 document.documentElement={scrollHeight:2000};document.querySelector=()=>null;
 window.scrollY=240;window.visualViewport={addEventListener:(name,fn)=>resizeListeners.set(name,fn),removeEventListener:name=>resizeListeners.delete(name)};
 function Demo({route}){const [visible]=useScrollNavigation(route);return React.createElement('span',{'data-visible':visible});}
 act(()=>tree=renderer.create(React.createElement(Demo,{route:'profile'})));
 keyboard=300;act(()=>{resizeListeners.get('resize')();frames.shift()();});assert.equal(tree.root.findByType('span').props['data-visible'],false);assert.equal(window.scrollY,240);
 keyboard=0;act(()=>{resizeListeners.get('resize')();frames.shift()();});assert.equal(tree.root.findByType('span').props['data-visible'],true);
 act(()=>tree.update(React.createElement(Demo,{route:'chat'})));assert.equal(resizeListeners.size,0);assert.equal(listeners.scroll,undefined);act(()=>tree.unmount());delete window.visualViewport;
});

test('navigating between personal views clears stale errors and management renders cleanly', async () => {
  let tree;
  act(() => {
    tree = renderer.create(
      React.createElement(Profile, {
        user,
        teamSettings: { id: 'team-one', teamName: 'FC', members: [] },
        currentUserRole: 'owner',
        hasTeam: true,
        onNavigate: () => {},
        onCreateInvite: async () => { throw new Error('Could not find the function public.no_gov_create_invite(p_team_id) in the schema cache'); },
        onLogout: () => {},
      })
    );
  });
  const inviteSpan = tree.root.findAllByType('span').find(s => s.children.includes('Mời thành viên'));
  assert.ok(inviteSpan);
  await act(async () => {
    await inviteSpan.parent.props.onClick();
  });
  assert.match(texts(tree), /no_gov_create_invite/);

  const mgmtSpan = tree.root.findAllByType('span').find(s => s.children.includes('Quản lý đội'));
  assert.ok(mgmtSpan);
  act(() => {
    mgmtSpan.parent.props.onClick();
  });
  assert.match(texts(tree), /Phân quyền và quản trị/);
  assert.doesNotMatch(texts(tree), /no_gov_create_invite/);
  act(() => tree.unmount());
});

test('clicking Mời thành viên in personal menu opens InviteShare modal with Club code and QR', async () => {
  let tree;
  act(() => {
    tree = renderer.create(
      React.createElement(Profile, {
        user,
        teamSettings: { id: 'team-one', teamName: 'FC Sài Gòn', inviteCode: 'SG9999', members: [] },
        currentUserRole: 'owner',
        hasTeam: true,
        onNavigate: () => {},
        onCreateInvite: async () => ({ code: 'SG9999' }),
        onLogout: () => {},
      })
    );
  });
  const inviteSpan = tree.root.findAllByType('span').find(s => s.children.includes('Mời thành viên'));
  assert.ok(inviteSpan);
  await act(async () => {
    await inviteSpan.parent.props.onClick();
  });
  assert.match(texts(tree), /SG9999/);
  assert.match(texts(tree), /Mời thành viên/);
  assert.match(texts(tree), /Sao chép mã Club/);assert.match(texts(tree), /invite-qr/);
  act(() => tree.unmount());
});



test('local captain/owner hints do not override the current verified team role',()=>{
 let tree;act(()=>tree=renderer.create(React.createElement(Profile,{user:{...user,isCaptain:true,roleType:'owner'},teamSettings:{id:'one',ownerId:user.id,teamName:'FC'},currentUserRole:'member',onNavigate(){},onCreateInvite:async()=>({code:'NEVER'})})));
 assert.doesNotMatch(texts(tree),/Quản lý đội|Mời thành viên/);act(()=>tree.unmount());
});

test('chat mentions support keyboard selection, persist the draft, and emoji insertion does not send',()=>{
 storage.clear();deny=false;const {tree}=mountChat();
 act(()=>tree.root.findByType('textarea').props.onChange({target:{value:'Xin chào @Minh',selectionStart:14}}));
 const choices=tree.root.findAll(node=>node.type==='button' && node.props.role==='option');assert.equal(choices.length,1);
 act(()=>tree.root.findByType('textarea').props.onKeyDown({key:'Enter',preventDefault(){},nativeEvent:{isComposing:false}}));
 assert.equal(tree.root.findByType('textarea').props.value,'Xin chào @Minh Anh ');assert.equal(JSON.parse(storage.get('no_offside_draft_account-one::team-one')),'Xin chào @Minh Anh ');
 act(()=>tree.root.findAllByType('button').find(b=>b.props['aria-label']==='Mở biểu cảm').props.onClick());
 act(()=>tree.root.findAllByType('button').find(b=>b.props['aria-label']==='Chèn ⚽').props.onClick());
 assert.equal(tree.root.findByType('textarea').props.value,'Xin chào @Minh Anh ⚽');assert.equal(JSON.parse(storage.get('no_offside_messages_account-one::team-one')).length,0);act(()=>tree.unmount());
});

test('profile Back restores the profile parent entry instead of dashboard, including browser Back',()=>{
 const entries=[{noOffsideTab:'profile'}];let index=0;
 window.history={get state(){return entries[index];},replaceState(state){entries[index]=state;},pushState(state){entries.splice(++index);entries[index]=state;},back(){index--;listeners.popstate({state:entries[index]});}};
 let tree;act(()=>tree=renderer.create(React.createElement(Profile,{user,teamSettings:{teamName:'FC',members:[]},currentUserRole:'member',hasTeam:true,onNavigate(){},onLogout(){}})));
 act(()=>tree.root.findAllByType('button').find(b=>b.findAllByType('strong').some(s=>s.children.includes('Thành tích của tôi'))).props.onClick());assert.equal(window.history.state.noOffsideTab,'profile');assert.equal(window.history.state.noOffsideDetail,'stats');
 act(()=>tree.root.findAllByType('button').find(b=>b.props['aria-label']==='Quay lại Cá nhân').props.onClick());assert.equal(window.history.state.noOffsideTab,'profile');assert.equal(tree.root.findAllByProps({className:'profile-hero'}).length,1);
 act(()=>tree.unmount());delete window.history;
});


test('birthday field loads existing calendar day, saves without UTC conversion, and rejects future values',async()=>{
 let tree,saved,calls=0;act(()=>{tree=renderer.create(React.createElement(Details,{user:{...user,birthday:'2000-02-29'},teamSettings:{members:[],subAdmins:[]},onUpdateProfile:async value=>{saved=value;calls++;}}));});
 const birthday=()=>tree.root.findByProps({id:'profile-birthday'});assert.equal(birthday().props.value,'2000-02-29');assert.match(texts(tree),/29\/02\/2000/);
 act(()=>birthday().props.onInput({currentTarget:{value:'1990-12-31'}}));await act(async()=>{await tree.root.findByType('form').props.onSubmit({preventDefault(){}});});assert.equal(saved.birthday,'1990-12-31');assert.equal(calls,1);
 act(()=>birthday().props.onChange({target:{value:'2999-01-01'}}));await act(async()=>{await tree.root.findByType('form').props.onSubmit({preventDefault(){}});});assert.equal(calls,1);assert.match(texts(tree),/tương lai/);
 act(()=>birthday().props.onInput({currentTarget:{value:''}}));await act(async()=>{await tree.root.findByType('form').props.onSubmit({preventDefault(){}});});assert.equal(saved.birthday,'');act(()=>tree.unmount());
});
