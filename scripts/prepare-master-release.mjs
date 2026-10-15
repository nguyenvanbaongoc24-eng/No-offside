// Generates a single atomic, additive SQL release. Never connects to production.
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const folder=new URL('../supabase/migrations/',import.meta.url);
const files=(await readdir(folder)).filter(f=>/^20261015000[1-8]_.*\.sql$/.test(f)).sort();
const sources=await Promise.all(files.map(async file=>({file,sql:(await readFile(new URL(file,folder),'utf8')).replace(/\r\n/g,'\n')})));
const digest=createHash('sha256').update(sources.map(s=>s.sql).join('\n')).digest('hex');
const sql="begin;\nset local lock_timeout='10s';\nset local statement_timeout='90s';\n"+sources.map(({file,sql})=>'-- '+file+'\n'+sql.replace(/^\s*(?:begin|commit);\s*$/gmi,'')).join('\n')+`
create table if not exists public.no_app_releases(id text primary key,source_sha256 text not null,applied_at timestamptz not null default clock_timestamp());
alter table public.no_app_releases enable row level security;
revoke all on public.no_app_releases from public,anon,authenticated;
insert into public.no_app_releases(id,source_sha256) values('master-20261015','${digest}');
notify pgrst,'reload schema';
commit;
select id,source_sha256,applied_at from public.no_app_releases where id='master-20261015';
`;
await mkdir(new URL('../.ui-review/',import.meta.url),{recursive:true});
await writeFile(new URL('../.ui-review/master-release.sql',import.meta.url),sql);
await writeFile(new URL('../.ui-review/master-release-manifest.json',import.meta.url),JSON.stringify({files,digest},null,2));
console.log(JSON.stringify({files:files.length,bytes:Buffer.byteLength(sql),sha256:digest}));
// Reproduce the CRLF source bytes used for the applied follow-up receipt.
const followup=(await readFile(new URL('202610150009_manual_profile_privacy.sql',folder),'utf8')).replace(/\r\n/g,'\n').replace(/\n/g,'\r\n');
const followupHash=createHash('sha256').update(followup).digest('hex');
await writeFile(new URL('../.ui-review/master-followup.sql',import.meta.url),'begin;\n'+followup.replace(/^\s*(?:begin|commit);\s*$/gmi,'')+`\ninsert into public.no_app_releases(id,source_sha256) values('master-20261015-privacy','${followupHash}');\nnotify pgrst,'reload schema';\ncommit;\nselect id,source_sha256,applied_at from no_app_releases order by applied_at;`);
console.log(JSON.stringify({followupSha256:followupHash}));
