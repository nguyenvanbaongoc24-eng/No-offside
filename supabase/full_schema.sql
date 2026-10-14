-- =====================================================================
-- FULL DATABASE SCHEMA FOR NO OFFSIDE
-- Run this entire script in Supabase SQL Editor
-- =====================================================================

-- PART 1: Governance & Team Management
-- Additive migration. Test in an isolated Supabase project before production.
-- Does not import device data, assign existing owners, or alter old tables.
begin;
create table public.no_gov_teams (
 id text primary key, name text not null, timezone text not null default 'Asia/Ho_Chi_Minh',
 policy jsonb not null default '{"period":"month","threshold":3,"types":["late","unvoted","other"],"mode":"review","action":"warning"}'::jsonb
);
create table public.no_gov_members (
 team_id text references public.no_gov_teams(id), user_id uuid not null,
 name text not null, role text not null check (role in ('owner','admin','member')),
 status text not null default 'active' check(status in ('active','locked','removed')),
 locked_until timestamptz, primary key(team_id,user_id)
);
create unique index no_gov_one_owner on public.no_gov_members(team_id) where role='owner' and status <> 'removed';
create table public.no_gov_matches (
 team_id text references public.no_gov_teams(id), id text not null, title text not null,
 kickoff timestamptz not null, attendance_deadline timestamptz not null,
 late_before integer not null default 60 check(late_before between 0 and 10080),
 approval_required boolean not null default true,
 grace integer not null default 5 check(grace between 0 and 240),
 fine bigint not null default 50000 check(fine between 0 and 100000000),
 approved_policy text not null default 'eta' check(approved_policy in ('eta','kickoff','exempt')),
 archived_at timestamptz, primary key(team_id,id), check(attendance_deadline < kickoff)
);
create table public.no_gov_rules (
 id uuid primary key default gen_random_uuid(), team_id text references public.no_gov_teams(id),
 version integer not null, content text not null check(length(content) between 1 and 20000),
 effective_at timestamptz not null, require_ack boolean not null default false,
 actor uuid not null, created_at timestamptz not null default now(), unique(team_id,version)
);
create table public.no_gov_events (
 seq bigint generated always as identity, id uuid primary key default gen_random_uuid(), team_id text not null references public.no_gov_teams(id),
 actor uuid not null, subject uuid, match_id text, action text not null,
 request_key uuid not null, data jsonb not null, created_at timestamptz not null default clock_timestamp(),
 unique(team_id,actor,request_key), foreign key(team_id,match_id) references public.no_gov_matches(team_id,id)
);
create index no_gov_event_history on public.no_gov_events(team_id,subject,created_at);
create index no_gov_event_match on public.no_gov_events(team_id,match_id,subject,action);
create function public.no_gov_immutable() returns trigger language plpgsql set search_path='' as $$
begin raise exception 'Original record is append-only. Create a reasoned adjustment.'; end $$;
create trigger no_gov_events_append_only before update or delete on public.no_gov_events for each row execute function public.no_gov_immutable();
create trigger no_gov_rules_append_only before update or delete on public.no_gov_rules for each row execute function public.no_gov_immutable();

