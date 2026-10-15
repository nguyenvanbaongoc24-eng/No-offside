begin;
create table public.no_push_devices(
 id uuid primary key,secret_hash text not null,user_id uuid references auth.users(id),endpoint text unique not null,
 subscription jsonb not null,enabled boolean not null default true,generation bigint not null default 1,
 hide_preview boolean not null default true,groups jsonb not null default '{"messages":true,"matches":false,"funds":false,"governance":false}',
 updated_at timestamptz not null default clock_timestamp()
);
create table public.no_chat_presence(user_id uuid not null references auth.users(id),installation_id uuid not null,team_id text not null references public.no_gov_teams(id),visible_until timestamptz not null,primary key(user_id,installation_id));
create table public.no_push_outbox(
 id uuid primary key default gen_random_uuid(),device_id uuid not null references public.no_push_devices(id),generation bigint not null,
 recipient uuid not null references auth.users(id),team_id text not null references public.no_gov_teams(id),kind text not null,
 event_key text not null,message_id uuid references public.no_team_messages(id),notice_id text,governance_event uuid references public.no_gov_events(id),
 state text not null default 'pending',attempts integer not null default 0,available_at timestamptz not null default clock_timestamp(),
 lease_id uuid,lease_until timestamptz,last_status integer,created_at timestamptz not null default clock_timestamp(),
 unique(device_id,generation,event_key)
);
create index no_push_due on public.no_push_outbox(available_at) where state in ('pending','processing');
create table public.no_push_channels(device_id uuid not null,team_id text not null,kind text not null,last_sent_at timestamptz not null,primary key(device_id,team_id,kind));
alter table public.no_push_devices enable row level security;
alter table public.no_chat_presence enable row level security;
alter table public.no_push_outbox enable row level security;
alter table public.no_push_channels enable row level security;
revoke all on public.no_push_devices,public.no_chat_presence,public.no_push_outbox,public.no_push_channels from public,anon,authenticated;

create function public.no_push_secret(p_secret text) returns text language sql immutable set search_path='' as $$ select encode(sha256(convert_to(p_secret,'UTF8')),'hex'); $$;
revoke all on function public.no_push_secret(text) from public,anon,authenticated;

