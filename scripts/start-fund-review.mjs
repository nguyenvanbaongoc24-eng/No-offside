// Disposable local integration fixture: actual API handler + PostgreSQL RPC/RLS.
// Authentication and push transport are replaced; no production tokens/data/network writes.
import http from "node:http";
import { build } from "esbuild";
import { createRequire } from "node:module";
import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  createMasterDb,
  asUser,
  rpc,
  owner,
  member,
  outsider,
} from "../tests/helpers/masterDb.mjs";
const root = fileURLToPath(new URL("../", import.meta.url));
if (!process.argv.includes("--render-only")) {
  const db = await createMasterDb();
  await asUser(db, owner);
  await rpc(db, "no_app_create_team", ["fund-review-a", "Đội kiểm thử A", {}]);
  await asUser(db, outsider);
  await rpc(db, "no_app_create_team", ["fund-review-b", "Đội kiểm thử B", {}]);
  await db.exec("reset role");
  for (const team of ["fund-review-a", "fund-review-b"])
    await db.query(
      "insert into no_gov_members(team_id,user_id,name,role,status,jersey_number) values($1,$2,'Thành viên kiểm thử','member','active',10)",
      [team, member],
    );
  const order = {
    no_fund_action: ["p_team", "p_action", "p_payload", "p_key"],
    no_app_payment: [
      "p_team_id",
      "p_action",
      "p_payment_id",
      "p_reason",
      "p_key",
    ],
    no_gov_mutate: ["p_team_id", "p_action", "p_payload", "p_key"],
  };
  const compiled = await build({
    absWorkingDir: root,
    entryPoints: ["api/sync.js"],
    bundle: true,
    format: "cjs",
    platform: "node",
    write: false,
    plugins: [
      {
        name: "local-boundaries",
        setup(b) {
          b.onResolve({ filter: /_storageHelper\.js$/ }, () => ({
            path: "auth",
            namespace: "fixture",
          }));
          b.onResolve({ filter: /_push\.js$/ }, () => ({
            path: "push",
            namespace: "fixture",
          }));
          b.onLoad({ filter: /.*/, namespace: "fixture" }, (args) => ({
            contents:
              args.path === "push"
                ? "export async function dispatchAfterCommit(){return {configured:false}};"
                : `export const getAdminClient=()=>{throw Error("No production admin in fixture")};export const readJson=value=>typeof value==='string'?JSON.parse(value):value;export const getUserClient=req=>req.client;export const getAuthUser=async req=>({id:req.actor});export const bearerToken=req=>req.actor;export const setCorsHeaders=()=>{};export const apiError=(res,e)=>res.status(e.code==='42501'?403:400).json({error:e.message});`,
          }));
        },
      },
    ],
  });
  const mod = { exports: {} };
  new Function("require", "module", "exports", compiled.outputFiles[0].text)(
    createRequire(import.meta.url),
    mod,
    mod.exports,
  );
  let serial = Promise.resolve();
  const server = http.createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:5174");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      serial = serial
        .then(async () => {
          const actor = (req.headers.authorization || "").replace(
            /^Bearer review-/,
            "",
          );
          if (![owner, member, outsider].includes(actor)) {
            res.writeHead(401);
            res.end("{}");
            return;
          }
          await asUser(db, actor);
          req.actor = actor;
          req.body = body ? JSON.parse(body) : {};
          res.status = (code) => {
            res.statusCode = code;
            return res;
          };
          res.json = (value) => {
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(value));
            return res;
          };
          const url = new URL(req.url, "http://127.0.0.1:5175");
          if (url.pathname === "/review/workspace")
            return res.json(
              await rpc(db, "no_app_snapshot", [url.searchParams.get("team")]),
            );
          if (url.pathname !== "/api/sync")
            return res.status(404).json({ error: "Local fixture only" });
          req.client = {
            rpc: async (name, args) => {
              try {
                return {
                  data: await rpc(
                    db,
                    name,
                    order[name].map((key) => args[key]),
                  ),
                  error: null,
                };
              } catch (error) {
                return { data: null, error };
              }
            },
          };
          await mod.exports.default(req, res);
        })
        .catch((e) => {
          if (!res.writableEnded) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: e.message }));
          }
        });
    });
  });
  await new Promise((resolve) => server.listen(5175, "127.0.0.1", resolve));
  process.on("SIGINT", async () => {
    server.close();
    await db.close();
    process.exit(0);
  });
}
const front = await build({
  absWorkingDir: root,
  stdin: {
    resolveDir: root,
    loader: "jsx",
    contents: `
import React,{useState,useEffect} from 'react';import {createRoot} from 'react-dom/client';
import Fund from './src/pages/FundManagement';import FundOperations from './src/components/FundOperations';import {useFundCollections} from './src/hooks/useFundCollections';import FloatingBottomNavigation from './src/components/FloatingBottomNavigation';import QuickActions from './src/components/QuickActions';import FeedbackToast from './src/components/FeedbackToast';import {useDialogAccessibility} from './src/hooks/useDialogAccessibility';import {Home,Network,MessageSquare,User} from './src/components/icons';
const users=${JSON.stringify({ owner, member, outsider })};
function Preview(){const [account,setAccount]=useState(new URLSearchParams(location.search).get('account')==='member'?users.member:users.owner),[team,setTeam]=useState('fund-review-a'),[snapshot,setSnapshot]=useState(null),[theme,setTheme]=useState(new URLSearchParams(location.search).get('theme')||'light'),[font,setFont]=useState(new URLSearchParams(location.search).get('font')||'medium'),[quick,setQuick]=useState(false),[intent,setIntent]=useState(null);const token='review-'+account;
 const refresh=async()=>{const r=await fetch('http://127.0.0.1:5175/review/workspace?team='+team,{headers:{Authorization:'Bearer '+token}});const data=await r.json();if(!r.ok)throw Error(data.error);setSnapshot(data);};
 const fund=useFundCollections({teamId:team,accountId:account,token,onUpdated:refresh});useDialogAccessibility();
 useEffect(()=>{setSnapshot(null);refresh().catch(()=>{});},[account,team]);useEffect(()=>{document.documentElement.dataset.theme=theme;document.documentElement.dataset.fontSize=font;document.documentElement.dataset.font='vietnam';},[theme,font]);
 const click=id=>{setQuick(false);if(['reminder','bill','collection'].includes(id))setIntent({id:crypto.randomUUID(),action:id});if(id==='finance')setIntent({id:crypto.randomUUID(),action:'bill'});};
 return <><div className="app-frame app-scroll-frame app-has-navigation mx-auto max-w-md">{new URLSearchParams(location.search).get("controls")!=="hidden" && <header className="session-banner"><strong>Kiểm thử cục bộ · DB dùng một lần · không có push thật</strong><label>Tài khoản<select aria-label="Tài khoản kiểm thử" value={account} onChange={e=>setAccount(e.target.value)}><option value={users.owner}>Chủ đội A</option><option value={users.member}>Thành viên / Thủ quỹ</option><option value={users.outsider}>Chủ đội B</option></select></label><label>Đội<select aria-label="Đội kiểm thử" value={team} onChange={e=>setTeam(e.target.value)}><option value="fund-review-a">Đội A</option><option value="fund-review-b">Đội B</option></select></label><button onClick={()=>setTheme(t=>t==='light'?'dark':'light')}>Đổi Light/Dark</button><button onClick={()=>setFont(s=>s==='large'?'medium':'large')}>Đổi cỡ chữ</button></header>}
 {!snapshot?<p>Đang tải / tài khoản không thuộc đội.</p>:fund.data.canManage?<Fund key={account+team} fund={fund} fundIntent={intent} onFundIntentUsed={()=>setIntent(null)} accountId={account} teamMembers={snapshot.team.members} funds={snapshot.data.funds} currentUserRole={snapshot.role} actor={snapshot.team.members.find(m=>m.id===account)?.name} treasurerQr={snapshot.team.treasurerQr||{}} onApprove={()=>{}} onReject={()=>{}}/>:<main className="p-4"><h1>Khoản đóng của bạn</h1><FundOperations fund={fund} mode="collections" accountId={account} permissions={snapshot.team.members}/><FundOperations fund={fund} mode="charges" accountId={account} permissions={snapshot.team.members}/></main>}
 <FloatingBottomNavigation tabs={[{id:'home',label:'Trang chủ',Icon:Home},{id:'tactics',label:'Chiến thuật',Icon:Network},{id:'chat',label:'Chat',Icon:MessageSquare},{id:'profile',label:'Tài khoản',Icon:User}]} activeTab="fund" canManage={fund.data.canManage} onNavigate={()=>{}} onQuickActions={()=>setQuick(true)}/>
 <QuickActions open={quick} onClose={()=>setQuick(false)} role={snapshot?.role} fundManager={fund.data.canManage} treasurer={fund.data.treasurer} onAction={click}/></div><FeedbackToast/></>;
}createRoot(document.getElementById('root')).render(<Preview/>);
`,
  },
  bundle: true,
  format: "esm",
  platform: "browser",
  write: false,
  plugins: [
    {
      name: "local-transport",
      setup(b) {
        b.onResolve({ filter: /lib\/supabase$/ }, () => ({
          path: "supabase",
          namespace: "fixture",
        }));
        b.onResolve({ filter: /lib\/serverRequest$/ }, () => ({
          path: "request",
          namespace: "fixture",
        }));
        b.onLoad({ filter: /.*/, namespace: "fixture" }, (args) => ({
          contents:
            args.path === "supabase"
              ? "export const supabase=null;"
              : "export async function serverRequest(path,options){const response=await fetch('http://127.0.0.1:5175'+path,options);return {response,data:await response.json()};}",
        }));
      },
    },
  ],
});
await mkdir(root + ".ui-review", { recursive: true });
await writeFile(
  root + ".ui-review/fund-integration.js",
  front.outputFiles[0].text,
);
await writeFile(
  root + ".ui-review/fund-integration.html",
  '<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>No Offside · Fund integration review</title>' +
    ["index", "refinement", "soft-ui", "pro", "matchCard", "fundCollections"]
      .map(
        (name) => '<link rel="stylesheet" href="/src/styles/' + name + '.css">',
      )
      .join("") +
    '</head><body><div id="root"></div><script type="module" src="./fund-integration.js"></script></body></html>',
);
console.log(
  "Disposable database API: http://127.0.0.1:5175 · UI: http://localhost:5174/.ui-review/fund-integration.html",
);
