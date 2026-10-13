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
 if p_action in ('attendance','late_request','arrival') and exists(select 1 from public.no_gov_events where team_id=p_team_id and subject=v_subject and match_id=v_match_id and action='violation') then raise exception 'Record finalized; append an adjustment'; end if;
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
   if not (p_payload ?& array['period','threshold','types','mode','action']) or p_payload->>'period' not in ('month','quarter') or (p_payload->>'threshold')::integer not between 1 and 100 or p_payload->>'action' not in ('warning','lock','remove') or p_payload->>'mode'<>'review' or jsonb_typeof(p_payload->'types')<>'array' or jsonb_array_length(p_payload->'types')=0 then raise exception 'Invalid policy; automatic sanctions are not enabled'; end if;
   if exists(select 1 from jsonb_array_elements_text(p_payload->'types') t where t not in ('late','unvoted','other')) then raise exception 'Invalid counted type'; end if;
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
   if exists(select 1 from public.no_gov_events where team_id=p_team_id and subject=v_subject and match_id=v_match_id and action='violation') then
     select jsonb_build_object('id',id,'action',action,'data',data) into v_existing from public.no_gov_events where team_id=p_team_id and subject=v_subject and match_id=v_match_id and action='violation' limit 1; return v_existing;
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
   if v_count>=v_threshold and not exists(select 1 from public.no_gov_events where team_id=p_team_id and subject=v_subject and action='threshold' and data->>'periodStart'=v_start::text and data->'policy'->>'period'=v_period and (data->>'threshold')::integer=v_threshold) then
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
