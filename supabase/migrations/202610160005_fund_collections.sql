-- Extend the existing workspace ledger and Pro obligations; never import/reset history.
begin;
alter table public.no_gov_members add column can_manage_funds boolean not null default false;
alter table public.no_gov_members add column receive_attendance boolean not null default false;
create table public.no_fund_schedules(
 id uuid primary key, team_id text not null references public.no_gov_teams(id), title text not null,
 amount bigint not null check(amount between 1 and 1000000000), recipients jsonb not null,
 repeat text not null check(repeat in ('once','monthly')), send_day integer not null check(send_day between 1 and 31),
 send_time time not null, due_days integer not null check(due_days between 0 and 366),
 due_day integer not null check(due_day between 1 and 31), due_months integer not null check(due_months between 0 and 12),
 next_run timestamptz not null, status text not null default 'active' check(status in ('active','paused','cancelled','finished')),
 note text not null default '', actor uuid not null, updated_by uuid not null,
 created_at timestamptz not null default clock_timestamp(), updated_at timestamptz not null default clock_timestamp()
);
create index no_fund_schedule_due on public.no_fund_schedules(next_run) where status='active';
create table public.no_fund_collections(
 id uuid primary key default gen_random_uuid(), team_id text not null references public.no_gov_teams(id),
 schedule_id uuid references public.no_fund_schedules(id), period text not null, title text not null,
 due_date date not null, note text not null default '', status text not null default 'open' check(status in ('open','cancelled')),
 actor uuid not null, roster jsonb not null, created_at timestamptz not null default clock_timestamp(),
 unique(schedule_id,period)
);
alter table public.no_pro_charges drop constraint no_pro_charges_kind_check;
alter table public.no_pro_charges add constraint no_pro_charges_kind_check check(kind in ('fine','third','fund'));
alter table public.no_pro_charges add column collection_id uuid references public.no_fund_collections(id);
alter table public.no_pro_charges add column paid_amount bigint not null default 0 check(paid_amount>=0 and paid_amount<=amount);
update public.no_pro_charges set paid_amount=amount where status='paid';
create unique index no_fund_obligation_once on public.no_pro_charges(collection_id,subject) where collection_id is not null;
alter table public.no_pro_bills add column details jsonb not null default '{}';
create table public.no_fund_events(
 id uuid primary key default gen_random_uuid(), team_id text not null references public.no_gov_teams(id),
 actor uuid not null, request_key uuid not null, action text not null, payload jsonb not null,
 before_value jsonb, after_value jsonb, created_at timestamptz not null default clock_timestamp(), unique(team_id,actor,request_key)
);
alter table public.no_fund_schedules enable row level security;
alter table public.no_fund_collections enable row level security;
alter table public.no_fund_events enable row level security;
revoke all on public.no_fund_schedules,public.no_fund_collections,public.no_fund_events from public,anon,authenticated;

create function public.no_fund_manager(p_team text,p_user uuid default auth.uid()) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.no_gov_members where team_id=p_team and user_id=p_user
 and (status='active' or (status='locked' and locked_until<=clock_timestamp())) and (role in ('owner','admin') or can_manage_funds));
$$;
create function public.no_fund_roster(p_team text) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(v order by v->>'id'),'[]') from (
 select jsonb_build_object('id',user_id::text,'name',name,'number',jersey_number,'registered',true,'role',role) v from public.no_gov_members
 where team_id=p_team and (status='active' or (status='locked' and locked_until<=clock_timestamp()))
 union all select jsonb_build_object('id',m->>'id','name',m->>'name','number',m->'number','registered',false) from public.no_app_workspaces w
 cross join jsonb_array_elements(coalesce(w.settings->'manualMembers','[]')) m
 where w.team_id=p_team and coalesce(m->>'membershipStatus','active') not in ('removed','linked')
 ) roster;
$$;
create function public.no_fund_month_time(p_month date,p_day integer,p_time time) returns timestamptz
language sql immutable set search_path='' as $$
 select (date_trunc('month',p_month)::date + (least(p_day,extract(day from date_trunc('month',p_month)+interval '1 month - 1 day')::int)-1) + p_time) at time zone 'Asia/Ho_Chi_Minh';
$$;
create function public.no_fund_notice(p_team text,p_subject text,p_key text,p_title text,p_body text,p_route text default 'fund',p_meta jsonb default '{}') returns void
language plpgsql security definer set search_path='' as $$
begin
 update public.no_app_workspaces set revision=revision+1,updated_at=clock_timestamp(),data=jsonb_set(data,'{notices}',
 jsonb_build_array(jsonb_build_object('id',md5(p_key)::uuid,'title',p_title,'content',p_body,'route',p_route,'audience',p_subject,'createdAt',clock_timestamp()) || p_meta) || coalesce(data->'notices','[]'))
 where team_id=p_team and not exists(select 1 from jsonb_array_elements(coalesce(data->'notices','[]')) n where n->>'id'=md5(p_key)::uuid::text);
end $$;

