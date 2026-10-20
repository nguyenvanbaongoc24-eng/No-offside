// UI-only auth review. Dummy local account metadata; Supabase/OAuth/email are mocked.
import http from 'node:http';
import path from 'node:path';
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {build} from 'esbuild';
const root=process.cwd();
const mock=`const sample=new URLSearchParams(location.search).get('case');
export const supabase={rpc:async()=>({data:{email:'review@example.test',usernameAvailable:true,emailAvailable:true}}),auth:{onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signInWithPassword:async()=>{await new Promise(r=>setTimeout(r,1200));return {error:{message:sample==='network'?'Không thể kết nối. Vui lòng thử lại.':sample==='email'?'Email not confirmed':'Invalid login credentials',code:sample==='email'?'email_not_confirmed':'invalid_credentials'}};},signUp:async()=>({data:{user:{id:'review-only'},session:null}}),signOut:async()=>({}),resend:async()=>({}),resetPasswordForEmail:async()=>({}),signInWithOAuth:async()=>({error:{message:'OAuth mô phỏng: không chuyển đến Google trong preview.'}})}};`;
const output=await build({stdin:{resolveDir:root,loader:'jsx',contents:`
import React,{useState,useEffect} from 'react';import {createRoot} from 'react-dom/client';import Login from './src/pages/Login';import {readStored,writeStored} from './src/lib/storage';
const p=new URLSearchParams(location.search),count=Number(p.get('accounts')||0),themeKey='auth-review-theme';
if(!sessionStorage.getItem('auth-review-seeded')){writeStored('no_offside_remembered_accounts',Array.from({length:count},(_,i)=>({username:i?'review_player_'+i:'Ngocngbao',name:i?'Nguyễn Văn Thành Viên Có Tên Rất Dài '+i:'Ngocngbao',email:'review'+i+'@example.test',accountId:'review-'+i})));sessionStorage.setItem('auth-review-seeded','1');}
function App(){const [theme,setTheme]=useState(()=>readStored(themeKey,p.get('theme')||'light'));useEffect(()=>{document.documentElement.dataset.theme=theme==='system'?(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'):theme;document.documentElement.classList.toggle('dark',document.documentElement.dataset.theme==='dark');writeStored(themeKey,theme);},[theme]);return <Login theme={theme} onThemeChange={setTheme} initialMode={p.get('mode')||'signin'} onLoginSuccess={()=>{}}/>;}createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>);
`},bundle:true,format:'esm',platform:'browser',write:false,plugins:[{name:'auth-transport-mock',setup(b){b.onResolve({filter:/lib\/supabase$/},()=>({path:'client',namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:mock}));}}]});
await mkdir('.ui-review',{recursive:true});await writeFile('.ui-review/auth-review.js',output.outputFiles[0].text);
const css=(await readdir('dist/assets')).find(n=>n.startsWith('index-')&&n.endsWith('.css'));
http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');
if(url.pathname.startsWith('/api/')){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({email:'review@example.test',usernameAvailable:true,emailAvailable:true}));return;}
if(url.pathname==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>No Offside · Auth UI preview (mock auth)</title><link rel="stylesheet" href="/dist/assets/'+css+'"></head><body><div id="root"></div><script type="module" src="/.ui-review/auth-review.js"></script></body></html>');return;}
const target=path.resolve(root,'.'+url.pathname);if(!target.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
const file=await readFile(target).catch(()=>readFile(path.join(root,'public',url.pathname)));res.setHeader('Content-Type',url.pathname.endsWith('.css')?'text/css':url.pathname.endsWith('.js')?'text/javascript':url.pathname.endsWith('.woff2')?'font/woff2':url.pathname.endsWith('.png')?'image/png':'application/octet-stream');res.end(file);
}catch{res.writeHead(404);res.end();}}).listen(5182,'127.0.0.1',()=>console.log('Auth UI preview (mock auth, dummy metadata): http://127.0.0.1:5182/?accounts=3'));
