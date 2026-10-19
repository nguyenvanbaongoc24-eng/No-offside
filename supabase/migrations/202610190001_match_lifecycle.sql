-- Additive match facts. Registration, actual attendance and money remain separate.
begin;
create table public.no_match_records(
 team_id text not null references public.no_gov_teams(id),match_id text not null,
 ended_at timestamptz,ended_by uuid,score_home integer check(score_home>=0),score_away integer check(score_away>=0),
 post_note text not null default '',actual jsonb not null default '{}',roster jsonb,finalized_at timestamptz,finalized_by uuid,
 bill_id uuid references public.no_pro_bills(id),collection_id uuid references public.no_fund_collections(id),zero_cost boolean not null default false,
 primary key(team_id,match_id),foreign key(team_id,match_id) references public.no_gov_matches(team_id,id),
 check((score_home is null)=(score_away is null))
);
create table public.no_match_events(
 id uuid primary key default gen_random_uuid(),team_id text not null references public.no_gov_teams(id),match_id text not null,
 actor uuid not null,action text not null,request_key uuid not null,payload jsonb not null,before_value jsonb,after_value jsonb,created_at timestamptz not null default clock_timestamp(),
 unique(team_id,actor,request_key)
);
alter table public.no_match_records enable row level security;
alter table public.no_match_events enable row level security;
revoke all on public.no_match_records,public.no_match_events from public,anon,authenticated;
create trigger no_match_events_immutable before update or delete on public.no_match_events for each row execute function public.no_gov_immutable();
-- Read-only work queues on list cards. Never persist these projections in matches.
alter function public.no_app_snapshot(text) rename to no_app_snapshot_before_match_lifecycle;
revoke all on function public.no_app_snapshot_before_match_lifecycle(text) from public,anon,authenticated;
create function public.no_app_snapshot(p_team_id text) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;matches jsonb;
begin
 result:=public.no_app_snapshot_before_match_lifecycle(p_team_id);
 select coalesce(jsonb_agg(m||jsonb_build_object('detailState',jsonb_build_object('finalized',r.finalized_at is not null,'costKnown',r.bill_id is not null or coalesce(r.zero_cost,false),'remaining',coalesce((select sum(greatest(0,c.amount-c.paid_amount)) from public.no_pro_charges c where c.team_id=p_team_id and c.bill_id=r.bill_id and c.status<>'void'),0),'ownRemaining',coalesce((select sum(greatest(0,c.amount-c.paid_amount)) from public.no_pro_charges c where c.team_id=p_team_id and c.bill_id=r.bill_id and c.subject=auth.uid()::text and c.status<>'void'),0)))),'[]') into matches from jsonb_array_elements(coalesce(result->'data'->'matches','[]')) m left join public.no_match_records r on r.team_id=p_team_id and r.match_id=m->>'id';
 return jsonb_set(result,'{data,matches}',matches);