create function public.no_push_register(p_id uuid,p_secret text,p_subscription jsonb,p_groups jsonb,p_hide_preview boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare d public.no_push_devices; key text;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if coalesce(p_subscription->>'endpoint','') !~ '^https://(fcm[.]googleapis[.]com|updates[.]push[.]services[.]mozilla[.]com|([a-zA-Z0-9-]+[.])*push[.]apple[.]com|([a-zA-Z0-9-]+[.])+notify[.]windows[.]com)/' then raise exception 'Unsupported push endpoint' using errcode='22023'; end if;
 if jsonb_typeof(p_subscription) is distinct from 'object' or length(p_subscription::text)>4096 or p_id is null or length(coalesce(p_secret,'')) not between 43 and 128 or length(coalesce(p_subscription->>'endpoint','')) not between 20 and 2048 or jsonb_typeof(p_subscription->'keys') is distinct from 'object' then raise exception 'Invalid subscription' using errcode='22023'; end if;
 -- Server validates the endpoint host and actual key bytes before this RPC.
 select * into d from public.no_push_devices where id=p_id for update;
 if found and d.secret_hash<>public.no_push_secret(p_secret) then raise exception 'Installation proof required' using errcode='42501'; end if;
 if exists(select 1 from public.no_push_devices where endpoint=p_subscription->>'endpoint' and id<>p_id) then raise exception 'Subscription already belongs to another installation' using errcode='23505'; end if;
 if jsonb_typeof(p_groups) is distinct from 'object' then raise exception 'Invalid notification groups' using errcode='22023'; end if;
 for key in select jsonb_object_keys(p_groups) loop
  if key not in ('messages','matches','funds','governance') or jsonb_typeof(p_groups->key)<>'boolean' then raise exception 'Invalid notification group' using errcode='22023'; end if;
 end loop;
 insert into public.no_push_devices(id,secret_hash,user_id,endpoint,subscription,groups,hide_preview)
 values(p_id,public.no_push_secret(p_secret),auth.uid(),p_subscription->>'endpoint',p_subscription,'{"messages":true,"matches":false,"funds":false,"governance":false}'::jsonb || p_groups,coalesce(p_hide_preview,true))
 on conflict(id) do update set user_id=auth.uid(),endpoint=excluded.endpoint,subscription=excluded.subscription,enabled=true,
 generation=case when public.no_push_devices.user_id is distinct from auth.uid() or not public.no_push_devices.enabled then public.no_push_devices.generation+1 else public.no_push_devices.generation end,
 groups=excluded.groups,hide_preview=excluded.hide_preview,updated_at=clock_timestamp();
 return jsonb_build_object('success',true,'enabled',true);
end $$;
revoke all on function public.no_push_register(uuid,text,jsonb,jsonb,boolean) from public,anon;
grant execute on function public.no_push_register(uuid,text,jsonb,jsonb,boolean) to authenticated;

create function public.no_push_device_state(p_id uuid,p_secret text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare d public.no_push_devices;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 select * into d from public.no_push_devices where id=p_id and user_id=auth.uid() and secret_hash=public.no_push_secret(p_secret);
 return jsonb_build_object('success',true,'enabled',coalesce(d.enabled,false),'groups',coalesce(d.groups,'{"messages":true,"matches":false,"funds":false,"governance":false}'),'hidePreview',coalesce(d.hide_preview,true));
end $$;
revoke all on function public.no_push_device_state(uuid,text) from public,anon;
grant execute on function public.no_push_device_state(uuid,text) to authenticated;

-- Capability permits only unlinking this installation, including after JWT expiry.
-- It cannot read subscriptions, attach another user or affect another device.
create function public.no_push_detach(p_id uuid,p_secret text)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 update public.no_push_devices set enabled=false,user_id=null,generation=generation+1,updated_at=clock_timestamp() where id=p_id and secret_hash=public.no_push_secret(p_secret) and (enabled or user_id is not null);
 delete from public.no_chat_presence where installation_id=p_id and exists(select 1 from public.no_push_devices where id=p_id and secret_hash=public.no_push_secret(p_secret));
 return jsonb_build_object('success',true);
end $$;
revoke all on function public.no_push_detach(uuid,text) from public;
grant execute on function public.no_push_detach(uuid,text) to anon,authenticated;

create function public.no_chat_presence_update(p_id uuid,p_team_id text,p_visible boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_visible then
  if not public.no_app_is_member(p_team_id) then raise exception 'Team access denied' using errcode='42501'; end if;
  insert into public.no_chat_presence(user_id,installation_id,team_id,visible_until) values(auth.uid(),p_id,p_team_id,clock_timestamp()+interval '35 seconds') on conflict(user_id,installation_id) do update set team_id=excluded.team_id,visible_until=excluded.visible_until;
 else delete from public.no_chat_presence where user_id=auth.uid() and installation_id=p_id;
 end if;
 return jsonb_build_object('success',true);
end $$;
revoke all on function public.no_chat_presence_update(uuid,text,boolean) from public,anon;
grant execute on function public.no_chat_presence_update(uuid,text,boolean) to authenticated;

create function public.no_push_message_event() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.legacy_unverified then return new; end if;
 insert into public.no_push_outbox(device_id,generation,recipient,team_id,kind,event_key,message_id)
 select d.id,d.generation,d.user_id,new.team_id,'messages','message:'||new.id,new.id from public.no_push_devices d join public.no_gov_members m on m.user_id=d.user_id and m.team_id=new.team_id
 where d.enabled and d.groups->>'messages'='true' and d.user_id is distinct from new.sender_id and (m.status='active' or (m.status='locked' and m.locked_until<=clock_timestamp())) on conflict do nothing;
 return new;
end $$;
revoke all on function public.no_push_message_event() from public,anon,authenticated;
create trigger no_push_message_event after insert on public.no_team_messages for each row execute function public.no_push_message_event();

create function public.no_push_notice_event() returns trigger language plpgsql security definer set search_path='' as $$
declare n jsonb; category text;
begin
 for n in select value from jsonb_array_elements(coalesce(new.data->'notices','[]')) loop
  if exists(select 1 from jsonb_array_elements(coalesce(old.data->'notices','[]')) x where x->>'id'=n->>'id') then continue; end if;
  category:=case n->>'route' when 'dashboard' then 'matches' when 'fund' then 'funds' when 'governance' then 'governance' else null end;
  if category is null or n->>'id' is null then continue; end if;
  insert into public.no_push_outbox(device_id,generation,recipient,team_id,kind,event_key,notice_id)
  select d.id,d.generation,d.user_id,new.team_id,category,'notice:'||(n->>'id'),n->>'id' from public.no_push_devices d join public.no_gov_members m on m.user_id=d.user_id and m.team_id=new.team_id
  where d.enabled and d.groups->>category='true' and d.user_id is distinct from auth.uid() and (m.status='active' or (m.status='locked' and m.locked_until<=clock_timestamp()))
   and (coalesce(n->>'audience','all')='all' or n->>'audience'=d.user_id::text or (n->>'audience'='leaders' and m.role in ('owner','admin'))) on conflict do nothing;
 end loop;
 return new;
end $$;
revoke all on function public.no_push_notice_event() from public,anon,authenticated;
create trigger no_push_notice_event after update of data on public.no_app_workspaces for each row execute function public.no_push_notice_event();

-- Only existing, committed governance events. No synthetic scheduled reminders.
create function public.no_push_governance_event() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.action not in ('rules','late_request','review_late') or (new.action='late_request' and new.data->>'status'<>'pending') then return new;end if;
 insert into public.no_push_outbox(device_id,generation,recipient,team_id,kind,event_key,governance_event)
 select d.id,d.generation,d.user_id,new.team_id,'governance','governance:'||new.id,new.id
 from public.no_push_devices d join public.no_gov_members m on m.user_id=d.user_id and m.team_id=new.team_id
 where d.enabled and d.groups->>'governance'='true' and d.user_id<>new.actor
 and (m.status='active' or (m.status='locked' and m.locked_until<=clock_timestamp()))
 and (new.action='rules' or (new.action='late_request' and m.role in ('owner','admin')) or (new.action='review_late' and d.user_id=new.subject)) on conflict do nothing;
 return new;
end $$;
revoke all on function public.no_push_governance_event() from public,anon,authenticated;
create trigger no_push_governance_event after insert on public.no_gov_events for each row execute function public.no_push_governance_event();

create function public.no_push_claim(p_limit integer default 8)
returns jsonb language plpgsql security definer set search_path='' as $$
declare j public.no_push_outbox; d public.no_push_devices; m public.no_gov_members; c public.no_team_messages; n jsonb; g public.no_gov_events; title text; body text; total bigint; jobs jsonb:='[]'; token uuid;
begin
 delete from public.no_push_outbox where state in ('accepted','coalesced','skipped','failed','expired') and created_at<clock_timestamp()-interval '7 days';
 delete from public.no_chat_presence where visible_until<clock_timestamp()-interval '1 day';
 update public.no_push_outbox set state='failed' where attempts>=4 and state='processing' and lease_until<clock_timestamp();
 for j in select q.* from public.no_push_outbox q where q.attempts<4 and ((q.state='pending' and q.available_at<=clock_timestamp()) or (q.state='processing' and q.lease_until<clock_timestamp()))
  and not exists(select 1 from public.no_push_channels ch where ch.device_id=q.device_id and ch.team_id=q.team_id and ch.kind=q.kind and ch.last_sent_at>clock_timestamp()-interval '30 seconds')
  and not exists(select 1 from public.no_push_outbox newer where newer.device_id=q.device_id and newer.team_id=q.team_id and newer.kind=q.kind and newer.generation=q.generation and newer.state='pending' and (newer.created_at,newer.id)>(q.created_at,q.id))
  order by q.created_at limit least(greatest(p_limit,1),20) for update skip locked loop
  select * into d from public.no_push_devices where id=j.device_id for update;
  if exists(select 1 from public.no_push_outbox other where other.device_id=j.device_id and other.team_id=j.team_id and other.kind=j.kind and other.id<>j.id and other.state='processing' and other.lease_until>clock_timestamp()) then continue;end if;
  select * into m from public.no_gov_members where team_id=j.team_id and user_id=j.recipient;
  if not d.enabled or d.user_id is distinct from j.recipient or d.generation<>j.generation or coalesce(d.groups->>j.kind,'false')<>'true' or m.user_id is null or not (m.status='active' or (m.status='locked' and m.locked_until<=clock_timestamp())) or j.created_at<clock_timestamp()-interval '24 hours' then
   update public.no_push_outbox set state='skipped' where id=j.id;continue;
  end if;
  select name into title from public.no_gov_teams where id=j.team_id;
  if j.kind='messages' then
   select * into c from public.no_team_messages where id=j.message_id;
   if c.id is null or c.sender_id=j.recipient or exists(select 1 from public.no_chat_reads r where r.team_id=j.team_id and r.user_id=j.recipient and greatest(r.joined_sequence,r.last_read_sequence)>=c.sequence) or exists(select 1 from public.no_chat_presence p where p.user_id=j.recipient and p.team_id=j.team_id and p.visible_until>clock_timestamp()) then update public.no_push_outbox set state='skipped' where id=j.id;continue;end if;
   select coalesce(name,'Thành viên') || ': ' || left(c.text,120) into body from public.no_gov_members where team_id=j.team_id and user_id=c.sender_id;
  elsif j.governance_event is not null then
   select * into g from public.no_gov_events where id=j.governance_event and team_id=j.team_id;
   if g.id is null or not (g.action='rules' or (g.action='late_request' and m.role in ('owner','admin')) or (g.action='review_late' and g.subject=j.recipient)) then update public.no_push_outbox set state='skipped' where id=j.id;continue;end if;
   body:=case g.action when 'rules' then 'Đội vừa cập nhật nội quy.' when 'late_request' then 'Có yêu cầu báo muộn cần xem xét.' else 'Yêu cầu báo muộn của bạn có cập nhật.' end;
  else
   select x into n from public.no_app_workspaces w cross join lateral jsonb_array_elements(coalesce(w.data->'notices','[]')) x where w.team_id=j.team_id and x->>'id'=j.notice_id;
   if n is null or not (coalesce(n->>'audience','all')='all' or n->>'audience'=j.recipient::text or (n->>'audience'='leaders' and m.role in ('owner','admin'))) or exists(select 1 from public.no_app_notice_reads r where r.team_id=j.team_id and r.user_id=j.recipient and r.notice_id=j.notice_id) then update public.no_push_outbox set state='skipped' where id=j.id;continue;end if;
   body:=left(coalesce(n->>'title','Có cập nhật mới trong đội'),120);
  end if;
  select coalesce(sum((x->>'unread')::bigint),0) into total from (select jsonb_build_object('unread',count(*)) as x from public.no_team_messages msg join public.no_chat_reads r on r.team_id=msg.team_id and r.user_id=j.recipient join public.no_gov_members gm on gm.team_id=r.team_id and gm.user_id=r.user_id where msg.sender_id is distinct from j.recipient and not msg.legacy_unverified and msg.sequence>greatest(r.joined_sequence,r.last_read_sequence) and (gm.status='active' or (gm.status='locked' and gm.locked_until<=clock_timestamp()))) counts;
  token:=gen_random_uuid();
  update public.no_push_outbox set state='processing',attempts=attempts+1,lease_id=token,lease_until=clock_timestamp()+interval '60 seconds' where id=j.id;
  jobs:=jobs || jsonb_build_array(jsonb_build_object('id',j.id,'lease',token,'deviceId',d.id,'subscription',d.subscription,'payload',jsonb_build_object('eventId',j.event_key,'accountId',j.recipient,'teamId',j.team_id,'kind',j.kind,'title',case when d.hide_preview then 'No Offside' else title end,'body',case when d.hide_preview then case when j.kind='messages' then 'Bạn có tin nhắn mới.' else 'Đội có cập nhật mới.' end else coalesce(body,'Có cập nhật mới trong đội.') end,'unreadTotal',total,'observedAt',clock_timestamp(),'tag',j.kind||':'||j.team_id,'url','/?team='||j.team_id||'&for='||j.recipient::text||'&view='||case when j.kind='messages' then 'chat' when j.kind='funds' then 'fund' when j.kind='governance' then 'governance' else 'dashboard' end)));
 end loop;
 return jobs;
end $$;
revoke all on function public.no_push_claim(integer) from public,anon,authenticated;
grant execute on function public.no_push_claim(integer) to service_role;

create function public.no_push_finish(p_id uuid,p_lease uuid,p_outcome text,p_status integer default null)
returns void language plpgsql security definer set search_path='' as $$
declare j public.no_push_outbox;
begin
 select * into j from public.no_push_outbox where id=p_id and lease_id=p_lease and state='processing' for update;
 if not found then return;end if;
 if p_outcome='accepted' then
  update public.no_push_outbox set state='accepted',last_status=p_status where id=p_id;
  insert into public.no_push_channels values(j.device_id,j.team_id,j.kind,clock_timestamp()) on conflict(device_id,team_id,kind) do update set last_sent_at=excluded.last_sent_at;
  update public.no_push_outbox set state='coalesced' where device_id=j.device_id and generation=j.generation and team_id=j.team_id and kind=j.kind and state='pending' and (created_at,id)<=(j.created_at,j.id);
 elsif p_outcome='expired' then
  update public.no_push_devices set enabled=false,generation=generation+1 where id=j.device_id and generation=j.generation;
  update public.no_push_outbox set state='expired',last_status=p_status where id=p_id;
 else
  update public.no_push_outbox set state=case when attempts>=4 then 'failed' else 'pending' end,available_at=clock_timestamp()+make_interval(secs=>least(3600,30*(2^attempts)::integer)),last_status=p_status where id=p_id;
 end if;
end $$;
revoke all on function public.no_push_finish(uuid,uuid,text,integer) from public,anon,authenticated;
grant execute on function public.no_push_finish(uuid,uuid,text,integer) to service_role;
notify pgrst,'reload schema';
commit;
