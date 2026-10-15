// Prepare one additive transaction; never rerun the baseline schema in production.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url);
const source=(await Promise.all(['202610150011_chat_unread.sql','202610150012_web_push.sql'].map(name=>readFile(new URL('supabase/migrations/'+name,root),'utf8')))).join('\n');
const digest=createHash('sha256').update(source).digest('hex');
const body=source.replace(/^\s*(?:begin|commit);\s*$/gmi,'');
const sql=`begin;
create temporary table no_push_release_before on commit drop as select
 (select count(*) from public.no_gov_teams) teams,
 (select count(*) from public.no_gov_members) memberships,
 (select count(*) from public.profiles) profiles,
 (select count(*) from public.no_team_messages) messages;
${body}
do $$ begin
 if exists(select 1 from no_push_release_before b where b.teams<>(select count(*) from public.no_gov_teams) or b.memberships<>(select count(*) from public.no_gov_members) or b.profiles<>(select count(*) from public.profiles) or b.messages<>(select count(*) from public.no_team_messages)) then raise exception 'Business row count changed; abort release';end if;
end $$;
insert into public.no_app_releases(id,source_sha256) values('push-20261015','${digest}');
commit;
select id,source_sha256,applied_at,
 (select count(*) from public.no_push_devices) as push_devices,
 (select count(*) from public.no_push_outbox) as push_jobs,
 (select count(*) from public.no_chat_reads) as read_markers
from public.no_app_releases where id='push-20261015';
`;
await mkdir(new URL('.ui-review/',root),{recursive:true});
await writeFile(new URL('.ui-review/push-release.sql',root),sql);
console.log('Prepared additive push release, SHA256 '+digest);