-- Serialize writes per team: authorization, cutoff, recording and threshold check share one transaction.
create function public.no_gov_mutate(p_team_id text, p_action text, p_payload jsonb, p_key uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_actor uuid := auth.uid(); v_me public.no_gov_members; v_target public.no_gov_members;
 v_match public.no_gov_matches; v_team public.no_gov_teams; v_event public.no_gov_events;
 v_request public.no_gov_events; v_arrival public.no_gov_events; v_rule public.no_gov_rules;
 v_subject uuid; v_match_id text; v_data jsonb := p_payload; v_now timestamptz := clock_timestamp();
 v_start timestamptz; v_end timestamptz; v_baseline timestamptz; v_actual timestamptz;
 v_count integer; v_threshold integer; v_period text; v_existing jsonb; v_fine bigint := 0;
begin
 if v_actor is null then raise exception 'Authentication required' using errcode='42501'; end if;
 select * into v_team from public.no_gov_teams where id=p_team_id for update;
 if not found then raise exception 'Team not provisioned'; end if;
 select * into v_me from public.no_gov_members where team_id=p_team_id and user_id=v_actor;
 if not found then raise exception 'Not a member' using errcode='42501'; end if;
 if p_key is null then raise exception 'Request key required'; end if;
 select jsonb_build_object('id',id,'data',data,'action',action) into v_existing from public.no_gov_events where team_id=p_team_id and actor=v_actor and request_key=p_key;
 if v_existing is not null then return v_existing; end if;
 if v_me.status='removed' or (v_me.status='locked' and (v_me.locked_until is null or v_me.locked_until>v_now)) then raise exception 'Team participation restricted' using errcode='42501'; end if;
 v_subject := coalesce(nullif(p_payload->>'subject','')::uuid,v_actor);
 select * into v_target from public.no_gov_members where team_id=p_team_id and user_id=v_subject;
 if not found then raise exception 'Target not in this team'; end if;
 v_match_id := case when p_action='match' then coalesce(nullif(p_payload->>'id',''),gen_random_uuid()::text) else nullif(p_payload->>'matchId','') end;
 if v_match_id is not null then
   select * into v_match from public.no_gov_matches where team_id=p_team_id and id=v_match_id;
   if not found and p_action<>'match' then raise exception 'Match not in this team'; end if;
   if v_match.archived_at is not null and p_action not in ('adjust','restore_match') then raise exception 'Match archived'; end if;
 end if;
 if p_action in ('attendance','late_request') and (v_subject<>v_actor or v_target.status='removed') then raise exception 'Only own attendance' using errcode='42501'; end if;
 if p_action in ('attendance','late_request') and exists(select 1 from public.no_gov_events where team_id=p_team_id and subject=v_subject and match_id=v_match_id and action='violation') then raise exception 'Record finalized; append an adjustment'; end if;
 if p_action in ('attendance','late_request','arrival','finalize','archive_match','restore_match') and v_match_id is null then raise exception 'Match required'; end if;
 if p_action in ('rules','policy','match','arrival','review_late','finalize','violation','adjust','sanction','archive_match','restore_match') and v_me.role not in ('owner','admin') then raise exception 'Leader required' using errcode='42501'; end if;

 case p_action
 when 'attendance' then
   if v_now>v_match.attendance_deadline then raise exception 'Attendance cutoff passed'; end if;
   if p_payload->>'status' not in ('attending','maybe','absent') then raise exception 'Invalid attendance'; end if;
   v_data := jsonb_build_object('status',p_payload->>'status');
 when 'late_request' then
   if v_now>v_match.kickoff-make_interval(mins=>v_match.late_before) then raise exception 'Late request cutoff passed'; end if;
   v_actual := (p_payload->>'eta')::timestamptz;
   if v_actual is null or v_actual<v_match.kickoff or v_actual>v_match.kickoff+interval '12 hours' or length(trim(coalesce(p_payload->>'reason','')))<3 then raise exception 'ETA and reason required'; end if;
   v_data := jsonb_build_object('eta',v_actual,'reason',trim(p_payload->>'reason'),'status',case when v_match.approval_required then 'pending' else 'approved' end);
 when 'review_late' then
   select * into v_request from public.no_gov_events where team_id=p_team_id and id=(p_payload->>'requestId')::uuid and action='late_request';
   if not found or v_request.subject=v_actor then raise exception 'Cannot approve own request' using errcode='42501'; end if;
   if v_request.id<>(select id from public.no_gov_events where team_id=p_team_id and subject=v_request.subject and match_id=v_request.match_id and action='late_request' order by created_at desc,seq desc limit 1) then raise exception 'Request replaced'; end if;
   if p_payload->>'status' not in ('approved','rejected') or length(trim(coalesce(p_payload->>'reason','')))<3 then raise exception 'Decision and reason required'; end if;
   if exists(select 1 from public.no_gov_events where team_id=p_team_id and subject=v_request.subject and match_id=v_request.match_id and action='violation') then raise exception 'Record finalized'; end if;
   v_subject:=v_request.subject; v_match_id:=v_request.match_id;
   v_data:=jsonb_build_object('requestId',v_request.id,'status',p_payload->>'status','reason',p_payload->>'reason','eta',v_request.data->'eta');
 when 'arrival' then
   if v_subject=v_actor then raise exception 'Another leader must confirm your arrival' using errcode='42501'; end if;
   if exists(select 1 from public.no_gov_events where team_id=p_team_id and subject=v_subject and match_id=v_match_id and action='arrival') then raise exception 'Arrival already recorded; append adjustment'; end if;
   v_actual:=(p_payload->>'arrivedAt')::timestamptz;
   if v_actual is null or v_actual>v_now+interval '1 minute' or v_actual<v_match.kickoff-interval '4 hours' then raise exception 'Invalid actual arrival'; end if;
   if length(trim(coalesce(p_payload->>'reason','')))<3 then raise exception 'Confirmation reason required'; end if;
   v_data:=jsonb_build_object('arrivedAt',v_actual,'reason',p_payload->>'reason');
 when 'rules' then
   if length(trim(coalesce(p_payload->>'content','')))<1 then raise exception 'Content required'; end if;
   if (p_payload->>'effectiveAt')::timestamptz < v_now - interval '1 minute' then raise exception 'Cannot backdate rules'; end if;
   insert into public.no_gov_rules(team_id,version,content,effective_at,require_ack,actor)
   values(p_team_id,coalesce((select max(version) from public.no_gov_rules where team_id=p_team_id),0)+1,trim(p_payload->>'content'),coalesce((p_payload->>'effectiveAt')::timestamptz,v_now),coalesce((p_payload->>'requireAck')::boolean,false),v_actor) returning * into v_rule;
   v_data:=to_jsonb(v_rule);
 when 'ack_rules' then
   select * into v_rule from public.no_gov_rules where team_id=p_team_id and id=(p_payload->>'ruleId')::uuid and effective_at<=v_now;
   if not found then raise exception 'Effective rules required'; end if;
   v_subject:=v_actor; v_data:=jsonb_build_object('ruleId',v_rule.id,'version',v_rule.version);
 when 'policy' then
   if not (p_payload ?& array['period','threshold','types','mode','action']) or p_payload->>'period' is null or p_payload->>'threshold' is null or p_payload->>'mode' is null or p_payload->>'action' is null or p_payload->'types'='null'::jsonb or p_payload->>'period' not in ('month','quarter') or (p_payload->>'threshold')::integer not between 1 and 100 or p_payload->>'action' not in ('warning','lock','remove') or p_payload->>'mode'<>'review' or jsonb_typeof(p_payload->'types')<>'array' or jsonb_array_length(p_payload->'types')=0 then raise exception 'Invalid policy; automatic sanctions are not enabled'; end if;
   if exists(select 1 from jsonb_array_elements_text(p_payload->'types') t where t is null or t not in ('late','unvoted','other')) then raise exception 'Invalid counted type'; end if;
   update public.no_gov_teams set policy=p_payload where id=p_team_id;
 when 'match' then
   if v_match_id is not null and exists(select 1 from public.no_gov_events where team_id=p_team_id and match_id=v_match_id and action in ('arrival','violation')) then raise exception 'Match has finalized history'; end if;
   if (p_payload->>'kickoff')::timestamptz<=v_now then raise exception 'Future kickoff required'; end if;
   insert into public.no_gov_matches(team_id,id,title,kickoff,attendance_deadline,late_before,approval_required,grace,fine,approved_policy)
   values(p_team_id,v_match_id,p_payload->>'title',(p_payload->>'kickoff')::timestamptz,(p_payload->>'deadline')::timestamptz,coalesce((p_payload->>'lateBefore')::integer,60),coalesce((p_payload->>'approvalRequired')::boolean,true),coalesce((p_payload->>'grace')::integer,5),coalesce((p_payload->>'fine')::bigint,50000),coalesce(p_payload->>'approvedPolicy','eta'))
   on conflict(team_id,id) do update set title=excluded.title,kickoff=excluded.kickoff,attendance_deadline=excluded.attendance_deadline,late_before=excluded.late_before,approval_required=excluded.approval_required,grace=excluded.grace,fine=excluded.fine,approved_policy=excluded.approved_policy;
 when 'archive_match' then
   update public.no_gov_matches set archived_at=v_now where team_id=p_team_id and id=v_match_id;
   v_data:=jsonb_build_object('reason','Removed from schedule; history retained');
 when 'restore_match' then
   update public.no_gov_matches set archived_at=null where team_id=p_team_id and id=v_match_id;
 when 'finalize' then
   if v_subject=v_actor then raise exception 'Cannot finalize own violation' using errcode='42501'; end if;
   select * into v_arrival from public.no_gov_events where team_id=p_team_id and subject=v_subject and match_id=v_match_id and action='arrival' order by created_at desc,seq desc limit 1;
   if not found then raise exception 'Confirmed arrival required'; end if;
   if exists(select 1 from public.no_gov_events where team_id=p_team_id and subject=v_subject and match_id=v_match_id and action='violation' and data->>'type'='late') then
     select jsonb_build_object('id',id,'action',action,'data',data) into v_existing from public.no_gov_events where team_id=p_team_id and subject=v_subject and match_id=v_match_id and action='violation' and data->>'type'='late' limit 1; return v_existing;
   end if;
   v_actual:=coalesce((select (data->>'arrivedAt')::timestamptz from public.no_gov_events where team_id=p_team_id and action='adjust' and data->>'eventId'=v_arrival.id::text order by created_at desc,seq desc limit 1),(v_arrival.data->>'arrivedAt')::timestamptz); v_baseline:=v_match.kickoff;
   select * into v_request from public.no_gov_events where team_id=p_team_id and subject=v_subject and match_id=v_match_id and action='late_request' order by created_at desc,seq desc limit 1;
   if found and (v_request.data->>'status'='approved' or coalesce((select data->>'status' from public.no_gov_events where team_id=p_team_id and action='review_late' and data->>'requestId'=v_request.id::text order by created_at desc,seq desc limit 1),'pending')='approved') then
     if v_match.approved_policy='exempt' then v_data:=jsonb_build_object('type','late','exempt',true); p_action:='arrival_checked';
     elsif v_match.approved_policy='eta' then v_baseline:=(v_request.data->>'eta')::timestamptz; end if;
   end if;
   if p_action='finalize' then
     if v_actual<=v_baseline+make_interval(mins=>v_match.grace) then p_action:='arrival_checked'; v_data:=jsonb_build_object('withinGrace',true);
     else
       select * into v_rule from public.no_gov_rules where team_id=p_team_id and effective_at<=v_match.kickoff order by effective_at desc,version desc limit 1;
       if not found then raise exception 'Rules at kickoff required'; end if;
       p_action:='violation'; v_fine:=v_match.fine;
       v_data:=jsonb_build_object('type','late','description','Confirmed late arrival','occurredAt',v_actual,'ruleId',v_rule.id,'ruleVersion',v_rule.version,'fine',v_fine,'arrivalId',v_arrival.id,'baseline',v_baseline,'status','final');
     end if;
   end if;
 when 'violation' then
   if v_subject=v_actor then raise exception 'Cannot finalize own violation' using errcode='42501'; end if;
   v_actual:=(p_payload->>'occurredAt')::timestamptz;
   if v_actual is null or v_actual>v_now or p_payload->>'type' not in ('late','unvoted','other') or length(trim(coalesce(p_payload->>'description','')))<3 or coalesce((p_payload->>'fine')::bigint,0) not between 0 and 100000000 then raise exception 'Invalid violation'; end if;
   if v_match_id is not null and exists(select 1 from public.no_gov_events where team_id=p_team_id and match_id=v_match_id and subject=v_subject and action='violation' and data->>'type'=p_payload->>'type') then raise exception 'Violation already recorded for this match and type'; end if;
   select * into v_rule from public.no_gov_rules where team_id=p_team_id and effective_at<=v_actual order by effective_at desc,version desc limit 1;
   if not found then raise exception 'Effective rules required'; end if;
   v_data:=p_payload || jsonb_build_object('ruleId',v_rule.id,'ruleVersion',v_rule.version,'status','final','fine',coalesce((p_payload->>'fine')::bigint,0));
 when 'adjust' then
   select * into v_event from public.no_gov_events where team_id=p_team_id and id=(p_payload->>'eventId')::uuid and action in ('arrival','violation');
   if not found or v_event.subject=v_actor then raise exception 'Cannot adjust own record or missing original' using errcode='42501'; end if;
   if length(trim(coalesce(p_payload->>'reason','')))<3 then raise exception 'Adjustment reason required'; end if;
   v_subject:=v_event.subject; v_match_id:=v_event.match_id;
   if v_event.action='arrival' then
     v_actual:=(p_payload->>'arrivedAt')::timestamptz;
     if v_actual is null or v_actual>v_now+interval '1 minute' then raise exception 'Corrected arrival required'; end if;
     v_data:=jsonb_build_object('eventId',v_event.id,'reason',p_payload->>'reason','arrivedAt',v_actual);
   else
     if p_payload->>'status' not in ('void','upheld') or coalesce((p_payload->>'fine')::bigint,0) not between 0 and 100000000 then raise exception 'Invalid violation correction'; end if;
     v_data:=jsonb_build_object('eventId',v_event.id,'reason',p_payload->>'reason','status',p_payload->>'status','fine',coalesce((p_payload->>'fine')::bigint,0));
   end if;
 when 'sanction' then
   if v_subject=v_actor or v_target.role='owner' or (v_me.role='admin' and v_target.role<>'member') then raise exception 'Cannot sanction self, owner, or peer admin' using errcode='42501'; end if;
   if p_payload ? 'thresholdId' then
     if not exists(select 1 from public.no_gov_events where team_id=p_team_id and id=(p_payload->>'thresholdId')::uuid and subject=v_subject and action='threshold') then raise exception 'Threshold task missing'; end if;
     if exists(select 1 from public.no_gov_events where team_id=p_team_id and action='sanction' and data->>'thresholdId'=p_payload->>'thresholdId') then raise exception 'Threshold already handled'; end if;
   end if;
   if v_target.status='removed' then raise exception 'Membership already ended'; end if;
   if p_payload->>'kind' not in ('warning','lock','remove','unlock') or length(trim(coalesce(p_payload->>'reason','')))<3 then raise exception 'Action and reason required'; end if;
   if p_payload->>'kind'='lock' and ((p_payload->>'until')::timestamptz is null or (p_payload->>'until')::timestamptz<=v_now) then raise exception 'Future lock end required'; end if;
   if p_payload->>'kind'='unlock' and v_target.status<>'locked' then raise exception 'Member is not locked'; end if;
   if p_payload->>'kind' in ('lock','remove') then
     update public.no_gov_members set status=case when p_payload->>'kind'='remove' then 'removed' else 'locked' end, locked_until=case when p_payload->>'kind'='lock' then (p_payload->>'until')::timestamptz else null end where team_id=p_team_id and user_id=v_subject;
   elsif p_payload->>'kind'='unlock' then update public.no_gov_members set status='active',locked_until=null where team_id=p_team_id and user_id=v_subject; end if;
 else raise exception 'Unsupported action';
 end case;
 insert into public.no_gov_events(team_id,actor,subject,match_id,action,request_key,data,created_at) values(p_team_id,v_actor,v_subject,v_match_id,p_action,p_key,v_data,v_now) returning * into v_event;

 if p_action in ('violation','adjust') then
   v_now:=coalesce((v_data->>'occurredAt')::timestamptz,(select (data->>'occurredAt')::timestamptz from public.no_gov_events where id=(v_data->>'eventId')::uuid),v_now);
   v_period:=v_team.policy->>'period'; v_threshold:=(v_team.policy->>'threshold')::integer;
   v_start:=date_trunc(v_period,v_now at time zone v_team.timezone) at time zone v_team.timezone;
   v_end:=(date_trunc(v_period,v_now at time zone v_team.timezone)+case when v_period='quarter' then interval '3 months' else interval '1 month' end) at time zone v_team.timezone;
   select count(*) into v_count from public.no_gov_events e where e.team_id=p_team_id and e.subject=v_subject and e.action='violation' and (e.data->>'occurredAt')::timestamptz>=v_start and (e.data->>'occurredAt')::timestamptz<v_end and v_team.policy->'types' ? (e.data->>'type') and coalesce((select a.data->>'status' from public.no_gov_events a where a.team_id=p_team_id and a.action='adjust' and a.data->>'eventId'=e.id::text order by a.created_at desc,a.seq desc limit 1),'final')<>'void';
   if v_count>=v_threshold and not exists(select 1 from public.no_gov_events where team_id=p_team_id and subject=v_subject and action='threshold' and (data->>'periodStart')::timestamptz=v_start and data->'policy'->>'period'=v_period and (data->>'threshold')::integer=v_threshold) then
     insert into public.no_gov_events(team_id,actor,subject,action,request_key,data) values(p_team_id,v_actor,v_subject,'threshold',gen_random_uuid(),jsonb_build_object('periodStart',v_start::text,'periodEnd',v_end,'count',v_count,'threshold',v_threshold,'policy',v_team.policy,'status','needs_review'));
   end if;
 end if;
 return jsonb_build_object('id',v_event.id,'action',v_event.action,'data',v_event.data);
end $$;

create function public.no_gov_snapshot(p_team_id text) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_me public.no_gov_members; v_team public.no_gov_teams; v_start timestamptz; v_end timestamptz; v_now timestamptz:=clock_timestamp();
begin
 select * into v_me from public.no_gov_members where team_id=p_team_id and user_id=auth.uid();
 if not found then raise exception 'Not a provisioned member' using errcode='42501'; end if;
 if v_me.status='locked' and v_me.locked_until<=v_now then v_me.status:='active'; end if;
 select * into v_team from public.no_gov_teams where id=p_team_id;
 v_start:=date_trunc(v_team.policy->>'period',v_now at time zone v_team.timezone) at time zone v_team.timezone;
 v_end:=(date_trunc(v_team.policy->>'period',v_now at time zone v_team.timezone)+case when v_team.policy->>'period'='quarter' then interval '3 months' else interval '1 month' end) at time zone v_team.timezone;
 return jsonb_build_object('team',to_jsonb(v_team),'me',to_jsonb(v_me),'serverNow',v_now,'periodStart',v_start,'periodEnd',v_end,
  'members',coalesce((select jsonb_agg(to_jsonb(m)) from public.no_gov_members m where m.team_id=p_team_id and (v_me.status='active' or m.user_id=auth.uid())),'[]'),
  'matches',coalesce((select jsonb_agg(to_jsonb(m)) from public.no_gov_matches m where m.team_id=p_team_id and (v_me.status='active' or exists(select 1 from public.no_gov_events e where e.team_id=p_team_id and e.subject=auth.uid() and e.match_id=m.id))),'[]'),
  'rules',coalesce((select jsonb_agg(to_jsonb(r) order by effective_at desc,version desc) from public.no_gov_rules r where r.team_id=p_team_id and (v_me.status<>'removed' or exists(select 1 from public.no_gov_events e where e.team_id=p_team_id and e.subject=auth.uid() and e.data->>'ruleId'=r.id::text))),'[]'),
  'events',coalesce((select jsonb_agg(to_jsonb(e) order by created_at,seq) from public.no_gov_events e where e.team_id=p_team_id and (e.subject=auth.uid() or e.action in ('rules','policy','archive_match','restore_match') or (v_me.role in ('owner','admin') and v_me.status='active'))),'[]'));
end $$;

-- API clients have no direct table privileges, including the private ledger. Only RPCs.
alter table public.no_gov_teams enable row level security;
alter table public.no_gov_members enable row level security;
alter table public.no_gov_matches enable row level security;
alter table public.no_gov_rules enable row level security;
alter table public.no_gov_events enable row level security;
revoke all on public.no_gov_teams,public.no_gov_members,public.no_gov_matches,public.no_gov_rules,public.no_gov_events from public,anon,authenticated;
revoke all on function public.no_gov_immutable(),public.no_gov_mutate(text,text,jsonb,uuid),public.no_gov_snapshot(text) from public,anon,authenticated;
grant execute on function public.no_gov_mutate(text,text,jsonb,uuid),public.no_gov_snapshot(text) to authenticated;
commit;


-- PART 2: Profiles, Usernames & Teams
-- Additive migration 202610130002: User profiles, username auth resolution, team creation & joining.
begin;

-- 1. User Profiles
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  username text unique check (username is null or (length(username) between 3 and 20 and username ~ '^[a-z0-9_-]+$')),
  full_name text not null default '',
  avatar_url text default '',
  email text not null default '',
  phone text default '',
  jersey_number integer check (jersey_number between 1 and 99),
  position text default 'Tiền Đạo',
  height integer check (height > 0 and height < 300),
  weight integer check (weight > 0 and weight < 300),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists profiles_username_lower_idx on public.profiles(lower(username)) where username is not null and username <> '';

alter table public.profiles enable row level security;

drop policy if exists "Profiles are viewable by authenticated users" on public.profiles;
create policy "Profiles are viewable by authenticated users"
  on public.profiles for select to authenticated
  using (true);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert to authenticated
  with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 2. Auth attempts & rate-limiting table
create table if not exists public.no_auth_attempts (
  identifier text primary key,
  attempts integer not null default 0,
  last_attempt timestamptz not null default now(),
  locked_until timestamptz
);

alter table public.no_auth_attempts enable row level security;
revoke all on public.no_auth_attempts from public, anon, authenticated;

-- 3. Availability check RPC for registration
create or replace function public.no_auth_check_availability(p_username text default null, p_email text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_username_taken boolean := false;
  v_email_taken boolean := false;
begin
  if p_username is not null and length(trim(p_username)) > 0 then
    select exists(
      select 1 from public.profiles
      where lower(username) = lower(trim(p_username))
    ) into v_username_taken;
  end if;

  if p_email is not null and length(trim(p_email)) > 0 then
    select exists(
      select 1 from public.profiles
      where lower(email) = lower(trim(p_email))
    ) into v_email_taken;
    if not v_email_taken then
      select exists(
        select 1 from auth.users
        where lower(email) = lower(trim(p_email))
      ) into v_email_taken;
    end if;
  end if;

  return jsonb_build_object(
    'usernameAvailable', not v_username_taken,
    'emailAvailable', not v_email_taken
  );
end;
$$;
grant execute on function public.no_auth_check_availability(text, text) to anon, authenticated;

-- 4. Secure Username Resolution for Login
create or replace function public.no_auth_resolve_username(p_username text, p_client_id text default 'global')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user_email text;
  v_user_id uuid;
  v_attempt public.no_auth_attempts;
  v_key text;
  v_now timestamptz := now();
begin
  if p_username is null or length(trim(p_username)) = 0 then
    raise exception 'Tên đăng nhập hoặc mật khẩu không chính xác.' using errcode = '42501';
  end if;

  v_key := coalesce(nullif(trim(p_client_id), ''), 'global') || ':' || lower(trim(p_username));
  select * into v_attempt from public.no_auth_attempts where identifier = v_key for update;

  if v_attempt is not null and v_attempt.locked_until is not null and v_attempt.locked_until > v_now then
    raise exception 'Bạn đã thử đăng nhập quá nhiều lần. Vui lòng chờ 15 phút rồi thử lại.' using errcode = '42501';
  end if;

  select p.email, p.id into v_user_email, v_user_id
  from public.profiles p
  where lower(p.username) = lower(trim(p_username));

  if v_user_email is null or length(trim(v_user_email)) = 0 then
    insert into public.no_auth_attempts(identifier, attempts, last_attempt, locked_until)
    values (v_key, 1, v_now, null)
    on conflict (identifier) do update set
      attempts = case when public.no_auth_attempts.last_attempt < v_now - interval '15 minutes' then 1 else public.no_auth_attempts.attempts + 1 end,
      last_attempt = v_now,
      locked_until = case when (case when public.no_auth_attempts.last_attempt < v_now - interval '15 minutes' then 1 else public.no_auth_attempts.attempts + 1 end) >= 5 then v_now + interval '15 minutes' else null end;

    raise exception 'Tên đăng nhập hoặc mật khẩu không chính xác.' using errcode = '42501';
  end if;

  return jsonb_build_object('email', v_user_email, 'id', v_user_id);
end;
$$;
grant execute on function public.no_auth_resolve_username(text, text) to anon, authenticated;

-- 5. Record Login Attempt Result (Success or Failure)
create or replace function public.no_auth_record_login_result(p_username text, p_success boolean, p_client_id text default 'global')
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_key text;
  v_now timestamptz := now();
begin
  v_key := coalesce(nullif(trim(p_client_id), ''), 'global') || ':' || lower(trim(p_username));
  if p_success then
    delete from public.no_auth_attempts where identifier = v_key;
  else
    insert into public.no_auth_attempts(identifier, attempts, last_attempt, locked_until)
    values (v_key, 1, v_now, null)
    on conflict (identifier) do update set
      attempts = case when public.no_auth_attempts.last_attempt < v_now - interval '15 minutes' then 1 else public.no_auth_attempts.attempts + 1 end,
      last_attempt = v_now,
      locked_until = case when (case when public.no_auth_attempts.last_attempt < v_now - interval '15 minutes' then 1 else public.no_auth_attempts.attempts + 1 end) >= 5 then v_now + interval '15 minutes' else null end;
  end if;
end;
$$;
grant execute on function public.no_auth_record_login_result(text, boolean, text) to anon, authenticated;

-- 6. Set / Update Username for Authenticated User
create or replace function public.no_set_username(p_username text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_cleaned text;
  v_taken boolean;
begin
  if v_actor is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  v_cleaned := lower(trim(p_username));
  if length(v_cleaned) < 3 or length(v_cleaned) > 20 then
    raise exception 'Tên đăng nhập phải từ 3 đến 20 ký tự.';
  end if;
  if v_cleaned !~ '^[a-z0-9_-]+$' then
    raise exception 'Tên đăng nhập chỉ được chứa chữ cái, chữ số, gạch dưới (_) hoặc gạch ngang (-).';
  end if;

  select exists(
    select 1 from public.profiles
    where lower(username) = v_cleaned and id <> v_actor
  ) into v_taken;

  if v_taken then
    raise exception 'Tên đăng nhập này đã được sử dụng. Vui lòng chọn tên khác.';
  end if;

  update public.profiles
  set username = v_cleaned, updated_at = now()
  where id = v_actor;

  return jsonb_build_object('success', true, 'username', v_cleaned);
end;
$$;
grant execute on function public.no_set_username(text) to authenticated;

-- 7. Trigger on auth.users to auto-create profile
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_username text;
begin
  v_username := lower(trim(coalesce(new.raw_user_meta_data->>'username', '')));
  if v_username = '' then
    v_username := null;
  end if;

  insert into public.profiles (id, username, full_name, avatar_url, email, phone)
  values (
    new.id,
    v_username,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(coalesce(new.email, 'user'), '@', 1)),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', ''),
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'phone', coalesce(new.phone, ''))
  )
  on conflict (id) do update set
    username = coalesce(public.profiles.username, excluded.username),
    full_name = case when public.profiles.full_name = '' then excluded.full_name else public.profiles.full_name end,
    avatar_url = case when public.profiles.avatar_url = '' then excluded.avatar_url else public.profiles.avatar_url end,
    email = case when public.profiles.email = '' then excluded.email else public.profiles.email end,
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 8. Self-serve Team Creation RPC for Authenticated Owners
create or replace function public.no_gov_create_team(p_team_id text, p_name text, p_timezone text default 'Asia/Ho_Chi_Minh')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_team public.no_gov_teams;
  v_member public.no_gov_members;
  v_owner_name text;
begin
  if v_actor is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if length(trim(coalesce(p_name, ''))) < 2 then raise exception 'Team name must be at least 2 characters'; end if;
  if p_team_id is null or length(trim(p_team_id)) < 2 then raise exception 'Team ID required'; end if;

  insert into public.no_gov_teams(id, name, timezone)
  values (trim(p_team_id), trim(p_name), coalesce(nullif(trim(p_timezone), ''), 'Asia/Ho_Chi_Minh'))
  returning * into v_team;

  select coalesce(nullif(trim(full_name), ''), 'Đội Trưởng') into v_owner_name from public.profiles where id = v_actor;
  if v_owner_name is null then v_owner_name := 'Đội Trưởng'; end if;

  insert into public.no_gov_members(team_id, user_id, name, role, status)
  values (
    v_team.id,
    v_actor,
    v_owner_name,
    'owner',
    'active'
  )
  returning * into v_member;

  -- Initial rule version 1
  insert into public.no_gov_rules(team_id, version, content, effective_at, actor)
  values (v_team.id, 1, 'Nội quy khởi tạo đội bóng No Offside', clock_timestamp(), v_actor);

  return jsonb_build_object('team', to_jsonb(v_team), 'me', to_jsonb(v_member));
end;
$$;

grant execute on function public.no_gov_create_team(text, text, text) to authenticated;

-- 9. Team Joining RPC for Authenticated Members
create or replace function public.no_gov_join_team(p_team_id text, p_name text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_team public.no_gov_teams;
  v_member public.no_gov_members;
  v_member_name text;
begin
  if v_actor is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select * into v_team from public.no_gov_teams where id = trim(p_team_id);
  if not found then raise exception 'Team not found'; end if;

  select * into v_member from public.no_gov_members where team_id = v_team.id and user_id = v_actor;
  if found then
    return jsonb_build_object('team', to_jsonb(v_team), 'me', to_jsonb(v_member));
  end if;

  v_member_name := coalesce(nullif(trim(p_name), ''), (select nullif(trim(full_name), '') from public.profiles where id = v_actor), 'Cầu thủ');

  insert into public.no_gov_members(team_id, user_id, name, role, status)
  values (v_team.id, v_actor, v_member_name, 'member', 'active')
  returning * into v_member;

  return jsonb_build_object('team', to_jsonb(v_team), 'me', to_jsonb(v_member));
end;
$$;

grant execute on function public.no_gov_join_team(text, text) to authenticated;

commit;


-- PART 3: Team Invites via Club Code & QR
-- Additive migration 202610130003: Team invites via Club Code and QR, with secure join workflow.
begin;

-- 1. Extend no_gov_teams with display metadata if not exists
alter table public.no_gov_teams add column if not exists logo text default '';
alter table public.no_gov_teams add column if not exists category text default 'Sân 7';
alter table public.no_gov_teams add column if not exists venue text default '';

-- 2. Extend no_gov_members with jersey number and position
alter table public.no_gov_members add column if not exists jersey_number integer check (jersey_number between 0 and 99);
alter table public.no_gov_members add column if not exists position text default 'Tiền đạo';

-- Uniqueness of jersey number per active team membership
create unique index if not exists no_gov_members_team_jersey_idx
  on public.no_gov_members(team_id, jersey_number)
  where jersey_number is not null and status <> 'removed';

-- 3. Team Invites table
create table if not exists public.no_gov_invites (
  id uuid primary key default gen_random_uuid(),
  team_id text not null references public.no_gov_teams(id) on delete cascade,
  code text not null,
  status text not null default 'active' check (status in ('active', 'revoked', 'expired')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create unique index if not exists no_gov_invites_code_idx on public.no_gov_invites (upper(code));
create index if not exists no_gov_invites_team_status_idx on public.no_gov_invites (team_id, status);

alter table public.no_gov_invites enable row level security;
revoke all on public.no_gov_invites from public, anon, authenticated;

-- Helper to generate a clean 6-character alphanumeric code without ambiguous characters (0, O, 1, I, L)
create or replace function public.no_generate_club_code()
returns text language plpgsql security definer set search_path = '' as $$
declare
  chars text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  res text := '';
  i integer;
  cand text;
  attempts integer := 0;
begin
  loop
    res := '';
    for i in 1..6 loop
      res := res || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    end loop;
    cand := upper(res);
    if not exists (select 1 from public.no_gov_invites where upper(code) = cand) then
      return cand;
    end if;
    attempts := attempts + 1;
    if attempts > 20 then
      return cand || floor(random() * 90 + 10)::text;
    end if;
  end loop;
end;
$$;

-- 4. Create or replace active invite (Owner or Admin only)
create or replace function public.no_gov_create_invite(p_team_id text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_role text;
  v_code text;
  v_invite public.no_gov_invites;
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select role into v_role
  from public.no_gov_members
  where team_id = trim(p_team_id)
    and user_id = v_actor
    and status = 'active';

  if v_role is null or v_role not in ('owner', 'admin') then
    raise exception 'Chỉ Đội trưởng hoặc Ban quản trị mới có quyền tạo mã mời.' using errcode = '42501';
  end if;

  -- Revoke any existing active invites for this team so previous code/QR becomes invalid
  update public.no_gov_invites
  set status = 'revoked', revoked_at = now()
  where team_id = trim(p_team_id) and status = 'active';

  v_code := public.no_generate_club_code();

  insert into public.no_gov_invites (team_id, code, status, created_by, created_at)
  values (trim(p_team_id), v_code, 'active', v_actor, now())
  returning * into v_invite;

  return jsonb_build_object(
    'success', true,
    'code', v_invite.code,
    'teamId', v_invite.team_id,
    'status', v_invite.status,
    'createdAt', v_invite.created_at
  );
end;
$$;
grant execute on function public.no_gov_create_invite(text) to authenticated;

-- 5. Revoke invite (Owner or Admin only)
create or replace function public.no_gov_revoke_invite(p_team_id text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_role text;
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select role into v_role
  from public.no_gov_members
  where team_id = trim(p_team_id)
    and user_id = v_actor
    and status = 'active';

  if v_role is null or v_role not in ('owner', 'admin') then
    raise exception 'Chỉ Đội trưởng hoặc Ban quản trị mới có quyền thu hồi mã mời.' using errcode = '42501';
  end if;

  update public.no_gov_invites
  set status = 'revoked', revoked_at = now()
  where team_id = trim(p_team_id) and status = 'active';

  return jsonb_build_object('success', true, 'revoked', true);
end;
$$;
grant execute on function public.no_gov_revoke_invite(text) to authenticated;

-- 6. Get invite information (publicly readable with rate-limiting, does not leak sensitive roster data)
create or replace function public.no_gov_get_invite(p_code text, p_client_id text default 'global')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_clean_code text;
  v_key text;
  v_attempt public.no_auth_attempts;
  v_now timestamptz := now();
  v_invite public.no_gov_invites;
  v_team public.no_gov_teams;
  v_captain text;
  v_member_count integer;
  v_taken_numbers integer[];
begin
  if p_code is null or length(trim(p_code)) = 0 then
    raise exception 'Vui lòng nhập mã Club.' using errcode = '42501';
  end if;

  v_clean_code := upper(trim(p_code));
  v_key := coalesce(nullif(trim(p_client_id), ''), 'global') || ':invite:' || v_clean_code;

  select * into v_attempt from public.no_auth_attempts where identifier = v_key for update;
  if v_attempt is not null and v_attempt.locked_until is not null and v_attempt.locked_until > v_now then
    raise exception 'Bạn đã thử mã quá nhiều lần. Vui lòng chờ 15 phút rồi thử lại.' using errcode = '42501';
  end if;

  select * into v_invite
  from public.no_gov_invites
  where upper(code) = v_clean_code and status = 'active';

  if v_invite is null then
    insert into public.no_auth_attempts (identifier, attempts, last_attempt, locked_until)
    values (v_key, 1, v_now, null)
    on conflict (identifier) do update set
      attempts = case when public.no_auth_attempts.last_attempt < v_now - interval '15 minutes' then 1 else public.no_auth_attempts.attempts + 1 end,
      last_attempt = v_now,
      locked_until = case when (case when public.no_auth_attempts.last_attempt < v_now - interval '15 minutes' then 1 else public.no_auth_attempts.attempts + 1 end) >= 10 then v_now + interval '15 minutes' else null end;

    raise exception 'Mã Club không hợp lệ hoặc lời mời đã hết hạn / bị thu hồi.' using errcode = '42501';
  end if;

  select * into v_team from public.no_gov_teams where id = v_invite.team_id;
  if v_team is null then
    raise exception 'Đội bóng không còn hoạt động.' using errcode = '42501';
  end if;

  select name into v_captain
  from public.no_gov_members
  where team_id = v_team.id and role = 'owner' and status = 'active'
  limit 1;

  select count(*) into v_member_count
  from public.no_gov_members
  where team_id = v_team.id and status = 'active';

  select coalesce(array_agg(jersey_number), array[]::integer[]) into v_taken_numbers
  from public.no_gov_members
  where team_id = v_team.id and status = 'active' and jersey_number is not null;

  return jsonb_build_object(
    'valid', true,
    'code', v_invite.code,
    'teamId', v_team.id,
    'teamName', v_team.name,
    'logo', coalesce(nullif(v_team.logo, ''), v_team.policy->>'logo', ''),
    'category', coalesce(nullif(v_team.category, ''), v_team.policy->>'category', 'Sân 7'),
    'venue', coalesce(nullif(v_team.venue, ''), v_team.policy->>'venue', ''),
    'captain', coalesce(v_captain, 'Đội trưởng'),
    'memberCount', v_member_count,
    'takenNumbers', v_taken_numbers,
    'status', v_invite.status
  );
end;
$$;
grant execute on function public.no_gov_get_invite(text, text) to anon, authenticated;

-- 7. Join team via active invite (Authenticated User only)
-- Backend resolves team_id and assigns role 'member' exclusively from the valid invite.
create or replace function public.no_gov_join_via_invite(
  p_code text,
  p_name text,
  p_number integer,
  p_position text default 'Tiền đạo'
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_clean_code text;
  v_invite public.no_gov_invites;
  v_team public.no_gov_teams;
  v_existing public.no_gov_members;
  v_member public.no_gov_members;
  v_name text;
  v_position text;
  v_number_taken boolean;
begin
  if v_actor is null then
    raise exception 'Vui lòng đăng nhập để hoàn tất gia nhập đội.' using errcode = '42501';
  end if;

  if p_code is null or length(trim(p_code)) = 0 then
    raise exception 'Mã Club không được để trống.' using errcode = '42501';
  end if;

  v_clean_code := upper(trim(p_code));

  select * into v_invite
  from public.no_gov_invites
  where upper(code) = v_clean_code and status = 'active';

  if v_invite is null then
    raise exception 'Lời mời không hợp lệ hoặc đã bị thu hồi.' using errcode = '42501';
  end if;

  select * into v_team from public.no_gov_teams where id = v_invite.team_id;
  if v_team is null then
    raise exception 'Đội bóng không còn hoạt động.' using errcode = '42501';
  end if;

  -- Check if already a member of this team (idempotent; do not overwrite existing jersey/role)
  select * into v_existing
  from public.no_gov_members
  where team_id = v_team.id and user_id = v_actor;

  if v_existing.user_id is not null and v_existing.status = 'active' then
    return jsonb_build_object(
      'success', true,
      'alreadyMember', true,
      'team', jsonb_build_object('id', v_team.id, 'name', v_team.name, 'logo', v_team.logo),
      'me', to_jsonb(v_existing)
    );
  end if;

  -- Validate jersey number 0-99
  if p_number is null or p_number < 0 or p_number > 99 then
    raise exception 'Số áo phải là số nguyên từ 0 đến 99.' using errcode = '42501';
  end if;

  -- Check if jersey number is already taken
  select exists(
    select 1 from public.no_gov_members
    where team_id = v_team.id
      and jersey_number = p_number
      and status <> 'removed'
      and user_id <> v_actor
  ) into v_number_taken;

  if v_number_taken then
    raise exception 'Số áo % đã có thành viên sử dụng. Vui lòng chọn số khác.', p_number using errcode = '42501';
  end if;

  v_name := coalesce(nullif(trim(p_name), ''), (select nullif(trim(full_name), '') from public.profiles where id = v_actor), 'Cầu thủ');
  v_position := coalesce(nullif(trim(p_position), ''), 'Tiền đạo');

  if v_existing.user_id is not null then
    update public.no_gov_members
    set name = v_name,
        role = 'member',
        status = 'active',
        jersey_number = p_number,
        position = v_position,
        locked_until = null
    where team_id = v_team.id and user_id = v_actor
    returning * into v_member;
  else
    insert into public.no_gov_members (team_id, user_id, name, role, status, jersey_number, position)
    values (v_team.id, v_actor, v_name, 'member', 'active', p_number, v_position)
    returning * into v_member;
  end if;

  return jsonb_build_object(
    'success', true,
    'alreadyMember', false,
    'team', jsonb_build_object('id', v_team.id, 'name', v_team.name, 'logo', v_team.logo),
    'me', to_jsonb(v_member)
  );
end;
$$;
grant execute on function public.no_gov_join_via_invite(text, text, integer, text) to authenticated;

-- 8. Fetch current user's actual database memberships across all teams
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
        'status', m.status,
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
  where m.user_id = v_actor and m.status <> 'removed';

  return v_res;
end;
$$;
grant execute on function public.no_gov_my_memberships() to authenticated;

commit;