alter function public.no_app_snapshot(text) rename to no_app_snapshot_before_collections;
revoke all on function public.no_app_snapshot_before_collections(text) from public,anon,authenticated;
create function public.no_app_snapshot(p_team_id text) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; m public.no_gov_members; roster jsonb;
begin
 result:=public.no_app_snapshot_before_collections(p_team_id);
 select * into m from public.no_gov_members where team_id=p_team_id and user_id=auth.uid();
 if public.no_fund_manager(p_team_id) then
  result:=jsonb_set(result,'{data,funds}',(select data->'funds' from public.no_app_workspaces where team_id=p_team_id));
 end if;
 select coalesce(jsonb_agg(x || jsonb_build_object('canManageFunds',coalesce(g.can_manage_funds,false),'receiveAttendance',coalesce(g.receive_attendance,false))),'[]') into roster
 from jsonb_array_elements(result->'team'->'members') x left join public.no_gov_members g on g.team_id=p_team_id and g.user_id::text=x->>'id';
 return jsonb_set(result,'{team,members}',roster) || jsonb_build_object('canManageFunds',public.no_fund_manager(p_team_id),'treasurer',m.can_manage_funds,'receiveAttendance',m.receive_attendance);
end $$;
revoke all on function public.no_app_snapshot(text) from public,anon;
grant execute on function public.no_app_snapshot(text) to authenticated;

-- Each schedule/period and collection/subject has a unique key. Called only by the server worker.
create function public.no_fund_materialize(p_schedule uuid) returns uuid language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare s public.no_fund_schedules; c uuid; period text; due date; roster jsonb; person jsonb;
begin
 select * into s from public.no_fund_schedules where id=p_schedule;
 perform 1 from public.no_gov_teams where id=s.team_id for update;
 period:=case when s.repeat='monthly' then to_char(s.next_run at time zone 'Asia/Ho_Chi_Minh','YYYY-MM') else 'once' end;
 due:=case when s.repeat='monthly' then (public.no_fund_month_time((date_trunc('month',s.next_run at time zone 'Asia/Ho_Chi_Minh')+make_interval(months=>s.due_months))::date,s.due_day,'00:00') at time zone 'Asia/Ho_Chi_Minh')::date else (s.next_run at time zone 'Asia/Ho_Chi_Minh')::date+s.due_days end;
 roster:=public.no_fund_roster(s.team_id);
 if s.recipients<>'"all"'::jsonb then select coalesce(jsonb_agg(x),'[]') into roster from jsonb_array_elements(roster) x where s.recipients ? (x->>'id');end if;
 insert into public.no_fund_collections(team_id,schedule_id,period,title,due_date,note,actor,roster)
 values(s.team_id,s.id,period,s.title,due,s.note,s.updated_by,roster)
 on conflict on constraint no_fund_collections_schedule_id_period_key do nothing returning id into c;
 if c is null then select id into c from public.no_fund_collections where schedule_id=s.id and no_fund_collections.period=period;return c;end if;
 for person in select value from jsonb_array_elements(roster) loop
  insert into public.no_pro_charges(team_id,subject,kind,source_key,label,amount,actor,collection_id)
  values(s.team_id,person->>'id','fund','collection:'||c||':'||(person->>'id'),s.title,s.amount,s.updated_by,c) on conflict(team_id,source_key) do nothing;
  perform public.no_fund_notice(s.team_id,person->>'id','collection:'||c||':'||(person->>'id'),s.title,'Cần đóng '||s.amount||' đ · Hạn '||to_char(due,'DD/MM/YYYY'),'fund',jsonb_build_object('collectionId',c));
 end loop;
 return c;
end $$;

create function public.no_fund_tick(p_now timestamptz default clock_timestamp()) returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.no_fund_schedules; n integer:=0; next_at timestamptz;
begin
 for s in select * from public.no_fund_schedules where status='active' and next_run<=p_now order by next_run limit 50 loop
  perform 1 from public.no_gov_teams where id=s.team_id for update skip locked;
  if not found then continue;end if;
  select * into s from public.no_fund_schedules where id=s.id and status='active' and next_run<=p_now for update;
  if not found then continue;end if;
  -- If the creator lost fund access, stop rather than issuing new obligations without authority.
  if not public.no_fund_manager(s.team_id,s.updated_by) then update public.no_fund_schedules set status='paused' where id=s.id;continue;end if;
  perform public.no_fund_materialize(s.id);n:=n+1;
  if s.repeat='once' then update public.no_fund_schedules set status='finished' where id=s.id;
  else
   next_at:=public.no_fund_month_time((date_trunc('month',s.next_run at time zone 'Asia/Ho_Chi_Minh')+interval '1 month')::date,s.send_day,s.send_time);
   update public.no_fund_schedules set next_run=next_at where id=s.id;
  end if;
 end loop;
 return jsonb_build_object('createdOrRetried',n,'observedAt',clock_timestamp());
end $$;
revoke all on function public.no_fund_tick(timestamptz) from public,anon,authenticated;
grant execute on function public.no_fund_tick(timestamptz) to service_role;

