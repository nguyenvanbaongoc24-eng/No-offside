-- Account-level notification preferences and non-destructive team lifecycle.
begin;
create table public.no_notification_preferences (
 user_id uuid primary key references auth.users(id) on delete cascade,
 enabled boolean not null default true,
 groups jsonb not null default '{"messages":true,"matches":false,"funds":false,"governance":false}',
 hide_preview boolean not null default true,
 updated_at timestamptz not null default clock_timestamp()
);
alter table public.no_notification_preferences enable row level security;
revoke all on public.no_notification_preferences from public,anon,authenticated;
-- Preserve the most recently saved device preference for existing accounts.
insert into public.no_notification_preferences(user_id,groups,hide_preview)
select distinct on(user_id) user_id,groups,hide_preview from public.no_push_devices where user_id is not null order by user_id,updated_at desc,id;
-- Align existing installations once; per-device permission/enabled flags stay unchanged.
update public.no_push_devices d set groups=p.groups,hide_preview=p.hide_preview
from public.no_notification_preferences p where p.user_id=d.user_id
and (d.groups is distinct from p.groups or d.hide_preview is distinct from p.hide_preview);

create function public.no_notification_settings(p_patch jsonb default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare pref public.no_notification_preferences; k text;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_patch is not null then
  if jsonb_typeof(p_patch)<>'object' or exists(select 1 from jsonb_object_keys(p_patch) x where x not in ('enabled','groups','hidePreview')) then raise exception 'Invalid preferences' using errcode='22023';end if;
  if (p_patch ? 'enabled' and jsonb_typeof(p_patch->'enabled')<>'boolean') or (p_patch ? 'hidePreview' and jsonb_typeof(p_patch->'hidePreview')<>'boolean') then raise exception 'Invalid setting' using errcode='22023';end if;
  if p_patch ? 'groups' then
   if jsonb_typeof(p_patch->'groups')<>'object' then raise exception 'Invalid groups' using errcode='22023';end if;
   for k in select jsonb_object_keys(p_patch->'groups') loop
    if k not in ('messages','matches','funds','governance') or jsonb_typeof(p_patch->'groups'->k)<>'boolean' then raise exception 'Invalid group' using errcode='22023';end if;
   end loop;
  end if;
 end if;
 insert into public.no_notification_preferences(user_id) values(auth.uid()) on conflict do nothing;
 select * into pref from public.no_notification_preferences where user_id=auth.uid() for update;
 if p_patch is not null then
  update public.no_notification_preferences set enabled=coalesce((p_patch->>'enabled')::boolean,enabled),groups=groups || coalesce(p_patch->'groups','{}'),hide_preview=coalesce((p_patch->>'hidePreview')::boolean,hide_preview),updated_at=clock_timestamp() where user_id=auth.uid() returning * into pref;
  update public.no_push_devices set groups=pref.groups,hide_preview=pref.hide_preview,updated_at=clock_timestamp() where user_id=auth.uid();
 end if;
 return jsonb_build_object('success',true,'preferences',jsonb_build_object('enabled',pref.enabled,'groups',pref.groups,'hidePreview',pref.hide_preview));
end $$;
revoke all on function public.no_notification_settings(jsonb) from public,anon;
grant execute on function public.no_notification_settings(jsonb) to authenticated;
-- Registration on another device must not overwrite account preferences.
create function public.no_push_apply_preferences() returns trigger language plpgsql security definer set search_path='' as $$
declare pref public.no_notification_preferences;
begin
 select * into pref from public.no_notification_preferences where user_id=new.user_id;
 if found then new.groups:=pref.groups;new.hide_preview:=pref.hide_preview;end if;
 return new;
end $$;
revoke all on function public.no_push_apply_preferences() from public,anon,authenticated;
create trigger no_push_apply_preferences before insert or update on public.no_push_devices for each row execute function public.no_push_apply_preferences();

alter table public.no_gov_teams add column dissolved_at timestamptz;
create table public.no_team_lifecycle_events(id uuid primary key default gen_random_uuid(),team_id text not null references public.no_gov_teams(id),actor uuid not null,action text not null check(action in ('leave','dissolve')),created_at timestamptz not null default clock_timestamp());
alter table public.no_team_lifecycle_events enable row level security;
revoke all on public.no_team_lifecycle_events from public,anon,authenticated;
create function public.no_app_exit_team(p_team_id text,p_dissolve boolean default false,p_confirmation text default '')
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor public.no_gov_members;team public.no_gov_teams;
begin
 if auth.uid() is null then raise exception 'Vui lòng đăng nhập lại.' using errcode='42501';end if;
 select * into team from public.no_gov_teams where id=p_team_id for update;
 if not found then raise exception 'Không tìm thấy đội.' using errcode='22023';end if;
 select * into actor from public.no_gov_members where team_id=p_team_id and user_id=auth.uid() for update;
 if actor.user_id is null then raise exception 'Không có quyền với đội này.' using errcode='42501';end if;
 if p_dissolve then
  if actor.role<>'owner' then raise exception 'Chỉ chủ đội được giải tán đội.' using errcode='42501';end if;
  if p_confirmation is distinct from team.name then raise exception 'Tên đội xác nhận chưa khớp.' using errcode='22023';end if;
  if team.dissolved_at is not null then return jsonb_build_object('success',true);end if;
  if actor.status<>'active' then raise exception 'Tài khoản không được phép giải tán đội.' using errcode='42501';end if;
  update public.no_gov_teams set dissolved_at=clock_timestamp() where id=p_team_id;
  update public.no_gov_members set status='removed',locked_until=null where team_id=p_team_id;
  update public.no_gov_invites set status='revoked' where team_id=p_team_id and status='active';
 else
  if actor.role='owner' then raise exception 'Chủ đội cần chuyển quyền hoặc giải tán đội.' using errcode='42501';end if;
  if actor.status='removed' then return jsonb_build_object('success',true);end if;
  update public.no_gov_members set status='removed',locked_until=null where team_id=p_team_id and user_id=auth.uid();
 end if;
 insert into public.no_team_lifecycle_events(team_id,actor,action) values(p_team_id,auth.uid(),case when p_dissolve then 'dissolve' else 'leave' end);
 return jsonb_build_object('success',true);
end $$;
revoke all on function public.no_app_exit_team(text,boolean,text) from public,anon;
grant execute on function public.no_app_exit_team(text,boolean,text) to authenticated;
create function public.no_membership_dissolved_guard() returns trigger language plpgsql security definer set search_path='' as $$
declare closed timestamptz;
begin
 select dissolved_at into closed from public.no_gov_teams where id=new.team_id for update;
 if new.status<>'removed' and closed is not null then raise exception 'Đội đã giải tán.' using errcode='42501';end if;
 return new;
end $$;
revoke all on function public.no_membership_dissolved_guard() from public,anon,authenticated;
create trigger no_membership_dissolved_guard before insert or update on public.no_gov_members for each row execute function public.no_membership_dissolved_guard();

create or replace function public.no_push_claim(p_limit integer default 8)
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
  if exists(select 1 from public.no_notification_preferences pref where pref.user_id=j.recipient and not pref.enabled) or not d.enabled or d.user_id is distinct from j.recipient or d.generation<>j.generation or coalesce(d.groups->>j.kind,'false')<>'true' or m.user_id is null or not (m.status='active' or (m.status='locked' and m.locked_until<=clock_timestamp())) or j.created_at<clock_timestamp()-interval '24 hours' then
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


create or replace function public.no_gov_my_memberships()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_res jsonb;
begin
  if v_actor is null then
    return '[]'::jsonb;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'teamId', m.team_id,
        'teamName', t.name,
        'role', m.role,
        'status', case when m.status='locked' and m.locked_until<=clock_timestamp() then 'active' else m.status end,
        'jerseyNumber', m.jersey_number,
        'position', m.position,
        'logo', coalesce(nullif(t.logo, ''), t.policy->>'logo', ''),
        'category', coalesce(nullif(t.category, ''), t.policy->>'category', 'Sân 7'),
        'venue', coalesce(nullif(t.venue, ''), t.policy->>'venue', '')
      ) order by m.status asc, t.name asc
    ),
    '[]'::jsonb
  ) into v_res
  from public.no_gov_members m
  join public.no_gov_teams t on t.id = m.team_id
  where m.user_id = v_actor and m.status<>'removed' and t.dissolved_at is null;

  return v_res;
end;
$$;
revoke all on function public.no_gov_my_memberships() from public,anon;
grant execute on function public.no_gov_my_memberships() to authenticated;


notify pgrst,'reload schema';
commit;
