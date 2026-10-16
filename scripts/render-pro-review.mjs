import { build } from "esbuild";
import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
await mkdir(root + ".ui-review", { recursive: true });
await build({
  absWorkingDir: root,
  stdin: {
    resolveDir: root,
    loader: "jsx",
    contents: `import React,{useState} from 'react';import {createRoot} from 'react-dom/client';import ProHub from './src/pages/ProHub';import FeedbackToast from './src/components/FeedbackToast';import {useDialogAccessibility} from './src/hooks/useDialogAccessibility';
const params=new URLSearchParams(location.search);document.documentElement.dataset.theme=params.get('theme')||'light';
const user={id:'preview-a',name:'Nguyễn Minh Anh',number:9,role:'Tiền đạo',avatar:'/pwa-192x192.png'},second={id:'preview-b',name:'Trần Quốc Bảo',number:17,role:'Tiền vệ'},team={id:'preview-fc',teamName:'FC No Offside',logo:'/pwa-192x192.png',venue:'Sân Chuyên Việt',members:[user,second]},matches=[{id:'preview-match',title:'Giao hữu FC 37',opponent:'FC 37',datetime:new Date(Date.now()+86400000).toISOString(),venue:'Sân Chuyên Việt',status:'upcoming'},{id:'played',title:'No Offside — FC Đồng Đội',opponent:'FC Đồng Đội',datetime:new Date(Date.now()-3600000).toISOString(),status:'completed'}];
function Preview(){useDialogAccessibility();const [state,setState]=useState({awards:[],policy:{yellow:true,late:false,absence:false},reports:{},stats:[{subject:user.id,match_id:'played',goals:2,assists:1},{subject:second.id,match_id:'played',goals:1,assists:2}],votes:[],participation:[{match_id:'played',subject:user.id},{match_id:'played',subject:second.id}],media:[],bills:[],offers:[{id:'offer-sample',team_id:'other-fc',teamName:'FC Đồng Đội',district:'Bình Thạnh',level:'regular',kickoff:matches[0].datetime,venue:'Sân Chuyên Việt',format:7,finance:'split'}],challenges:[],charges:[{id:'sample-debt',subject:user.id,kind:'third',label:'Giao lưu sau trận',amount:100000,status:'owed'},{id:'sample-fine',subject:second.id,kind:'fine',label:'Thẻ vàng · Giao hữu',amount:50000,status:'owed'}]});
const pro={state,demo:false,busy:false,loading:false,error:'',refresh:async()=>{},mutate:async(action,payload)=>{if(action==='policy')setState(s=>({...s,policy:payload}));return {success:true};}};
return <div className="app-shell"><div className="app-frame app-has-navigation" style={{maxWidth:480,width:'100%',margin:'auto'}}><p className="session-banner">Preview dữ liệu mẫu · không gửi request nghiệp vụ</p><ProHub pro={pro} team={team} user={user} role="owner" matches={matches} initialSection={params.get('section')||'board'} onBack={()=>{}} onNavigate={()=>{}}/><FeedbackToast/></div></div>};createRoot(document.getElementById('root')).render(<Preview/>);`,
  },
  bundle: true,
  platform: "browser",
  format: "esm",
  outfile: root + ".ui-review/pro.js",
});
await writeFile(
  root + ".ui-review/pro.html",
  `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><link rel="stylesheet" href="/src/styles/index.css"><link rel="stylesheet" href="/src/styles/refinement.css"><link rel="stylesheet" href="/src/styles/soft-ui.css"><link rel="stylesheet" href="/src/styles/pro.css"><title>No Offside Pro — Preview</title></head><body><div id="root"></div><script type="module" src="./pro.js?v=${Date.now()}"></script></body></html>`,
);