create function public.no_fund_scheduler_ready() returns boolean language plpgsql stable security definer set search_path='' as $$
declare ready boolean;begin
 if to_regclass('cron.job') is null then return false;end if;
 execute 'select exists(select 1 from cron.job where jobname=''no-offside-fund-tick'' and active)' into ready;return ready;
end $$;
create function public.no_fund_state(p_team text) returns jsonb language plpgsql security definer set search_path='' as $$
declare m public.no_gov_members; manager boolean;
begin
 select * into m from public.no_gov_members where team_id=p_team and user_id=auth.uid();
 if not found then raise exception 'Không có quyền truy cập quỹ đội.' using errcode='42501';end if;
 manager:=public.no_fund_manager(p_team);
 return jsonb_build_object('success',true,'teamId',p_team,'canManage',manager,'treasurer',m.can_manage_funds,'owner',m.role='owner',
 'schedulerConfigured',public.no_fund_scheduler_ready(),'schedules',(select coalesce(jsonb_agg(s order by s.created_at desc),'[]') from public.no_fund_schedules s where s.team_id=p_team and manager),
 'collections',(select coalesce(jsonb_agg(c order by c.created_at desc),'[]') from public.no_fund_collections c where c.team_id=p_team and (manager or exists(select 1 from public.no_pro_charges ch where ch.collection_id=c.id and ch.subject=auth.uid()::text))),
 'charges',(select coalesce(jsonb_agg(c order by c.created_at desc),'[]') from public.no_pro_charges c where c.team_id=p_team and (manager or c.subject=auth.uid()::text)),
 'bills',(select coalesce(jsonb_agg(b order by b.created_at desc),'[]') from public.no_pro_bills b where b.team_id=p_team and (manager or exists(select 1 from public.no_pro_charges c where c.bill_id=b.id and c.subject=auth.uid()::text))),
 'members',case when manager then public.no_fund_roster(p_team) else '[]'::jsonb end,
 'history',(select coalesce(jsonb_agg(e order by e.created_at desc),'[]') from (select id,request_key,actor,action,payload,before_value,after_value,created_at from public.no_fund_events where team_id=p_team and manager order by created_at desc limit 100) e));
end $$;

