// Disposable integration fixture. Real UI/API/PostgreSQL; auth and push transport mocked.
import http from 'node:http';
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import {build} from 'esbuild';
import {createMasterDb,asUser,rpc,owner,member,outsider} from '../tests/helpers/masterDb.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const db=await createMasterDb();await db.exec(await readFile(root+'supabase/migrations/202610190001_match_lifecycle.sql','utf8'));
await db.exec(await readFile(root+'supabase/migrations/202610200001_product_audit.sql','utf8'));
const team='match-review';await asUser(db,owner);await rpc(db,'no_app_create_team',[team,'FC No Offside',{}]);
await db.exec('reset role');await db.query("insert into no_gov_members(team_id,user_id,name,role,status,jersey_number) values($1,$2,'Thành viên kiểm thử','member','active',10),($1,$3,'Quản trị kiểm thử','admin','active',8)",[team,member,outsider]);
if(process.env.REVIEW_LONG_LIST==='1') {
 for(let n=1;n<=24;n++) {
  const id=randomUUID();
  await db.query("insert into auth.users(id,email) values($1,$2)",[id,'review'+n+'@example.test']);
  await db.query("insert into public.no_gov_members(team_id,user_id,name,role,status,jersey_number) values($1,$2,$3,'member','active',$4)",[team,id,'Thành viên kiểm thử tên dài '+n,n+20]);
 }
}
await asUser(db,owner);
if(process.env.REVIEW_LONG_LIST==='1') {
 await db.exec('reset role');
 const recipients=(await db.query("select user_id::text as id from no_gov_members where team_id=$1",[team])).rows.map(x=>x.id);
 await asUser(db,owner);
 await rpc(db,'no_fund_action',[team,'schedule_save',{title:'Quỹ tháng 10/2026',amount:100001,recipients,repeat:'once',day:20,sendAt:new Date().toISOString(),dueDate:new Date(Date.now()+864e5).toISOString().slice(0,10)},randomUUID()]);
}
const future={id:'future',title:'Giao hữu · Đang tìm đối',opponent:'',matchType:'friendly',venue:'',modelVersion:2,status:'upcoming',datetime:new Date(Date.now()+864e5).toISOString(),deadline:new Date(Date.now()+8e7).toISOString(),endsAt:new Date(Date.now()+9e7).toISOString(),expectedPitch:1200000,expectedOther:0,paymentPlan:'mixed',penaltyEnabled:false};
await rpc(db,'no_app_commit',[team,(await rpc(db,'no_app_snapshot',[team])).revision,randomUUID(),{matches:[future,{...future,id:'past',title:'Giao hữu với FC Bình Minh',opponent:'FC Bình Minh',venue:'Sân An Phú'}]}]);
await db.exec('reset role');const kickoff=new Date(Date.now()-7200000).toISOString(),deadline=new Date(Date.now()-108e5).toISOString(),end=new Date(Date.now()-3600000).toISOString();
await db.query("update no_app_workspaces set data=jsonb_set(data,'{matches}',(select jsonb_agg(case when x->>'id'='past' then x||jsonb_build_object('datetime',$2::text,'deadline',$3::text,'endsAt',$4::text) else x end) from jsonb_array_elements(data->'matches') x)) where team_id=$1",[team,kickoff,deadline,end]);
await db.query("update no_gov_matches set kickoff=$2,attendance_deadline=$3 where team_id=$1 and id='past'",[team,kickoff,deadline]);
await db.query("insert into no_gov_rules(team_id,version,content,effective_at,actor) values($1,99,'Nội quy kiểm thử có hiệu lực trước trận',$2,$3)",[team,new Date(Date.now()-864e5).toISOString(),owner]);
const order={no_match_action:['p_team','p_match','p_action','p_payload','p_key'],no_app_commit:['p_team_id','p_revision','p_key','p_patch'],no_gov_mutate:['p_team_id','p_action','p_payload','p_key'],no_fund_action:['p_team','p_action','p_payload','p_key']};
const compiled=await build({entryPoints:[root+'api/sync.js'],bundle:true,platform:'node',format:'cjs',write:false,plugins:[{name:'local-boundaries',setup(b){b.onResolve({filter:/_storageHelper\.js$/},()=>({path:'auth',namespace:'fixture'}));b.onResolve({filter:/_push\.js$/},()=>({path:'push',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:a.path==='push'?"export async function dispatchAfterCommit(){return {configured:false}}":`export const getAdminClient=()=>{throw Error('No production access')};export const readJson=x=>x;export const getUserClient=r=>r.client;export const getAuthUser=async r=>({id:r.actor});export const bearerToken=r=>r.actor;export const setCorsHeaders=()=>{};export const apiError=(r,e)=>r.status(e.code==='42501'?403:400).json({error:e.message});`}));}}]});
const mod={exports:{}};new Function('require','module','exports',compiled.outputFiles[0].text)(createRequire(import.meta.url),mod,mod.exports);
const front=await build({stdin:{resolveDir:root,loader:'jsx',contents:`
import React,{useState,useEffect,useRef} from 'react';import{createRoot}from'react-dom/client';
import Fund from './src/pages/FundManagement';import FundSummary from './src/components/DashboardFundSummary';import Detail from './src/pages/MatchDetail';import Form from './src/components/MatchFormSheet';import{useFundCollections}from'./src/hooks/useFundCollections';import{normalizeMatchDraft,matchDraft}from'./src/lib/matchLifecycle';import{useDialogAccessibility}from'./src/hooks/useDialogAccessibility';import Toast from'./src/components/FeedbackToast';
const params=new URLSearchParams(location.search),account=({member:'${member}',admin:'${outsider}',owner:'${owner}'})[params.get('role')||'owner'],token='fixture-'+account,team='${team}';document.documentElement.dataset.theme=params.get('theme')||'light';document.documentElement.classList.toggle('dark',params.get('theme')==='dark');document.documentElement.dataset.font='vietnam';document.documentElement.dataset.fontSize=params.get('size')||'medium';
async function request(body){const r=await fetch('/api/sync',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw Error(d.error);return d;}
function App(){useDialogAccessibility();const [snapshot,setSnapshot]=useState(null),[gov,setGov]=useState(null),[id,setId]=useState(params.get('case')||'future'),[form,setForm]=useState(null),[error,setError]=useState(''),retry=useRef(null);
const refresh=async()=>{const r=await fetch('/fixture',{headers:{Authorization:'Bearer '+token}});const d=await r.json();setSnapshot(d.workspace);setGov(d.governance);};useEffect(()=>{refresh();const t=setInterval(refresh,5000);return()=>clearInterval(t);},[]);
const fund=useFundCollections({teamId:team,accountId:account,token,onUpdated:refresh});
const save=async(draft,editId)=>{const normalized=normalizeMatchDraft(draft);const signature=JSON.stringify([draft,editId]);if(retry.current?.signature!==signature)retry.current={signature,id:editId||crypto.randomUUID(),key:crypto.randomUUID()};const selected=retry.current.id;const m={...(snapshot.data.matches.find(m=>m.id===selected)||{}),...normalized,id:selected,status:'upcoming',title:normalized.matchType==='internal'?'Trận nội bộ':'Giao hữu · '+(normalized.opponent||'Đang tìm đối'),penaltyEnabled:draft.penaltyEnabled,penaltyAmount:String(draft.penaltyFine||0)+' đ',lateConfig:draft.lateConfig};await request({action:'commit',teamId:team,revision:snapshot.revision,requestKey:retry.current.key,patch:{matches:[...snapshot.data.matches.filter(m=>m.id!==selected),m]}});retry.current=null;setId(selected);setForm(null);await refresh();};
if(!snapshot||!gov)return <p>Đang tải dữ liệu kiểm thử…</p>;
const governance={snapshot:gov,receivedAt:Date.now(),refresh,loading:false,mutate:async(action,payload,key)=>{const result=await request({action:'governance',teamId:team,governanceAction:action,payload,requestKey:key||crypto.randomUUID()});await refresh();return result;}};
if(params.get('view')==='fund')return <><main className="app-frame" style={{maxWidth:600,margin:'auto'}}><p className="p-4">Preview dùng một lần · {params.get('role')||'owner'} · auth/push giả lập</p><FundSummary fund={fund} accountId={account} members={snapshot.team.members} balance={snapshot.data.funds.transactions.filter(t=>t.status!=='void').reduce((n,t)=>n+(t.type==='income'?1:-1)*Number(t.amount),0)} onOpen={()=>{}}/><Fund fund={fund} accountId={account} teamMembers={snapshot.team.members} funds={snapshot.data.funds} currentUserRole={gov.me.role} teamName={snapshot.team.teamName} timeZone="Asia/Ho_Chi_Minh" onBack={()=>{}}/></main><Toast/></>;
return <><main className="app-frame" style={{maxWidth:448,margin:'auto'}}><div className="p-4"><p>Preview · dữ liệu dùng một lần · {params.get('role')||'owner'}</p><button className="choice-button" onClick={()=>setForm(matchDraft({},snapshot.team))}>Tạo trận kiểm thử</button></div><Detail key={account+id} team={snapshot.team} matchId={id} accountId={account} token={token} fund={fund} governance={governance} onUpdated={async()=>{await refresh();await fund.refresh();}} onBack={()=>setId('future')} onOpenRules={()=>alert('Nội quy')} onOpenFund={()=>alert('Quỹ đội liên kết')} onSaveMatch={save} onDuplicate={m=>setForm(matchDraft(m,snapshot.team,true))} onRegistration={async status=>{await request({action:'commit',teamId:team,revision:snapshot.revision,requestKey:crypto.randomUUID(),patch:{attendance:{...snapshot.data.attendance,[id]:{...snapshot.data.attendance[id],[account]:status}}}});await refresh();}}/>
{form&&<Form draft={form} onChange={setForm} error={error} onClose={()=>setForm(null)} onSubmit={async e=>{e.preventDefault();try{await save(form);}catch(e){setError(e.message);}}}/>}</main><Toast/></>;}
createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>);
`},bundle:true,format:'esm',platform:'browser',write:false,plugins:[{name:'no-production-realtime',setup(b){b.onResolve({filter:/lib\/supabase$/},()=>({path:'supabase',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export const supabase=null;'}));}}]});
await mkdir(root+'.ui-review',{recursive:true});await writeFile(root+'.ui-review/match-review.js',front.outputFiles[0].text);
const css=(await readdir(root+'dist/assets')).find(name=>name.startsWith('index-')&&name.endsWith('.css'));
const html='<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>No Offside · Match integration preview</title><link rel="stylesheet" href="/dist/assets/'+css+'"></head><body><div id="root"></div><script type="module" src="/.ui-review/match-review.js"></script></body></html>';
let serial=Promise.resolve();http.createServer((req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1');
 if(url.pathname==='/api/sync'||url.pathname==='/fixture'){
  let body='';req.on('data',c=>body+=c);req.on('end',()=>{serial=serial.then(async()=>{
   const actor=(req.headers.authorization||'').replace('Bearer fixture-','');if(![owner,member,outsider].includes(actor)){res.writeHead(401);res.end('{}');return;}
   await asUser(db,actor);res.status=c=>{res.statusCode=c;return res;};res.json=value=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(value));return res;};
   if(url.pathname==='/fixture'){res.json({workspace:await rpc(db,'no_app_snapshot',[team]),governance:await rpc(db,'no_gov_snapshot',[team])});return;}
   req.actor=actor;req.body=JSON.parse(body||'{}');req.client={rpc:async(name,args)=>{try{return{data:await rpc(db,name,order[name].map(k=>args[k]))};}catch(error){return{error};}}};await mod.exports.default(req,res);
  }).catch(e=>{res.writeHead(500);res.end(JSON.stringify({error:e.message}));});});return;
 }
 if(url.pathname==='/'){res.setHeader('Content-Type','text/html');res.end(html);return;}
 const target=path.resolve(root,'.'+url.pathname);if(!target.startsWith(path.resolve(root)+path.sep)){res.writeHead(403);res.end();return;}
 readFile(target).catch(()=>readFile(path.join(root,'public',url.pathname))).then(data=>{res.setHeader('Content-Type',url.pathname.endsWith('.css')?'text/css':url.pathname.endsWith('.js')?'text/javascript':url.pathname.endsWith('.woff2')?'font/woff2':'application/octet-stream');res.end(data);}).catch(()=>{res.writeHead(404);res.end();});
}).listen(5179,'127.0.0.1',()=>console.log('Disposable match UI/API/DB: http://127.0.0.1:5179/?case=past&role=owner&theme=light'));