end$$;
revoke all on function public.no_app_snapshot(text) from public,anon;
grant execute on function public.no_app_snapshot(text) to authenticated;
alter function public.no_app_commit(text,bigint,uuid,jsonb) rename to no_app_commit_before_match_lifecycle;
revoke all on function public.no_app_commit_before_match_lifecycle(text,bigint,uuid,jsonb) from public,anon,authenticated;
create function public.no_app_commit(p_team_id text,p_revision bigint,p_key uuid,p_patch jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare m jsonb;previous jsonb;
begin
 if p_patch ? 'matches' then
  for m in select value from jsonb_array_elements(p_patch->'matches') loop
   select x into previous from public.no_app_workspaces w cross join jsonb_array_elements(w.data->'matches') x where w.team_id=p_team_id and x->>'id'=m->>'id';
   if (m->'scoreHome' is distinct from previous->'scoreHome' or m->'scoreAway' is distinct from previous->'scoreAway' or m->'endedAt' is distinct from previous->'endedAt' or m->'cancelledAt' is distinct from previous->'cancelledAt') then raise exception 'Dùng quy trình kết thúc/cập nhật kết quả/hủy trận để lưu lịch sử.';end if;
   if m->>'modelVersion'='2' and m->>'status'='completed' and coalesce(previous->>'status','upcoming')<>'completed' then raise exception 'Dùng quy trình Kết thúc trận, không chốt bằng sửa thông tin.';end if;
  end loop;
 end if;
 if p_patch ? 'matches' then p_patch:=jsonb_set(p_patch,'{matches}',(select coalesce(jsonb_agg(entry.value-'detailState'),'[]') from jsonb_array_elements(p_patch->'matches') entry));end if;
 return public.no_app_commit_before_match_lifecycle(p_team_id,p_revision,p_key,p_patch);
end$$;
revoke all on function public.no_app_commit(text,bigint,uuid,jsonb) from public,anon;
grant execute on function public.no_app_commit(text,bigint,uuid,jsonb) to authenticated;
alter table public.no_pro_charges drop constraint no_pro_charges_kind_check;
alter table public.no_pro_charges add constraint no_pro_charges_kind_check check(kind in ('fine','third','fund','match'));

-- Completion alone must never produce financial/disciplinary side effects.
create or replace function public.no_pro_completed() returns trigger language plpgsql security definer set search_path='' as $$begin return new;end$$;

create function public.no_match_validate() returns trigger language plpgsql security definer set search_path='' as $$
declare m jsonb; previous jsonb; start_at timestamptz; end_at timestamptz;
begin
 if new.data->'matches' is not distinct from old.data->'matches' then return new;end if;
 for m in select value from jsonb_array_elements(coalesce(new.data->'matches','[]')) loop
  select x into previous from jsonb_array_elements(coalesce(old.data->'matches','[]')) x where x->>'id'=m->>'id';
  if m=previous then continue;end if;
  if previous is null or m->'datetime' is distinct from previous->'datetime' or m->'deadline' is distinct from previous->'deadline' then
   if (m->>'datetime')::timestamptz is null or (m->>'deadline')::timestamptz is null or (m->>'deadline')::timestamptz>=(m->>'datetime')::timestamptz then raise exception 'Ngày giờ trận không hợp lệ; hạn điểm danh phải trước giờ bắt đầu.';end if;
  end if;
  if m->>'modelVersion'='2' then
   start_at:=(m->>'datetime')::timestamptz;end_at:=(m->>'endsAt')::timestamptz;
   if start_at is null or end_at is null or (m->>'deadline')::timestamptz is null or (m->>'deadline')::timestamptz>=start_at or end_at<=start_at or end_at>start_at+interval '24 hours' then raise exception 'Ngày giờ trận không hợp lệ; hạn điểm danh trước giờ bắt đầu, kết thúc sau bắt đầu trong 24 giờ.';end if;
   if m->>'matchType' is null or m->>'matchType' not in ('friendly','internal') or length(coalesce(m->>'opponent',''))>120 or length(coalesce(m->>'venue',''))>240 or length(coalesce(m->>'note',''))>4000 or length(coalesce(m->>'address',''))>500 or length(coalesce(m->>'mapUrl',''))>2000 then raise exception 'Thông tin trận không hợp lệ.';end if;
   if coalesce(m->>'mapUrl','')<>'' and m->>'mapUrl' !~* '^https://' then raise exception 'Liên kết bản đồ phải dùng HTTPS.';end if;
   if coalesce((m->>'expectedPitch')::numeric,-1)<>trunc(coalesce((m->>'expectedPitch')::numeric,-1)) or coalesce((m->>'expectedOther')::numeric,-1)<>trunc(coalesce((m->>'expectedOther')::numeric,-1)) or coalesce((m->>'expectedPitch')::bigint,-1) not between 0 and 1000000000 or coalesce((m->>'expectedOther')::bigint,-1) not between 0 and 1000000000 or m->>'paymentPlan' not in ('fund','members','mixed') then raise exception 'Dự toán không hợp lệ.';end if;
  end if;
  if previous is not null and (m->'datetime' is distinct from previous->'datetime' or m->'deadline' is distinct from previous->'deadline' or m->'endsAt' is distinct from previous->'endsAt') and (previous->>'status'='completed' or exists(select 1 from public.no_match_records r where r.team_id=new.team_id and r.match_id=m->>'id' and r.finalized_at is not null) or exists(select 1 from public.no_gov_events e where e.team_id=new.team_id and e.match_id=m->>'id' and e.action in ('arrival','violation'))) then raise exception 'Trận đã có dữ liệu xác nhận/chốt; không được đổi giờ để thay quy định.';end if;
  if previous->>'cancelledAt' is not null and m->>'cancelledAt' is distinct from previous->>'cancelledAt' then raise exception 'Không được mở lại trận đã hủy bằng sửa lịch.';end if;
  if previous is not null and (m->'datetime' is distinct from previous->'datetime' or m->'venue' is distinct from previous->'venue' or m->'cancelledAt' is distinct from previous->'cancelledAt') then
   insert into public.no_match_events(team_id,match_id,actor,action,request_key,payload,before_value,after_value) values(new.team_id,m->>'id',auth.uid(),'schedule_change',gen_random_uuid(),'{}',previous,m);
   update public.no_push_outbox set state='skipped' where team_id=new.team_id and state in ('pending','retry') and notice_id in (select x->>'id' from jsonb_array_elements(coalesce(old.data->'notices','[]')) x where x->>'matchId'=m->>'id');
  end if;
 end loop;return new;
end$$;
create trigger no_match_validate before update of data on public.no_app_workspaces for each row execute function public.no_match_validate();

create function public.no_match_state(p_team text,p_match text) returns jsonb language plpgsql security definer set search_path='' as $$
declare me public.no_gov_members;m jsonb;r public.no_match_records;roster jsonb;act jsonb;g public.no_gov_matches;e record;financial jsonb;
begin
 select * into me from public.no_gov_members where team_id=p_team and user_id=auth.uid() and (status='active' or(status='locked' and locked_until<=clock_timestamp()));
 if not found then raise exception 'Không có quyền xem trận của đội này.' using errcode='42501';end if;
 select x into m from public.no_app_workspaces w cross join jsonb_array_elements(w.data->'matches') x where w.team_id=p_team and x->>'id'=p_match;
 if m is null then raise exception 'Không tìm thấy trận trong đội.';end if;
 select * into r from public.no_match_records where team_id=p_team and match_id=p_match;
 select * into g from public.no_gov_matches where team_id=p_team and id=p_match;
 select coalesce(jsonb_agg(value),'[]') into roster from (select distinct on(value->>'id') value from (select value,1 priority from jsonb_array_elements(public.no_app_snapshot(p_team)->'team'->'members') union all select value,2 from jsonb_array_elements(coalesce(m->'eligibleMembers','[]'))) v order by value->>'id',priority) names;
 roster:=coalesce(r.roster,roster);act:=coalesce(r.actual,'{}');
 for e in select distinct on(subject) * from public.no_gov_events where team_id=p_team and match_id=p_match and action='arrival' order by subject,seq desc loop
  act:=jsonb_set(act,array[e.subject::text],jsonb_build_object('status',case when (coalesce((select data->>'arrivedAt' from public.no_gov_events where team_id=p_team and action='adjust' and data->>'eventId'=e.id::text order by seq desc limit 1),e.data->>'arrivedAt'))::timestamptz>g.kickoff+make_interval(mins=>g.grace) then 'late' else 'ontime' end,'arrivedAt',coalesce((select data->>'arrivedAt' from public.no_gov_events where team_id=p_team and action='adjust' and data->>'eventId'=e.id::text order by seq desc limit 1),e.data->>'arrivedAt'),'confirmedBy',e.actor,'confirmedAt',e.created_at));
 end loop;
 if r.bill_id is not null then
  select jsonb_build_object('bill',to_jsonb(b),'required',b.total-coalesce((b.details->>'support')::bigint,0),'paid',coalesce((select sum(paid_amount) from public.no_pro_charges c where c.team_id=p_team and c.bill_id=b.id),0),'offset',coalesce((select sum(paid_amount) from public.no_pro_charges c where c.team_id=p_team and c.bill_id=b.id and b.details->>'payerKind'='member' and c.subject=b.details->>'payerId'),0),'collectionId',r.collection_id) into financial from public.no_pro_bills b where b.id=r.bill_id and b.team_id=p_team;
 elsif r.zero_cost then financial:=jsonb_build_object('zero',true,'required',0,'paid',0);end if;
 return jsonb_build_object('success',true,'match',m,'record',coalesce(to_jsonb(r),'{}'),'roster',roster,'actual',act,'registration',(select coalesce(data->'attendance'->p_match,'{}') from public.no_app_workspaces where team_id=p_team),'finance',financial,'canManage',me.role in ('owner','admin'),'canManageFunds',public.no_fund_manager(p_team),'me',me.user_id,'serverNow',clock_timestamp(),'history',(select coalesce(jsonb_agg(x order by x.created_at desc),'[]') from (select action,actor,created_at from public.no_match_events where team_id=p_team and match_id=p_match order by created_at desc limit 60) x));
end$$;

create function public.no_match_fines(p_team text,p_match text) returns jsonb language plpgsql security definer set search_path='' as $$
declare state jsonb;person jsonb;g public.no_gov_matches;request public.no_gov_events;decision text;baseline timestamptz;rule public.no_gov_rules;fine bigint;unvoted bigint;absence bigint;rows jsonb:='[]';kind text;
begin
 state:=public.no_match_state(p_team,p_match);select * into g from public.no_gov_matches where team_id=p_team and id=p_match;
 select * into rule from public.no_gov_rules where team_id=p_team and effective_at<=g.kickoff order by effective_at desc,version desc limit 1;
 for person in select value from jsonb_array_elements(state->'roster') loop
  fine:=0;unvoted:=0;absence:=0;kind:=null;baseline:=g.kickoff;
  if state->'actual'->(person->>'id')->>'status'='late' then
   select * into request from public.no_gov_events where team_id=p_team and match_id=p_match and subject::text=person->>'id' and action='late_request' order by seq desc limit 1;
   select data->>'status' into decision from public.no_gov_events where team_id=p_team and action='review_late' and data->>'requestId'=request.id::text order by seq desc limit 1;
   if coalesce(decision,request.data->>'status')='approved' then
    if g.approved_policy='eta' then baseline:=(request.data->>'eta')::timestamptz;elsif g.approved_policy='exempt' then baseline:='infinity';end if;
   end if;
   if (state->'actual'->(person->>'id')->>'arrivedAt')::timestamptz>baseline+make_interval(mins=>g.grace) then fine:=g.fine;kind:='late';end if;
  end if;
  if state->'match'->>'penaltyEnabled'='true' and not coalesce(state->'registration','{}') ? (person->>'id') and coalesce(state->'match'->'eligibleMemberIds','[]') @> jsonb_build_array(person->>'id') then unvoted:=coalesce(nullif(regexp_replace(state->'match'->>'penaltyAmount','[^0-9]','','g'),''),'0')::bigint;end if;
  if exists(select 1 from public.no_pro_settings where team_id=p_team and policy->>'absence'='true') and exists(select 1 from (select data,created_at from public.no_gov_events where team_id=p_team and match_id=p_match and subject::text=person->>'id' and action='attendance' order by seq desc limit 1) a where a.data->>'status'='absent' and a.created_at>=g.kickoff-interval '2 hours') then absence:=100000;end if;
  rows:=rows||jsonb_build_array(jsonb_build_object('id',person->>'id','name',person->>'name','fine',fine,'fundFine',case when kind='late' and exists(select 1 from public.no_pro_settings where team_id=p_team and policy->>'late'='true') then 30000 else 0 end,'unvotedFine',case when state->'match'->>'modelVersion'='2' then unvoted else 0 end,'absenceFine',absence,'type',kind,'ruleId',rule.id,'ruleVersion',rule.version));
 end loop;return rows;
end$$;

create function public.no_match_action(p_team text,p_match text,p_action text,p_payload jsonb default '{}',p_key uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare me public.no_gov_members;m jsonb;r public.no_match_records;state jsonb;before_record jsonb;item jsonb;person jsonb;fines jsonb;event_id uuid;member_uuid uuid;bill uuid;collection uuid;review_state text;at_time timestamptz;status text;reason text;total bigint;support bigint;fund_state jsonb;
begin
 perform 1 from public.no_gov_teams where id=p_team for update;
 state:=public.no_match_state(p_team,p_match);
 if p_action='state' then return state;end if;
 if p_action='preview_fines' then
  if not (state->>'canManage')::boolean then raise exception 'Chỉ ban quản lý được kiểm tra chốt.' using errcode='42501';end if;
  return state||jsonb_build_object('fines',public.no_match_fines(p_team,p_match));
 end if;
 if p_key is null then raise exception 'Thiếu mã chống trùng.';end if;
 if exists(select 1 from public.no_match_events where team_id=p_team and actor=auth.uid() and request_key=p_key) then return public.no_match_state(p_team,p_match);end if;
 select * into me from public.no_gov_members where team_id=p_team and user_id=auth.uid();m:=state->'match';
 if (p_action='cost' and not (state->>'canManageFunds')::boolean) or (p_action<>'cost' and not (state->>'canManage')::boolean) then raise exception 'Không có quyền thực hiện thao tác trận.' using errcode='42501';end if;
 if m->>'cancelledAt' is not null or (m->>'archivedAt' is not null and m->>'status'<>'completed') then raise exception 'Trận đã hủy; chỉ xem lịch sử.';end if;
 insert into public.no_match_records(team_id,match_id) values(p_team,p_match) on conflict do nothing;
 select * into r from public.no_match_records where team_id=p_team and match_id=p_match for update;before_record:=to_jsonb(r);
 case p_action
 when 'finish','result' then
  if p_action='finish' and m->>'status'='completed' and m->>'archivedAt' is not null then raise exception 'Trận đã kết thúc; không ghi đè kết quả bằng thao tác kết thúc.';end if;
  if p_action='result' and (m->>'status'<>'completed' or length(trim(coalesce(p_payload->>'reason','')))<3) then raise exception 'Chỉ bổ sung/sửa kết quả trận đã kết thúc; cần lý do cập nhật.';end if;
  if (m->>'datetime')::timestamptz>clock_timestamp() then raise exception 'Chưa đến giờ bắt đầu trận.';end if;
  if (p_payload->>'home' is null)<>(p_payload->>'away' is null) or coalesce((p_payload->>'home')::numeric,0) not between 0 and 999 or coalesce((p_payload->>'away')::numeric,0) not between 0 and 999 or coalesce((p_payload->>'home')::numeric,0)<>trunc(coalesce((p_payload->>'home')::numeric,0)) or coalesce((p_payload->>'away')::numeric,0)<>trunc(coalesce((p_payload->>'away')::numeric,0)) or length(coalesce(p_payload->>'note',''))>4000 then raise exception 'Tỷ số phải là số nguyên không âm, nhập cả hai đội hoặc để trống.';end if;
  update public.no_match_records set ended_at=case when p_action='finish' then clock_timestamp() else ended_at end,ended_by=case when p_action='finish' then auth.uid() else ended_by end,score_home=(p_payload->>'home')::integer,score_away=(p_payload->>'away')::integer,post_note=coalesce(p_payload->>'note','') where team_id=p_team and match_id=p_match;
   update public.no_app_workspaces set data=jsonb_set(jsonb_set(data,'{matches}',(select jsonb_agg(case when x->>'id'=p_match then x||jsonb_build_object('status','completed','scoreHome',(p_payload->>'home')::integer,'scoreAway',(p_payload->>'away')::integer)||case when p_action='finish' then jsonb_build_object('endedAt',clock_timestamp(),'archivedAt',clock_timestamp(),'archivedBy',auth.uid()) else '{}'::jsonb end else x end) from jsonb_array_elements(data->'matches') x)),'{notices}',case when p_action='finish' and not exists(select 1 from jsonb_array_elements(coalesce(data->'notices','[]'::jsonb)) n where n->>'id'=md5(p_key::text||':archive_notice')) then jsonb_build_array(jsonb_build_object('id',md5(p_key::text||':archive_notice'),'title','Đã chuyển trận đấu vào Lịch sử','content',coalesce(m->>'title','Trận đấu'),'message','Đã chuyển trận đấu vào Lịch sử','destination','match-detail','route','match-detail','matchId',p_match,'audience','leaders','createdAt',clock_timestamp())) || coalesce(data->'notices','[]'::jsonb) else coalesce(data->'notices','[]'::jsonb) end),revision=revision+1 where team_id=p_team;
 when 'cancel' then
  if m->>'status'='completed' or length(trim(coalesce(p_payload->>'reason','')))<3 then raise exception 'Cần lý do hủy; trận đã kết thúc không được hủy bằng thao tác này.';end if;
  perform public.no_gov_mutate(p_team,'archive_match',jsonb_build_object('matchId',p_match),p_key);
  update public.no_app_workspaces set data=jsonb_set(data,'{matches}',(select jsonb_agg(case when x->>'id'=p_match then x||jsonb_build_object('cancelledAt',clock_timestamp(),'cancelReason',trim(p_payload->>'reason')) else x end) from jsonb_array_elements(data->'matches') x)),revision=revision+1 where team_id=p_team;
 when 'actual' then
  if r.finalized_at is not null then raise exception 'Điểm danh đã chốt; dùng điều chỉnh có lý do trong Nội quy.';end if;
  if (m->>'datetime')::timestamptz>clock_timestamp()+interval '4 hours' then raise exception 'Chưa tới thời gian ghi nhận thực tế.';end if;
  if jsonb_typeof(p_payload->'entries')<>'array' or jsonb_array_length(p_payload->'entries')>100 then raise exception 'Danh sách thực tế không hợp lệ.';end if;
  for item in select value from jsonb_array_elements(p_payload->'entries') loop
   if not exists(select 1 from jsonb_array_elements(state->'roster') x where x->>'id'=item->>'id') or item->>'status' not in ('present','absent','unknown') then raise exception 'Thành viên/trạng thái không hợp lệ.';end if;
   if state->'actual'->(item->>'id') is not null and item->>'status'='unknown' then raise exception 'Không xóa xác nhận; dùng điều chỉnh có lịch sử.';end if;
   if item->>'id'=auth.uid()::text then raise exception 'Cần quản trị viên khác xác nhận tham gia thực tế của bạn.';end if;
   if length(trim(coalesce(p_payload->>'reason','')))<3 then raise exception 'Nhập ghi chú xác nhận thực tế ít nhất 3 ký tự.';end if;
   if exists(select 1 from public.no_gov_events where team_id=p_team and match_id=p_match and subject::text=item->>'id' and action='arrival') then raise exception 'Giờ đến đã được xác nhận; dùng điều chỉnh trong Nội quy.';end if;
   if item->>'status'='present' then
    at_time:=(item->>'arrivedAt')::timestamptz;
    if at_time is null or at_time>clock_timestamp()+interval '1 minute' or at_time<(m->>'datetime')::timestamptz-interval '4 hours' then raise exception 'Giờ đến thực tế không hợp lệ.';end if;
    select user_id into member_uuid from public.no_gov_members where team_id=p_team and user_id::text=item->>'id';
    if member_uuid is not null then perform public.no_gov_mutate(p_team,'arrival',jsonb_build_object('matchId',p_match,'subject',member_uuid,'arrivedAt',at_time,'reason',p_payload->>'reason'),md5(p_key::text||(item->>'id'))::uuid);end if;
    status:=case when at_time>(select kickoff+make_interval(mins=>grace) from public.no_gov_matches where team_id=p_team and id=p_match) then 'late' else 'ontime' end;
   else status:=item->>'status';at_time:=null;end if;
   update public.no_match_records set actual=jsonb_set(actual,array[item->>'id'],jsonb_build_object('status',status,'arrivedAt',at_time,'confirmedBy',auth.uid(),'confirmedAt',clock_timestamp(),'reason',p_payload->>'reason')) where team_id=p_team and match_id=p_match;
  end loop;
 when 'finalize' then
  if r.finalized_at is not null then return state;end if;
  if m->>'status'<>'completed' then raise exception 'Kết thúc trận trước khi chốt toàn bộ danh sách.';end if;
  if exists(select 1 from jsonb_array_elements(state->'roster') x where coalesce(state->'actual'->(x->>'id')->>'status','unknown')='unknown') then raise exception 'Còn thành viên chưa xác nhận thực tế.';end if;
  if exists(select 1 from (select distinct on(subject) * from public.no_gov_events where team_id=p_team and match_id=p_match and action='late_request' order by subject,seq desc) q where coalesce((select e.data->>'status' from public.no_gov_events e where e.team_id=p_team and e.action='review_late' and e.data->>'requestId'=q.id::text order by e.seq desc limit 1),q.data->>'status')='pending') then raise exception 'Cần xử lý các yêu cầu xin muộn trước khi chốt.';end if;
  fines:=public.no_match_fines(p_team,p_match);
  for person in select value from jsonb_array_elements(fines) loop
   if person->>'type'='late' then
    select user_id into member_uuid from public.no_gov_members where team_id=p_team and user_id::text=person->>'id';
    if member_uuid is null then raise exception 'Thành viên chưa có tài khoản; xử lý vi phạm có lý do trong Nội quy trước.';end if;
    if not exists(select 1 from public.no_gov_events where team_id=p_team and match_id=p_match and subject=member_uuid and action='violation' and data->>'type'='late') then perform public.no_gov_mutate(p_team,'finalize',jsonb_build_object('subject',member_uuid,'matchId',p_match),md5(p_key::text||(person->>'id'))::uuid);end if;
   end if;
   if (person->>'unvotedFine')::bigint>0 then
    select user_id into member_uuid from public.no_gov_members where team_id=p_team and user_id::text=person->>'id';
    if member_uuid is null then raise exception 'Cần xác minh tài khoản trước khi chốt vi phạm chưa điểm danh.';end if;
    if not exists(select 1 from public.no_gov_events where team_id=p_team and match_id=p_match and subject=member_uuid and action='violation' and data->>'type'='unvoted') then
     perform public.no_gov_mutate(p_team,'violation',jsonb_build_object('subject',member_uuid,'matchId',p_match,'type','unvoted','description','Chưa đăng ký trước hạn điểm danh','occurredAt',m->>'datetime','fine',(person->>'unvotedFine')::bigint),md5(p_key::text||(person->>'id')||':unvoted')::uuid);
    end if;
    perform public.no_pro_charge(p_team,person->>'id','fine',p_match||':'||(person->>'id')||':unvoted','Chưa điểm danh · '||coalesce(m->>'title',p_match),(person->>'unvotedFine')::bigint);
   end if;
   if (person->>'absenceFine')::bigint>0 then
    if person->>'id'=auth.uid()::text then raise exception 'Quản trị viên khác cần chốt khoản phạt báo vắng sát giờ của bạn.';end if;
   end if;
  end loop;
  -- Reuse the existing team automation amounts/void rules; change only the trigger point.
  perform public.no_pro_apply_fines(p_team,p_match);
  p_payload:=p_payload||jsonb_build_object('appliedFines',fines,'teamFinePolicy',(select policy from public.no_pro_settings where team_id=p_team));
  update public.no_match_records set actual=state->'actual',roster=state->'roster',finalized_at=clock_timestamp(),finalized_by=auth.uid() where team_id=p_team and match_id=p_match;
 when 'cost' then
  if r.bill_id is not null or r.zero_cost then raise exception 'Chi phí đã xác nhận; điều chỉnh giao dịch trong Quỹ đội, không tạo lại đợt thu.';end if;
  total:=(p_payload->>'total')::bigint;support:=coalesce((p_payload->>'support')::bigint,0);
  if total is null or total<0 or total>1000000000 or support<0 or support>total or (p_payload->>'total')::numeric<>trunc((p_payload->>'total')::numeric) or coalesce((p_payload->>'support')::numeric,0)<>trunc(coalesce((p_payload->>'support')::numeric,0)) then raise exception 'Chi phí thực tế không hợp lệ.';end if;
  if p_payload->>'confirmed' is distinct from 'true' then raise exception 'Cần xác nhận chi phí thực tế trước khi ghi nhận.';end if;
  if jsonb_typeof(coalesce(p_payload->'allocations','[]'))<>'array' then raise exception 'Phân bổ không hợp lệ.';end if;
  if exists(select 1 from jsonb_array_elements(coalesce(p_payload->'allocations','[]')) a where (a->>'amount')::numeric<>trunc((a->>'amount')::numeric) or a->>'amount' is null) then raise exception 'Phần đóng phải là số nguyên VND.';end if;
  if total=0 then update public.no_match_records set zero_cost=true where team_id=p_team and match_id=p_match;
  else
   fund_state:=public.no_fund_action(p_team,'bill',p_payload||jsonb_build_object('title','Chi phí trận · '||coalesce(m->>'title',p_match),'purpose','match','matchId',p_match),p_key);
   bill:=p_key;collection:=gen_random_uuid();
   insert into public.no_fund_collections(id,team_id,period,title,due_date,note,actor,roster) values(collection,p_team,'match:'||p_match,'Chi phí trận · '||coalesce(m->>'title',p_match),(clock_timestamp() at time zone 'Asia/Ho_Chi_Minh')::date,'Liên kết trận; tách khỏi Sinh tố lúa mạch.',auth.uid(),(select coalesce(jsonb_agg(x),'[]') from jsonb_array_elements(state->'roster') x where exists(select 1 from jsonb_array_elements(p_payload->'allocations') a where a->>'id'=x->>'id')));
   update public.no_pro_charges set kind='match',collection_id=collection where team_id=p_team and bill_id=bill;
   update public.no_app_workspaces set data=jsonb_set(data,'{notices}',(select jsonb_agg(case when x->>'id' in (select md5('bill:'||p_key||':'||(a->>'id'))::uuid::text from jsonb_array_elements(p_payload->'allocations') a) then x||jsonb_build_object('title','Chi phí trận','matchId',p_match) else x end) from jsonb_array_elements(data->'notices') x)) where team_id=p_team;
   update public.no_match_records set bill_id=bill,collection_id=collection where team_id=p_team and match_id=p_match;
  end if;
 else raise exception 'Thao tác trận không hợp lệ.';
 end case;
 insert into public.no_match_events(team_id,match_id,actor,action,request_key,payload,before_value,after_value) select p_team,p_match,auth.uid(),p_action,p_key,p_payload,before_record,to_jsonb(x) from public.no_match_records x where team_id=p_team and match_id=p_match;
 if p_action in ('finish','result','cancel') then
  for person in select value from jsonb_array_elements(state->'roster') loop
   perform public.no_fund_notice(p_team,person->>'id','match-'||p_key||':'||(person->>'id'),case when p_action='cancel' then 'Trận đấu đã hủy' when p_action='result' then 'Kết quả trận được cập nhật' else 'Đã chuyển trận đấu vào Lịch sử' end,coalesce(m->>'title','Trận đấu'),'match-detail',jsonb_build_object('matchId',p_match));
  end loop;
 end if;
 update public.no_app_workspaces set revision=revision+1 where team_id=p_team;
 return public.no_match_state(p_team,p_match);
end$$;
revoke all on function public.no_match_validate(),public.no_match_fines(text,text),public.no_match_state(text,text),public.no_match_action(text,text,text,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.no_match_action(text,text,text,jsonb,uuid) to authenticated;

-- Link third-half bills only to a match of the same team. The existing bill ledger remains authoritative.
alter function public.no_fund_action(text,text,jsonb,uuid) rename to no_fund_action_before_match_lifecycle;
revoke all on function public.no_fund_action_before_match_lifecycle(text,text,jsonb,uuid) from public,anon,authenticated;
create function public.no_fund_action(p_team text,p_action text,p_payload jsonb default '{}',p_key uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare linked jsonb;
begin
 if p_action='bill' and nullif(p_payload->>'matchId','') is not null then
  linked:=public.no_match_state(p_team,p_payload->>'matchId');
  if linked->'match'->>'cancelledAt' is not null or (linked->'match'->>'archivedAt' is not null and linked->'match'->>'status'<>'completed') then raise exception 'Không tạo thêm hóa đơn cho trận đã hủy.';end if;
 end if;
 return public.no_fund_action_before_match_lifecycle(p_team,p_action,p_payload,p_key);
end$$;
revoke all on function public.no_fund_action(text,text,jsonb,uuid) from public,anon;
grant execute on function public.no_fund_action(text,text,jsonb,uuid) to authenticated;

-- Preserve special append-only adjustments, block ordinary edits after finalization.
alter function public.no_gov_mutate(text,text,jsonb,uuid) rename to no_gov_mutate_before_match_lifecycle;
revoke all on function public.no_gov_mutate_before_match_lifecycle(text,text,jsonb,uuid) from public,anon,authenticated;
create function public.no_gov_mutate(p_team_id text,p_action text,p_payload jsonb,p_key uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_match_id text;
begin
 v_match_id:=case when p_action='match' then p_payload->>'id' else p_payload->>'matchId' end;
 if p_action='review_late' then select e.match_id into v_match_id from public.no_gov_events e where e.team_id=p_team_id and e.id=(p_payload->>'requestId')::uuid;end if;
 if p_action in ('attendance','late_request','arrival','match','review_late','finalize','violation') and exists(select 1 from public.no_match_records r where r.team_id=p_team_id and r.match_id=v_match_id and r.finalized_at is not null) then raise exception 'Điểm danh đã chốt; chỉ điều chỉnh có lý do theo quy định.';end if;
 return public.no_gov_mutate_before_match_lifecycle(p_team_id,p_action,p_payload,p_key);
end$$;
revoke all on function public.no_gov_mutate(text,text,jsonb,uuid) from public,anon;
grant execute on function public.no_gov_mutate(text,text,jsonb,uuid) to authenticated;
update public.no_app_workspaces set data=jsonb_set(data,'{matches}',(select coalesce(jsonb_agg(case when x->>'status'='completed' and x->>'archivedAt' is null then x||jsonb_build_object('archivedAt',coalesce(x->>'endedAt',x->>'datetime',clock_timestamp()::text)) else x end),'[]'::jsonb) from jsonb_array_elements(coalesce(data->'matches','[]'::jsonb)) x)) where exists(select 1 from jsonb_array_elements(coalesce(data->'matches','[]'::jsonb)) x where x->>'status'='completed' and x->>'archivedAt' is null);
notify pgrst,'reload schema';
commit;