create function public.no_fund_action(p_team text,p_action text,p_payload jsonb default '{}',p_key uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare me public.no_gov_members; prior public.no_fund_events; w public.no_app_workspaces; funds jsonb; before_data jsonb;
 s public.no_fund_schedules; c public.no_pro_charges; b public.no_pro_bills; tx jsonb; old_tx jsonb; pending jsonb; request jsonb;
 amount bigint; old_amount bigint; total bigint; support bigint; paid bigint; subject text; id uuid; first_at timestamptz; due date;
 tx_id text; roster jsonb; person jsonb; allocations jsonb; count_people integer; idx integer:=0; reason text;
begin
 select * into me from public.no_gov_members where team_id=p_team and user_id=auth.uid();
 if not found then raise exception 'Không có quyền truy cập đội.' using errcode='42501';end if;
 if p_action='state' then return public.no_fund_state(p_team);end if;
 if p_action='history' then
  if not public.no_fund_manager(p_team) then raise exception 'Không có quyền xem lịch sử quỹ.' using errcode='42501';end if;
  return jsonb_build_object('success',true,'history',(select coalesce(jsonb_agg(e order by e.created_at desc),'[]') from public.no_fund_events e where e.team_id=p_team and (e.payload->>'id'=p_payload->>'id' or e.request_key::text=p_payload->>'id')));
 end if;
 if not (me.status='active' or (me.status='locked' and me.locked_until<=clock_timestamp())) then raise exception 'Tài khoản bị hạn chế trong đội.' using errcode='42501';end if;
 if p_key is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>40000 then raise exception 'Dữ liệu hoặc mã thao tác không hợp lệ.';end if;
 perform 1 from public.no_gov_teams where no_gov_teams.id=p_team for update;
 select * into prior from public.no_fund_events where team_id=p_team and actor=auth.uid() and request_key=p_key;
 if found then
  if prior.action<>p_action or prior.payload<>p_payload then raise exception 'Mã thao tác đã dùng cho dữ liệu khác.';end if;
  return public.no_fund_state(p_team);
 end if;
 if p_action<>'payment_request' and not public.no_fund_manager(p_team) then raise exception 'Không có quyền quản lý quỹ.' using errcode='42501';end if;
 select * into w from public.no_app_workspaces where team_id=p_team for update;
 funds:=w.data->'funds';before_data:=funds;roster:=public.no_fund_roster(p_team);
 case p_action
 when 'permission' then
  if me.role<>'owner' then raise exception 'Chỉ chủ đội được phân quyền.' using errcode='42501';end if;
  if jsonb_typeof(p_payload->'canManageFunds')<>'boolean' or jsonb_typeof(p_payload->'receiveAttendance')<>'boolean' then raise exception 'Quyền không hợp lệ.';end if;
  update public.no_gov_members set can_manage_funds=(p_payload->>'canManageFunds')::boolean,receive_attendance=(p_payload->>'receiveAttendance')::boolean
  where team_id=p_team and user_id=(p_payload->>'userId')::uuid and status<>'removed';
  if not found then raise exception 'Không tìm thấy thành viên trong đội.';end if;
  update public.no_app_workspaces set revision=revision+1 where team_id=p_team;
 when 'schedule_save' then
  id:=coalesce((p_payload->>'id')::uuid,p_key);
  select * into s from public.no_fund_schedules where no_fund_schedules.id=id and team_id=p_team;
  if exists(select 1 from public.no_fund_schedules where no_fund_schedules.id=id and team_id<>p_team) then raise exception 'Lịch không thuộc đội.' using errcode='42501';end if;
  first_at:=(p_payload->>'sendAt')::timestamptz;due:=(p_payload->>'dueDate')::date;amount:=(p_payload->>'amount')::bigint;
  if first_at is null or due is null or due<(first_at at time zone 'Asia/Ho_Chi_Minh')::date or amount is null or amount not between 1 and 1000000000
   or length(trim(coalesce(p_payload->>'title','')))<2 or length(p_payload->>'title')>120 or length(coalesce(p_payload->>'note',''))>1000
   or p_payload->>'repeat' not in ('once','monthly') or (p_payload->>'day')::int not between 1 and 31 then raise exception 'Lịch thu không hợp lệ.';end if;
  if p_payload->'recipients'<>'"all"'::jsonb and (jsonb_typeof(p_payload->'recipients')<>'array' or jsonb_array_length(p_payload->'recipients')=0
   or exists(select 1 from jsonb_array_elements_text(p_payload->'recipients') r where not exists(select 1 from jsonb_array_elements(roster) m where m->>'id'=r))) then raise exception 'Chọn thành viên đang hoạt động.';end if;
  if p_payload->'recipients' is null then raise exception 'Thiếu đối tượng đóng.';end if;
  if s.id is not null and first_at<=clock_timestamp() then raise exception 'Sửa lịch chỉ áp dụng thời điểm tương lai.';end if;
  insert into public.no_fund_schedules(id,team_id,title,amount,recipients,repeat,send_day,send_time,due_days,due_day,due_months,next_run,note,actor,updated_by)
  values(id,p_team,trim(p_payload->>'title'),amount,p_payload->'recipients',p_payload->>'repeat',(p_payload->>'day')::int,(first_at at time zone 'Asia/Ho_Chi_Minh')::time,
   due-(first_at at time zone 'Asia/Ho_Chi_Minh')::date,extract(day from due)::int,((extract(year from due)::int-extract(year from first_at at time zone 'Asia/Ho_Chi_Minh')::int)*12+extract(month from due)::int-extract(month from first_at at time zone 'Asia/Ho_Chi_Minh')::int),first_at,coalesce(p_payload->>'note',''),auth.uid(),auth.uid())
  on conflict on constraint no_fund_schedules_pkey do update set title=excluded.title,amount=excluded.amount,recipients=excluded.recipients,repeat=excluded.repeat,send_day=excluded.send_day,send_time=excluded.send_time,due_days=excluded.due_days,due_day=excluded.due_day,due_months=excluded.due_months,next_run=excluded.next_run,note=excluded.note,updated_by=auth.uid(),updated_at=clock_timestamp();
  if first_at<=clock_timestamp() then
   perform public.no_fund_materialize(id);
   update public.no_fund_schedules set status=case when repeat='once' then 'finished' else status end, next_run=case when repeat='monthly' then public.no_fund_month_time((date_trunc('month',first_at at time zone 'Asia/Ho_Chi_Minh')+interval '1 month')::date,send_day,send_time) else next_run end where no_fund_schedules.id=id;
  end if;
 when 'schedule_status' then
  if p_payload->>'status' not in ('active','paused','cancelled') then raise exception 'Trạng thái không hợp lệ.';end if;
  update public.no_fund_schedules set status=p_payload->>'status',updated_by=auth.uid(),updated_at=clock_timestamp() where no_fund_schedules.id=(p_payload->>'id')::uuid and team_id=p_team and status not in ('cancelled','finished');
  if not found then raise exception 'Lịch đã kết thúc hoặc không thuộc đội.';end if;
 when 'remind' then
  select * into s from public.no_fund_schedules where team_id=p_team and no_fund_schedules.id=(p_payload->>'scheduleId')::uuid;
  if s.id is null or not exists(select 1 from public.no_fund_collections cc where cc.id=(p_payload->>'collectionId')::uuid and cc.schedule_id=s.id and cc.team_id=p_team and cc.status='open') then raise exception 'Không tìm thấy đợt thu đang mở của lịch.';end if;
  for c in select * from public.no_pro_charges where team_id=p_team and collection_id=(p_payload->>'collectionId')::uuid and status='owed' and paid_amount<no_pro_charges.amount loop
   perform public.no_fund_notice(p_team,c.subject,'remind:'||c.id||':'||to_char(clock_timestamp() at time zone 'Asia/Ho_Chi_Minh','YYYY-MM-DD'),c.label,'Còn thiếu '||(c.amount-c.paid_amount)||' đ. Vui lòng kiểm tra Quỹ đội.');
  end loop;
 when 'collection_cancel' then
  update public.no_fund_collections set status='cancelled' where no_fund_collections.id=(p_payload->>'id')::uuid and team_id=p_team;
  if not found then raise exception 'Không tìm thấy đợt thu.';end if;
  update public.no_pro_charges set status='void',reason='Hủy phần nghĩa vụ chưa thu; giữ nguyên các khoản đã nhận',resolved_at=clock_timestamp() where team_id=p_team and collection_id=(p_payload->>'id')::uuid;
 when 'payment_request','payment','payment_approve' then
  if p_action='payment_approve' then
   select x into request from jsonb_array_elements(coalesce(funds->'pendingApprovals','[]')) x where x->>'id'=p_payload->>'requestId' and x ? 'chargeId';
   if request is null then
    if exists(select 1 from jsonb_array_elements(coalesce(funds->'transactions','[]')) x where x->>'paymentId'=p_payload->>'requestId') or exists(select 1 from public.no_fund_events e where e.team_id=p_team and e.action='payment_approve' and e.payload->>'requestId'=p_payload->>'requestId') then return public.no_fund_state(p_team);end if;
    raise exception 'Yêu cầu không còn chờ duyệt.';
   end if;
   id:=(request->>'chargeId')::uuid;amount:=(request->>'amount')::bigint;
  else id:=(p_payload->>'chargeId')::uuid;amount:=(p_payload->>'amount')::bigint;end if;
  select * into c from public.no_pro_charges where no_pro_charges.id=id and team_id=p_team for update;
  if c.id is null or c.status<>'owed' or amount is null or amount<1 or amount>c.amount-c.paid_amount then raise exception 'Số tiền vượt phần còn thiếu hoặc nghĩa vụ không hợp lệ.';end if;
  if p_action='payment_request' then
   if c.subject<>auth.uid()::text then raise exception 'Chỉ báo chuyển khoản của chính mình.' using errcode='42501';end if;
   if exists(select 1 from jsonb_array_elements(coalesce(funds->'pendingApprovals','[]')) x where x->>'chargeId'=c.id::text) then return public.no_fund_state(p_team);end if;
   funds:=jsonb_set(funds,'{pendingApprovals}',coalesce(funds->'pendingApprovals','[]') || jsonb_build_array(jsonb_build_object('id',p_key,'chargeId',c.id,'playerId',c.subject,'name',me.name,'amount',amount,'title',c.label,'status','pending','createdAt',clock_timestamp())));
   for person in select jsonb_build_object('id',user_id::text) from public.no_gov_members where team_id=p_team and public.no_fund_manager(p_team,user_id) loop
    perform public.no_fund_notice(p_team,person->>'id','payment-request:'||p_key||':'||(person->>'id'),'Chờ xác nhận đóng quỹ',me.name||' báo đã chuyển '||amount||' đ.');
   end loop;
  else
   select * into b from public.no_pro_bills where no_pro_bills.id=c.bill_id;
   if c.bill_id is not null and coalesce(b.details,'{}')='{}' then raise exception 'Hóa đơn cũ chưa xác định nguồn chi: cần đối soát trước khi ghi vào quỹ.';end if;
   if c.bill_id is null or coalesce(b.details->>'payerKind','fund')<>'member' then
    tx:=jsonb_build_object('id',p_key,'chargeId',c.id,'collectionId',c.collection_id,'billId',c.bill_id,'paymentId',request->>'id','playerId',c.subject,'title',c.label,'amount',amount,'type','income','category',case when c.kind='third' then 'Sinh tố lúa mạch' else 'Thu quỹ' end,'author',me.name,'actorId',auth.uid(),'occurredAt',clock_timestamp(),'createdAt',clock_timestamp(),'timePrecision','minute');
    funds:=jsonb_set(funds,'{transactions}',jsonb_build_array(tx)||coalesce(funds->'transactions','[]'));
   end if;
   update public.no_pro_charges set paid_amount=paid_amount+amount,status=case when paid_amount+amount=no_pro_charges.amount then 'paid' else 'owed' end,resolved_at=clock_timestamp() where no_pro_charges.id=c.id;
   if c.kind='fine' then
    funds:=jsonb_set(funds,'{debtors}',(select coalesce(jsonb_agg(case when d->>'id'='pro-'||c.id then jsonb_set(d,'{amount}',to_jsonb(c.amount-c.paid_amount-amount)) else d end),'[]') from jsonb_array_elements(coalesce(funds->'debtors','[]')) d where d->>'id'<>'pro-'||c.id or c.amount-c.paid_amount-amount>0));
   end if;
   if request is not null then funds:=jsonb_set(funds,'{pendingApprovals}',(select coalesce(jsonb_agg(x),'[]') from jsonb_array_elements(coalesce(funds->'pendingApprovals','[]')) x where x->>'id'<>request->>'id'));end if;
   perform public.no_fund_notice(p_team,c.subject,'payment:'||p_key,'Đã xác nhận khoản đóng',amount||' đ · '||c.label);
  end if;
 when 'payment_reject' then
  reason:=trim(coalesce(p_payload->>'reason',''));if length(reason)<3 then raise exception 'Nhập lý do từ chối.';end if;
  select x into request from jsonb_array_elements(coalesce(funds->'pendingApprovals','[]')) x where x->>'id'=p_payload->>'requestId' and x ? 'chargeId';
  if request is null then raise exception 'Không tìm thấy yêu cầu chờ đối soát.';end if;
  funds:=jsonb_set(funds,'{pendingApprovals}',(select coalesce(jsonb_agg(x),'[]') from jsonb_array_elements(coalesce(funds->'pendingApprovals','[]')) x where x->>'id'<>request->>'id'));
  funds:=jsonb_set(funds,'{rejectedPayments}',jsonb_build_array(request || jsonb_build_object('status','rejected','reason',reason,'reviewedBy',auth.uid(),'reviewedAt',clock_timestamp()))||coalesce(funds->'rejectedPayments','[]'));
  perform public.no_fund_notice(p_team,request->>'playerId','reject:'||p_key,'Yêu cầu đóng quỹ bị từ chối',reason);
 when 'transaction_save','transaction_void' then
  tx_id:=coalesce(nullif(p_payload->>'id',''),p_key::text);reason:=trim(coalesce(p_payload->>'reason',''));
  if length(tx_id)>100 then raise exception 'Mã giao dịch không hợp lệ.';end if;
  select x into old_tx from jsonb_array_elements(coalesce(funds->'transactions','[]')) x where x->>'id'=tx_id;
  if old_tx ? 'billId' and nullif(old_tx->>'billId','') is not null and old_tx->>'type'='expense' then raise exception 'Khoản chi hóa đơn đã liên kết: ghi giao dịch điều chỉnh riêng, không sửa mất dấu vết.';end if;
  if p_action='transaction_void' and old_tx is null then raise exception 'Không tìm thấy giao dịch.';end if;
  amount:=case when p_action='transaction_void' then 0 else (p_payload->>'amount')::bigint end;
  if amount is null or amount<0 or amount>1000000000 or (p_action='transaction_save' and (amount=0 or p_payload->>'type' not in ('income','expense') or length(trim(coalesce(p_payload->>'title','')))<2)) then raise exception 'Giao dịch không hợp lệ.';end if;
  if old_tx is not null and length(reason)<3 then raise exception 'Nhập lý do sửa/hủy giao dịch.';end if;
  if old_tx ? 'chargeId' then
   if p_action='transaction_save' and p_payload->>'type'<>'income' then raise exception 'Khoản đóng liên kết phải là giao dịch thu.';end if;
   select * into c from public.no_pro_charges where no_pro_charges.id=(old_tx->>'chargeId')::uuid and team_id=p_team for update;
   paid:=c.paid_amount-coalesce((old_tx->>'amount')::bigint,0)+amount;
   if paid<0 or paid>c.amount then raise exception 'Số tiền điều chỉnh vượt nghĩa vụ đóng.';end if;
   update public.no_pro_charges set paid_amount=paid,status=case when exists(select 1 from public.no_fund_collections col where col.id=c.collection_id and col.status='cancelled') then 'void' when paid=no_pro_charges.amount then 'paid' else 'owed' end where no_pro_charges.id=c.id;
   if c.kind='fine' then
    funds:=jsonb_set(funds,'{debtors}',(select coalesce(jsonb_agg(d),'[]') from jsonb_array_elements(coalesce(funds->'debtors','[]')) d where d->>'id'<>'pro-'||c.id));
    if c.amount-paid>0 then
     select x into person from jsonb_array_elements(roster) x where x->>'id'=c.subject;
     funds:=jsonb_set(funds,'{debtors}',coalesce(funds->'debtors','[]')||jsonb_build_array(jsonb_build_object('id','pro-'||c.id,'playerId',c.subject,'name',coalesce(person->>'name','Thành viên'),'amount',c.amount-paid,'month',to_char(c.created_at at time zone 'Asia/Ho_Chi_Minh','YYYY-MM'),'source','pro-fine','label',c.label)));
    end if;
   end if;
  end if;
  if old_tx is null and p_payload->>'occurredAt' is null then raise exception 'Nhập thời gian thực nhận/chi.';end if;
  if nullif(p_payload->>'playerId','') is not null and not exists(select 1 from jsonb_array_elements(roster) m where m->>'id'=p_payload->>'playerId') then raise exception 'Người liên quan không thuộc đội đang chọn.';end if;
  tx:=coalesce(old_tx,'{}') || jsonb_build_object('id',coalesce(old_tx->'id',to_jsonb(tx_id)),'amount',amount,'updatedBy',auth.uid(),'updatedAt',clock_timestamp(),'reason',reason);
  if p_action='transaction_void' then tx:=tx || jsonb_build_object('status','void','originalAmount',coalesce(old_tx->'originalAmount',old_tx->'amount'));
  else tx:=tx || jsonb_build_object('title',trim(p_payload->>'title'),'type',p_payload->>'type','category',coalesce(p_payload->>'category','Khác'),'playerId',coalesce(old_tx->>'playerId',p_payload->>'playerId'),'occurredAt',coalesce((p_payload->>'occurredAt')::timestamptz,(old_tx->>'occurredAt')::timestamptz),'timePrecision',case when coalesce(p_payload->>'occurredAt',old_tx->>'occurredAt') is null then 'date' else 'minute' end,'status','confirmed');end if;
  if old_tx is null then tx:=tx || jsonb_build_object('author',me.name,'actorId',auth.uid(),'createdAt',clock_timestamp());end if;
  funds:=jsonb_set(funds,'{transactions}',jsonb_build_array(tx)||(select coalesce(jsonb_agg(x),'[]') from jsonb_array_elements(coalesce(funds->'transactions','[]')) x where x->>'id'<>tx_id));
 when 'bill' then
  total:=(p_payload->>'total')::bigint;support:=coalesce((p_payload->>'support')::bigint,0);allocations:=p_payload->'allocations';
  if total is null or total not between 1 and 1000000000 or support<0 or support>total or length(trim(coalesce(p_payload->>'title','')))<2 or p_payload->>'payerKind' is null or p_payload->>'payerKind' not in ('fund','member') or jsonb_typeof(allocations)<>'array' or jsonb_array_length(allocations) not between 1 and 100 then raise exception 'Hóa đơn không hợp lệ.';end if;
  if (select count(*)<>count(distinct x->>'id') or coalesce(sum((x->>'amount')::bigint),0)<>total-support or bool_or((x->>'amount')::bigint<0 or not exists(select 1 from jsonb_array_elements(roster) m where m->>'id'=x->>'id')) from jsonb_array_elements(allocations) x) then raise exception 'Tổng phân bổ không khớp hoặc thành viên không hợp lệ.';end if;
  if p_payload->>'payerKind'='member' and not exists(select 1 from jsonb_array_elements(roster) m where m->>'id'=p_payload->>'payerId') then raise exception 'Chọn người ứng tiền đang hoạt động.';end if;
  if p_payload->>'payerKind'='fund' and p_payload->>'confirmed' is distinct from 'true' then raise exception 'Xác nhận quỹ đã thực chi hóa đơn.';end if;
  insert into public.no_pro_bills(id,team_id,title,total,actor,details) values(p_key,p_team,trim(p_payload->>'title'),total,auth.uid(),p_payload || jsonb_build_object('subsidyPaid',false,'payerName',(select m->>'name' from jsonb_array_elements(roster) m where m->>'id'=p_payload->>'payerId'),'participantsSnapshot',(select jsonb_agg(m) from jsonb_array_elements(roster) m where exists(select 1 from jsonb_array_elements(allocations) a where a->>'id'=m->>'id'))));
  for person in select value from jsonb_array_elements(allocations) loop
   amount:=(person->>'amount')::bigint;if amount=0 then continue;end if;
   insert into public.no_pro_charges(team_id,subject,kind,source_key,label,amount,status,paid_amount,actor,bill_id)
    values(p_team,person->>'id','third',p_key||':'||(person->>'id'),trim(p_payload->>'title'),amount,
      case when p_payload->>'payerKind'='member' and person->>'id'=p_payload->>'payerId' then 'paid' else 'owed' end,
      case when p_payload->>'payerKind'='member' and person->>'id'=p_payload->>'payerId' then amount else 0 end,auth.uid(),p_key);
   perform public.no_fund_notice(p_team,person->>'id','bill:'||p_key||':'||(person->>'id'),'Sinh tố lúa mạch',trim(p_payload->>'title')||' · Phần đóng '||amount||' đ.');
  end loop;
  if p_payload->>'payerKind'='fund' then funds:=jsonb_set(funds,'{transactions}',jsonb_build_array(jsonb_build_object('id',p_key,'billId',p_key,'title',trim(p_payload->>'title'),'amount',total,'type','expense','category','Sinh tố lúa mạch','author',me.name,'actorId',auth.uid(),'occurredAt',(p_payload->>'occurredAt')::timestamptz,'createdAt',clock_timestamp(),'timePrecision','minute'))||coalesce(funds->'transactions','[]'));end if;
 when 'bill_support' then
  select * into b from public.no_pro_bills where no_pro_bills.id=(p_payload->>'id')::uuid and team_id=p_team for update;
  amount:=(b.details->>'support')::bigint;
  if b.id is null or b.details->>'payerKind'<>'member' or amount is null or amount<=0 or b.details->>'subsidyPaid'='true' then raise exception 'Khoản hỗ trợ không còn chờ chi.';end if;
  update public.no_pro_bills set details=jsonb_set(details,'{subsidyPaid}','true') where no_pro_bills.id=b.id;
  funds:=jsonb_set(funds,'{transactions}',jsonb_build_array(jsonb_build_object('id',p_key,'billId',b.id,'playerId',b.details->>'payerId','title','Hoàn hỗ trợ: '||b.title,'amount',amount,'type','expense','category','Sinh tố lúa mạch','author',me.name,'actorId',auth.uid(),'occurredAt',clock_timestamp(),'createdAt',clock_timestamp(),'timePrecision','minute'))||coalesce(funds->'transactions','[]'));
 else raise exception 'Thao tác quỹ không hợp lệ.';
 end case;
 -- Notice helpers may already have advanced revision; do not overwrite their notices.
 if funds is distinct from before_data then update public.no_app_workspaces set data=jsonb_set(data,'{funds}',funds),revision=revision+1,updated_at=clock_timestamp() where team_id=p_team;end if;
 insert into public.no_fund_events(team_id,actor,request_key,action,payload,before_value,after_value) values(p_team,auth.uid(),p_key,p_action,p_payload,jsonb_build_object('transaction',old_tx,'charge',to_jsonb(c),'schedule',to_jsonb(s)),jsonb_build_object('transaction',tx));
 return public.no_fund_state(p_team);
end $$;

-- Synchronize the existing legacy approval path with exact partial-payment counters.
create function public.no_fund_paid_counter() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status='paid' and old.status<>'paid' and new.paid_amount=old.paid_amount then new.paid_amount:=new.amount;end if;return new;
end $$;
create trigger no_fund_paid_counter before update on public.no_pro_charges for each row execute function public.no_fund_paid_counter();
revoke all on function public.no_fund_paid_counter() from public,anon,authenticated;

-- Older generic endpoints must not bypass linked settlement invariants.
alter function public.no_app_commit(text,bigint,uuid,jsonb) rename to no_app_commit_before_collections;
revoke all on function public.no_app_commit_before_collections(text,bigint,uuid,jsonb) from public,anon,authenticated;
create function public.no_app_commit(p_team_id text,p_revision bigint,p_key uuid,p_patch jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare old_transactions jsonb; new_transactions jsonb;
begin
 if p_patch ? 'funds' then
  select data->'funds'->'transactions' into old_transactions from public.no_app_workspaces where team_id=p_team_id;
  new_transactions:=p_patch->'funds'->'transactions';
  if exists(select 1 from jsonb_array_elements(coalesce(old_transactions,'[]')) x where (x ? 'chargeId' or x ? 'billId')
   and not exists(select 1 from jsonb_array_elements(coalesce(new_transactions,'[]')) y where y=x))
   or exists(select 1 from jsonb_array_elements(coalesce(new_transactions,'[]')) x where (x ? 'chargeId' or x ? 'billId')
   and not exists(select 1 from jsonb_array_elements(coalesce(old_transactions,'[]')) y where y=x)) then raise exception 'Dùng quy trình đối soát đợt thu/hóa đơn để điều chỉnh giao dịch liên kết.';end if;
 end if;
 return public.no_app_commit_before_collections(p_team_id,p_revision,p_key,p_patch);
end $$;
revoke all on function public.no_app_commit(text,bigint,uuid,jsonb) from public,anon;
grant execute on function public.no_app_commit(text,bigint,uuid,jsonb) to authenticated;

alter function public.no_pro_action(text,text,jsonb,uuid) rename to no_pro_action_before_collections;
revoke all on function public.no_pro_action_before_collections(text,text,jsonb,uuid) from public,anon,authenticated;
create function public.no_pro_action(p_team text,p_action text,p_payload jsonb,p_key uuid) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if p_action in ('charge-paid','charge-void') and exists(select 1 from public.no_pro_charges c left join public.no_pro_bills b on b.id=c.bill_id
   where c.id=(p_payload->>'chargeId')::uuid and c.team_id=p_team and (c.collection_id is not null or coalesce(b.details,'{}')<>'{}' or c.paid_amount>0)) then raise exception 'Đối soát khoản này trong Quỹ đội để giữ đúng số dư.';end if;
 return public.no_pro_action_before_collections(p_team,p_action,p_payload,p_key);
end $$;
revoke all on function public.no_pro_action(text,text,jsonb,uuid) from public,anon;
grant execute on function public.no_pro_action(text,text,jsonb,uuid) to authenticated;

-- Legacy debt approvals use the same narrow fund capability; no team-admin permissions are added.
do $$declare definition text;begin
 definition:=pg_get_functiondef('public.no_app_payment(text,text,text,text,uuid)'::regprocedure);
 definition:=replace(definition,$old$if actor.role not in ('owner','admin') then$old$,$new$if not public.no_fund_manager(p_team_id) then$new$);
 execute definition;
end $$;
revoke all on function public.no_fund_scheduler_ready() from public,anon,authenticated;
revoke all on function public.no_fund_manager(text,uuid),public.no_fund_roster(text),public.no_fund_month_time(date,integer,time),public.no_fund_notice(text,text,text,text,text,text,jsonb),public.no_fund_materialize(uuid),public.no_fund_state(text),public.no_fund_action(text,text,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.no_fund_action(text,text,jsonb,uuid) to authenticated;
notify pgrst,'reload schema';
commit;
