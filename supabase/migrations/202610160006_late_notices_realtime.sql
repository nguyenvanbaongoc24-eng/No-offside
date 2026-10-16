begin;
-- A small signal table avoids exposing raw workspace finance JSON over Realtime.
create table public.no_team_updates(team_id text primary key references public.no_gov_teams(id),version bigint not null default 0);
alter table public.no_team_updates enable row level security;
revoke all on public.no_team_updates from public,anon,authenticated;
grant select on public.no_team_updates to authenticated;
create policy no_team_updates_read on public.no_team_updates for select to authenticated using(public.no_app_is_member(team_id));
insert into public.no_team_updates(team_id) select team_id from public.no_app_workspaces on conflict do nothing;
create function public.no_team_updated() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.no_team_updates(team_id,version) values(new.team_id,1) on conflict(team_id) do update set version=no_team_updates.version+1;return new;
end $$;
create trigger no_team_updated after insert or update on public.no_app_workspaces for each row execute function public.no_team_updated();
do $$begin if exists(select 1 from pg_publication where pubname='supabase_realtime') then alter publication supabase_realtime add table public.no_team_updates;end if;end $$;

-- Retain the validated cutoff/locked-record rules in the current mutation implementation.
alter function public.no_gov_mutate(text,text,jsonb,uuid) rename to no_gov_mutate_before_named_notices;
revoke all on function public.no_gov_mutate_before_named_notices(text,text,jsonb,uuid) from public,anon,authenticated;
create function public.no_gov_mutate(p_team_id text,p_action text,p_payload jsonb,p_key uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare previous public.no_gov_events;
begin
 if p_action='late_request' then
  perform 1 from public.no_gov_teams where id=p_team_id for update;
  select * into previous from public.no_gov_events where team_id=p_team_id and subject=auth.uid() and match_id=p_payload->>'matchId' and action='late_request' order by seq desc limit 1;
  if previous.id is not null and (previous.data->>'eta')::timestamptz=(p_payload->>'eta')::timestamptz and previous.data->>'reason'=trim(p_payload->>'reason') then return jsonb_build_object('id',previous.id,'action',previous.action,'data',previous.data);end if;
 end if;
 return public.no_gov_mutate_before_named_notices(p_team_id,p_action,p_payload,p_key);
end $$;
revoke all on function public.no_gov_mutate(text,text,jsonb,uuid) from public,anon;
grant execute on function public.no_gov_mutate(text,text,jsonb,uuid) to authenticated;

create function public.no_late_named_notice() returns trigger language plpgsql security definer set search_path='' as $$
declare person public.no_gov_members; mt public.no_gov_matches; recipient public.no_gov_members; title text; body text; changed boolean; eta timestamptz;
begin
 if new.action not in ('late_request','review_late') then return new;end if;
 select * into person from public.no_gov_members where team_id=new.team_id and user_id=new.subject;
 select * into mt from public.no_gov_matches where team_id=new.team_id and id=new.match_id;
 eta:=(new.data->>'eta')::timestamptz;
 changed:=exists(select 1 from public.no_gov_events where team_id=new.team_id and subject=new.subject and match_id=new.match_id and action='late_request' and seq<new.seq);
 title:=person.name || case when person.jersey_number is null then '' else ' · #'||person.jersey_number end ||
  case when new.action='review_late' then case new.data->>'status' when 'approved' then ' được duyệt đến muộn' else ' có yêu cầu muộn bị từ chối' end when changed then ' cập nhật xin đến muộn' else ' xin đến muộn' end;
 body:=mt.title || ' · Bắt đầu ' || to_char(mt.kickoff at time zone 'Asia/Ho_Chi_Minh','HH24:MI - DD/MM/YYYY') ||
  coalesce(' · Dự kiến đến ' || to_char(eta at time zone 'Asia/Ho_Chi_Minh','HH24:MI') || ' (muộn '||greatest(0,ceil(extract(epoch from eta-mt.kickoff)/60))::int||' phút)','') ||
  ' · Lý do: ' || coalesce(new.data->>'reason','') || ' · Gửi lúc ' || to_char(new.created_at at time zone 'Asia/Ho_Chi_Minh','HH24:MI - DD/MM/YYYY');
 for recipient in select * from public.no_gov_members where team_id=new.team_id
  and (status='active' or (status='locked' and locked_until<=clock_timestamp()))
  and ((new.action='late_request' and (role in ('owner','admin') or receive_attendance)) or (new.action='review_late' and (user_id=new.subject or role in ('owner','admin') or receive_attendance))) loop
  perform public.no_fund_notice(new.team_id,recipient.user_id::text,'late-notice:'||new.id||':'||recipient.user_id,title,body,'dashboard',
   jsonb_build_object('kind','late-request','matchId',new.match_id,'memberId',new.subject,'eventId',new.id,'requestStatus',new.data->>'status'));
 end loop;
 return new;
end $$;
create trigger no_late_named_notice after insert on public.no_gov_events for each row execute function public.no_late_named_notice();

-- Notices own late-request push, preventing a second push from the governance event.
create or replace function public.no_push_governance_event() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.action<>'rules' then return new;end if;
 insert into public.no_push_outbox(device_id,generation,recipient,team_id,kind,event_key,governance_event)
 select d.id,d.generation,d.user_id,new.team_id,'governance','governance:'||new.id,new.id from public.no_push_devices d
 join public.no_gov_members m on m.user_id=d.user_id and m.team_id=new.team_id where d.enabled and d.groups->>'governance'='true'
 and d.user_id<>new.actor and (m.status='active' or (m.status='locked' and m.locked_until<=clock_timestamp())) on conflict do nothing;
 return new;
end $$;

-- Keep existing preference, lease, deduplication and privacy checks; only enrich notice presentation.
do $$declare definition text;begin
 definition:=pg_get_functiondef('public.no_push_notice_event()'::regprocedure);
 definition:=replace(definition,$old$category:=case n->>'route'$old$, $new$category:=case when n->>'kind'='late-request' then 'governance' else case n->>'route'$new$);
 definition:=replace(definition,$old$else null end;$old$, $new$else null end end;$new$);
 execute definition;
 definition:=pg_get_functiondef('public.no_push_claim(integer)'::regprocedure);
 definition:=replace(definition,$old$body:=left(coalesce(n->>'title','Có cập nhật mới trong đội'),120);$old$,
  $new$title:=coalesce(n->>'title',title);body:=left(coalesce(n->>'content',n->>'title','Có cập nhật mới trong đội'),500);$new$);
 definition:=replace(definition,$old$'url','/?team='||j.team_id||'&for='||j.recipient::text||'&view='||case when j.kind='messages' then 'chat' when j.kind='funds' then 'fund' when j.kind='governance' then 'governance' else 'dashboard' end$old$,
  $new$'url','/?team='||j.team_id||'&for='||j.recipient::text||'&view='||case when j.notice_id is not null and n->>'kind'='late-request' then 'dashboard' when j.kind='messages' then 'chat' when j.kind='funds' then 'fund' when j.kind='governance' then 'governance' else 'dashboard' end||case when j.notice_id is not null and n->>'kind'='late-request' then '&match='||(n->>'matchId')||'&member='||(n->>'memberId') else '' end$new$);
 execute definition;
end $$;
revoke all on function public.no_team_updated(),public.no_late_named_notice() from public,anon,authenticated;
notify pgrst,'reload schema';
commit;
