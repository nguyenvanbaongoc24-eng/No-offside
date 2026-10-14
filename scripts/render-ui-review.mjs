import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const output=await build({absWorkingDir:root,stdin:{resolveDir:root,loader:'jsx',contents:`
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {Home,Network,Wallet,MessageSquare,User} from 'lucide-react';
import Login from './src/pages/Login.jsx';
import FloatingBottomNavigation from './src/components/FloatingBottomNavigation.jsx';
import TeamOnboarding from './src/pages/TeamOnboarding.jsx';
import ClubCodeModal from './src/components/ClubCodeModal.jsx';
import PlayerDashboard from './src/pages/PlayerDashboard.jsx';
import TeamManager from './src/pages/TeamManager.jsx';
import LineupBuilder from './src/pages/LineupBuilder.jsx';
import Fund from './src/pages/FundManagement.jsx';
import Chat from './src/pages/Chat.jsx';
import Profile from './src/pages/ProfileMenu.jsx';
import Settings from './src/pages/TeamSettings.jsx';
import CreateTeam from './src/pages/CreateTeam.jsx';
import MatchForm from './src/components/MatchFormSheet.jsx';
import Appearance from './src/components/AppearanceSettings.jsx';
import BankPicker from './src/components/BankPicker.jsx';
import AddMemberModal from './src/components/AddMemberModal.jsx';
import QrPreview from './src/components/QrPreview.jsx';
import EmptyTeam from './src/pages/EmptyTeam.jsx';
import InviteLanding from './src/pages/InviteLanding.jsx';
import Governance from './src/pages/Governance.jsx';
const noop=()=>{};
const avatar='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" rx="40" fill="#d9ede4"/><text x="40" y="51" text-anchor="middle" font-family="sans-serif" font-size="28" fill="#22503a">M</text></svg>');
const user={id:'usr-9',name:'Minh Anh',number:9,avatar,teamName:'FC No Offside',role:'Tiền đạo',phone:'',height:175,weight:68,fundDebt:0,stats:{matches:12,goals:6,assists:4}};
const members=[user,{...user,id:'usr-10',name:'Hoàng Hải',number:10,roleType:'admin',customTitle:'Thủ quỹ'},{...user,id:'usr-19',name:'Quang Hải',number:19,roleType:'member'},{...user,id:'usr-1',name:'Văn Lâm',number:1,roleType:'member'}].map((m,i)=>({...m,roleType:m.roleType||'owner'}));
const team={id:'ui-review',teamName:'FC No Offside',teamCategory:'Sân 7',logo:avatar,venue:'Sân Chuyên Việt',schedule:'Thứ Sáu · 18:30',members,subAdmins:[members[1]],pendingAdminRequests:[],appearance:{}};
const match={id:'review-match',title:'Kèo sân 7 — FC Sài Gòn',category:'Sân 7',datetime:'2026-10-24T18:30',deadline:'2026-10-24T12:00',venue:'Sân Chuyên Việt · Tân Bình',penaltyEnabled:true,penaltyAmount:'50.000 đ',status:'upcoming'};
const funds={transactions:[{id:'t1',title:'Thu quỹ tháng 10',amount:600000,type:'income',date:'12/10/2026',author:'Thủ quỹ'},{id:'t2',title:'Tiền thuê sân',amount:300000,type:'expense',date:'10/10/2026',author:'Thủ quỹ'}],pendingApprovals:[],debtors:[]};
const preferences={value:{theme:'system',fontFamily:'system',fontSize:'medium'},update:noop};
const common={onCreateInvite:noop,preferences,user,currentUserRole:'owner',demoSession:false,teamSettings:team,members,onNavigate:noop,onBack:noop,onLogout:noop,onUpdateProfile:noop};
const gov={snapshot:null,loading:false,error:'Chưa kết nối nghiệp vụ cho đội này.',serverNow:Date.now(),mutate:noop};
const cases={
 login:<Login/>,
 signup:<Login initialMode="signup"/>,
 memberform:<AddMemberModal isOpen onClose={noop} members={members} onAddMember={noop}/>,
 loading:<Governance governance={{...gov,loading:true,error:""}} onBack={noop}/>,
 qrloading:<QrPreview src={avatar}/>,
 onboarding:<TeamOnboarding user={user} onOpenCreateTeam={noop} onOpenJoinCode={noop} onOpenScanQr={noop}/>,
 join:<ClubCodeModal isOpen onClose={noop} onJoinSuccess={noop} currentUser={user}/>,
 home:<PlayerDashboard {...common} teamId={team.id} matches={[match]} activeMatch={match} attendance={{}} reports={{}} balance={300000} funds={funds} treasurerQr={{}} governance={gov} onOpenNotifications={noop} onAddNotice={noop} onSaveMatch={noop} onSetMatchStatus={noop} onSelectMatch={noop} onDeleteMatch={noop} onApprove={noop} onChangeFunds={noop} onAttendanceChange={noop}/>,
 members:<TeamManager isOpen members={members} currentUserRole="owner" onClose={noop} onOpenInvite={noop}/>,
 tactics:<LineupBuilder {...common} teamId={team.id} accountId="ui-review"/>,
 fund:<Fund funds={funds} currentUserRole="owner" onChangeFunds={noop} onApprove={noop} treasurerQr={{}}/>,
 chat:<Chat user={user} teamName={team.teamName} teamLogo={team.logo} members={members} teamId={team.id} accountId="ui-review"/>,
 profile:<Profile {...common} hasTeam appearancePanel={<Appearance preferences={preferences}/>} accountPanel={<span>Tài khoản</span>} onOpenNotifications={noop}/>,
 editprofile:<Profile {...common} initialDetail="profile" hasTeam onUpdateProfile={noop}/>,
 profilemember:<Profile {...common} currentUserRole="member" hasTeam accountPanel={<span>Tài khoản</span>} appearancePanel={<Appearance preferences={preferences}/>} onOpenNotifications={noop}/>,
 profileadmin:<Profile {...common} currentUserRole="admin" hasTeam accountPanel={<span>Tài khoản</span>} appearancePanel={<Appearance preferences={preferences}/>} onOpenNotifications={noop}/>,
 management:<Profile {...common} initialDetail="management" hasTeam/>,
 missingprofile:<Profile {...common} user={{...user,avatar:"",number:"",role:"",height:undefined,weight:undefined}} initialDetail="profile" hasTeam onUpdateProfile={noop}/>,
 settings:<Settings {...common} onUpdateTeamSettings={noop}/>,
 create:<CreateTeam onBack={noop} onTeamCreated={noop}/>,
 form:<MatchForm canManage isOpen title="Thông tin trận đấu" draft={{opponent:'FC Sài Gòn',datetime:'2026-10-24T18:30',timeoutDatetime:'2026-10-24T12:00',venue:'Sân Chuyên Việt',penaltyEnabled:true,penaltyFine:'50000'}} onChange={noop} onClose={noop} onSubmit={noop}/>,
 empty:<EmptyTeam teamSettings={team} leader onSaveMatch={noop} onNavigate={noop}/>,
 error:<Governance governance={gov} onBack={noop}/>,
 appearance:<Appearance preferences={preferences}/>,
 controls:<section className="settings-card m-4 space-y-4"><h1>Trạng thái control</h1><label className="form-field">Đã nhập<input defaultValue="Tiếng Việt có dấu"/></label><label className="form-field">Placeholder<input placeholder="Nhập nội dung"/></label><label className="form-field">Readonly<input readOnly value="Thông tin chỉ đọc"/></label><label className="form-field">Disabled<input disabled value="Chưa được phép sửa"/></label><label className="form-field">Dropdown<select defaultValue="one"><option value="one">Một lựa chọn</option></select></label><label className="form-field">Lỗi<input aria-invalid="true" defaultValue="Nội dung chưa hợp lệ"/></label><p className="form-error" role="alert">Kiểm tra lại thông tin đã nhập.</p><button className="primary-button" disabled>Đang chờ xử lý</button></section>,
 bank:<BankPicker value="970422" name="MBBank" onChange={noop}/>,
 invite:<InviteLanding teamData={{name:team.teamName,captain:user.name,membersCount:4,venue:team.venue,logo:avatar,category:'Sân 7',code:'UI1234'}} onBackToApp={noop} onRequireAuth={noop}/>
};
cases.profilelong=React.cloneElement(cases.profile,{user:{...user,name:'Nguyễn Hoàng Minh Anh với tên hiển thị rất dài',avatar:''},teamSettings:{...team,teamName:'Câu lạc bộ bóng đá có tên rất dài tại thành phố'}});
cases.profileenglish=React.cloneElement(cases.profile,{preferences:{...preferences,value:{...preferences.value,language:"en"}}});
cases.chatempty=React.cloneElement(cases.chat,{teamId:"empty-test"});
cases.chatlong=React.cloneElement(cases.chat,{teamId:"long-test",teamName:"Đội bóng có tên rất dài tại thành phố và khu vực thi đấu"});
cases.chatenglish=React.cloneElement(cases.chat,{language:"en"});
cases.longhome=React.cloneElement(cases.home,{user:{...user,name:'Nguyễn Hoàng Minh Anh với tên hiển thị dài',teamName:'Đội bóng phong trào thành phố với tên đội rất dài'},activeMatch:{...match,title:'Trận giao hữu với đội bóng có tên dài và nhiều thông tin địa điểm'}});
cases.longfund=React.cloneElement(cases.fund,{funds:{...funds,transactions:[{...funds.transactions[0],title:'Khoản đóng góp cho giải bóng đá giao hữu có tên và ghi chú dài',amount:999999999999}]}});
export const renderNav=()=>renderToStaticMarkup(<FloatingBottomNavigation tabs={[['home','Trang chủ',Home],['tactics','Chiến thuật',Network],['fund','Quỹ đội',Wallet],['chat','Tin nhắn',MessageSquare],['profile','Cá nhân',User]].map(([id,label,Icon])=>({id,label,Icon}))} activeTab="home" onNavigate={noop}/>);
export const render=()=>Object.fromEntries(Object.entries(cases).map(([key,value])=>[key,renderToStaticMarkup(value)]));
`},bundle:true,platform:'node',format:'cjs',write:false,logLevel:'silent',plugins:[{name:'read-only-fixture',setup(b){b.onResolve({filter:/lib\/supabase$/},()=>({path:'supabase-fixture',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export const supabase = null;',loader:'js'}));}}]});
globalThis.localStorage={getItem:key=>key==='no_offside_messages_ui-review::long-test'?JSON.stringify(Array.from({length:30},(_,i)=>({id:'long-'+i,senderId:i%3===0?'usr-9':'usr-10',sender:i%3===0?'Minh Anh':'Người gửi có tên dài Nguyễn Hoàng Hải',text:'Tiếng Việt có dấu và nhiều dòng.\nhttps://example.test/'+('duongdanratdai'.repeat(10)),createdAt:'2026-10-14T09:'+String(i).padStart(2,'0')+':00+07:00'}))):key==='no_offside_messages_ui-review::ui-review'?JSON.stringify([{id:'m1',senderId:'usr-10',sender:'Hoàng Hải',text:'Hẹn cả đội ra sân lúc 18:30. Chúc mọi người một buổi đá vui!',createdAt:'2026-10-13T10:00Z'},{id:'m2',senderId:'usr-9',sender:'Minh Anh',text:'Mình đã nhận thông tin lịch thi đấu.',createdAt:'2026-10-13T10:02Z'}]):null,setItem:()=>{}};
globalThis.sessionStorage={getItem:()=> 'true',setItem:()=>{},removeItem:()=>{}};
globalThis.document={};
const compiled={exports:{}};
new Function('require','module','exports',output.outputFiles[0].text)(createRequire(import.meta.url),compiled,compiled.exports);
globalThis.window={location:{origin:'https://no-offside.vercel.app',pathname:'/'},sessionStorage:globalThis.sessionStorage,innerHeight:844,addEventListener(){},removeEventListener(){},matchMedia:()=>({matches:false,addListener(){},removeListener(){}})};
const cases=compiled.exports.render();
const cssName=(await readdir(root+'dist/assets')).find(name=>name.endsWith('.css'));
const css=await readFile(root+'dist/assets/'+cssName,'utf8');
const nav=compiled.exports.renderNav();
const html='<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>No Offside — Kiểm chứng UI</title><link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&display=swap" rel="stylesheet"><style>'+css+'[hidden]{display:none!important;} [data-screen] [style*="opacity:0"]{opacity:1!important;transform:none!important;}</style></head><body><div class="app-frame max-w-md mx-auto"><div class="session-banner">Kiểm chứng UI · dữ liệu minh họa · nghiệp vụ không hoạt động</div>'+Object.entries(cases).map(([key,markup])=>'<main data-screen="'+key+'" hidden>'+markup+'</main>').join('')+'<div id="review-nav">'+nav+'</div></div><script>const p=new URLSearchParams(location.search);const screen=p.get("screen")||"home";document.documentElement.dataset.theme=p.get("theme")||"light";document.documentElement.dataset.font=p.get("font")||"vietnam";document.documentElement.dataset.fontSize=p.get("size")||"medium";document.querySelectorAll("[data-screen]").forEach(el=>el.hidden=el.dataset.screen!==screen);if(!["home","tactics","fund","chat","profile"].includes(screen))document.getElementById("review-nav").hidden=true;document.addEventListener("submit",e=>e.preventDefault());document.querySelectorAll("button[data-target]").forEach(el=>{if(el.dataset.target===screen)el.setAttribute("aria-current","page");else el.removeAttribute("aria-current")});document.querySelectorAll("button[data-target]").forEach(el=>el.onclick=()=>{p.set("screen",el.dataset.target);location.search=p.toString()});</script></body></html>';
const target = process.argv[2] ? path.resolve(root, process.argv[2]) : root+'.ui-review/ui-review.html';
await mkdir(path.dirname(target),{recursive:true});
await writeFile(target,html);
console.log('Rendered read-only UI cases:',Object.keys(cases).join(', '));
