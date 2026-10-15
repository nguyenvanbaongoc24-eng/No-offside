begin;
create table if not exists public.no_app_notice_reads(team_id text not null references public.no_gov_teams(id),user_id uuid not null references auth.users(id),notice_id text not null,read_at timestamptz not null default clock_timestamp(),primary key(team_id,user_id,notice_id));
alter table public.no_app_notice_reads enable row level security;
revoke all on public.no_app_notice_reads from public,anon,authenticated;
create or replace function public.no_app_snapshot(p_team_id text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare w public.no_app_workspaces; t public.no_gov_teams; m public.no_gov_members; roster jsonb; output_data jsonb;
begin
 select * into m from public.no_gov_members where team_id=p_team_id and user_id=auth.uid();
 if not found then raise exception 'Bạn không có quyền truy cập đội này.' using errcode='42501'; end if;
 if m.status='locked' and m.locked_until<=clock_timestamp() then m.status:='active'; end if;
 select * into w from public.no_app_workspaces where team_id=p_team_id;
 select * into t from public.no_gov_teams where id=p_team_id;
 select coalesce(jsonb_agg(jsonb_build_object('id',gm.user_id,'name',gm.name,'number',gm.jersey_number,'role',gm.position,'roleType',gm.role,'membershipStatus',case when gm.status='locked' and gm.locked_until<=clock_timestamp() then 'active' else gm.status end,'avatar',coalesce(p.avatar_url,''),'customTitle',coalesce(gm.custom_title,case gm.role when 'owner' then 'Đội trưởng' when 'admin' then 'Ban quản trị' else 'Cầu thủ' end))),'[]') into roster
 from public.no_gov_members gm left join public.profiles p on p.id=gm.user_id where gm.team_id=p_team_id and ((m.status='active' and gm.status<>'removed') or gm.user_id=auth.uid());
 roster:=roster || (select coalesce(jsonb_agg(x),'[]') from jsonb_array_elements(coalesce(w.settings->'manualMembers','[]')) x where m.status='active' and coalesce(x->>'membershipStatus','active') not in ('removed','linked'));
 output_data:=coalesce(w.data,'{}');
 output_data:=output_data || jsonb_build_object('notices',(select coalesce(jsonb_agg(x || jsonb_build_object('unread',not exists(select 1 from public.no_app_notice_reads r where r.team_id=p_team_id and r.user_id=auth.uid() and r.notice_id=x->>'id'))),'[]') from jsonb_array_elements(coalesce(w.data->'notices','[]')) x where ((coalesce(x->>'audience','all')='all' and m.status='active') or x->>'audience'=auth.uid()::text or (x->>'audience'='leaders' and m.status='active' and m.role in ('owner','admin')))));
 if m.status<>'active' or m.role not in ('owner','admin') then
  output_data:=output_data || jsonb_build_object('funds',jsonb_build_object(
   'transactions',(select coalesce(jsonb_agg(x),'[]') from jsonb_array_elements(coalesce(w.data->'funds'->'transactions','[]')) x where x->>'playerId'=auth.uid()::text),
   'pendingApprovals',(select coalesce(jsonb_agg(x),'[]') from jsonb_array_elements(coalesce(w.data->'funds'->'pendingApprovals','[]')) x where x->>'playerId'=auth.uid()::text),
   'debtors',(select coalesce(jsonb_agg(x-'phone'),'[]') from jsonb_array_elements(coalesce(w.data->'funds'->'debtors','[]')) x where x->>'playerId'=auth.uid()::text),
   'rejectedPayments',(select coalesce(jsonb_agg(x),'[]') from jsonb_array_elements(coalesce(w.data->'funds'->'rejectedPayments','[]')) x where x->>'playerId'=auth.uid()::text)));
 end if;
 if m.status<>'active' then
  output_data:=output_data || jsonb_build_object('reports',jsonb_build_object(auth.uid()::text,coalesce(w.data->'reports'->auth.uid()::text,'{}')),
   'matches',(select coalesce(jsonb_agg(x),'[]') from jsonb_array_elements(coalesce(w.data->'matches','[]')) x where (w.data->'attendance'->(x->>'id')) ? auth.uid()::text or (w.data->'reports'->auth.uid()::text) ? (x->>'id')),
   'attendance',(select coalesce(jsonb_object_agg(key,jsonb_build_object(auth.uid()::text,value->auth.uid()::text)),'{}') from jsonb_each(coalesce(w.data->'attendance','{}')) where value ? auth.uid()::text),'lineups','{}'::jsonb);
 end if;
 return jsonb_build_object('success',true,'role',m.role,'restricted',m.status<>'active','membershipStatus',m.status,'restrictionUntil',m.locked_until,'initialized',w.team_id is not null,'revision',coalesce(w.revision,0),'data',output_data,
 'team',coalesce(w.settings,'{}') || jsonb_build_object('id',t.id,'teamName',t.name,'timezone',t.timezone,'logo',t.logo,'teamCategory',t.category,'venue',t.venue,'members',roster,'ownerId',(select user_id from public.no_gov_members where team_id=p_team_id and role='owner' and (status='active' or (status='locked' and locked_until<=clock_timestamp()))),'subAdmins',(select coalesce(jsonb_agg(x),'[]') from jsonb_array_elements(roster) x where x->>'roleType'='admin'),'pendingAdminRequests',coalesce(w.settings->'pendingAdminRequests','[]')));
end $$;
revoke all on function public.no_app_snapshot(text) from public,anon;
grant execute on function public.no_app_snapshot(text) to authenticated;


create or replace function public.no_app_read_notices(p_team_id text,p_ids text[])
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.no_gov_members where team_id=p_team_id and user_id=auth.uid()) then raise exception 'Không có quyền đọc thông báo đội.' using errcode='42501'; end if;
 insert into public.no_app_notice_reads(team_id,user_id,notice_id) select p_team_id,auth.uid(),unnest(p_ids) on conflict do nothing;
 return public.no_app_snapshot(p_team_id);
end $$;
revoke all on function public.no_app_read_notices(text,text[]) from public,anon;
grant execute on function public.no_app_read_notices(text,text[]) to authenticated;

create or replace function public.no_app_payment(p_team_id text,p_action text,p_payment_id text,p_reason text,p_key uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare w public.no_app_workspaces; actor public.no_gov_members; funds jsonb; pending jsonb; payment jsonb; next_data jsonb; tx jsonb; period text; amount numeric; notice jsonb;
begin
 perform 1 from public.no_gov_teams where id=p_team_id for update;
 select * into actor from public.no_gov_members where team_id=p_team_id and user_id=auth.uid() and (status='active' or (status='locked' and locked_until<=clock_timestamp()));
 if not found then raise exception 'Không có quyền thao tác quỹ đội.' using errcode='42501'; end if;
 select * into w from public.no_app_workspaces where team_id=p_team_id for update;
 if not found then raise exception 'Sổ quỹ chưa sẵn sàng.'; end if;
 if exists(select 1 from public.no_app_receipts r where r.team_id=p_team_id and r.actor=auth.uid() and r.request_key=p_key) then return public.no_app_snapshot(p_team_id); end if;
 funds:=w.data->'funds';pending:=coalesce(funds->'pendingApprovals','[]');
 if p_action='request' then
  select to_char(clock_timestamp() at time zone timezone,'YYYY-MM') into period from public.no_gov_teams where id=p_team_id;
  if exists(select 1 from jsonb_array_elements(pending) x where x->>'playerId'=auth.uid()::text and x->>'month'=period) then return public.no_app_snapshot(p_team_id); end if;
  select coalesce(sum((x->>'amount')::numeric),0) into amount from jsonb_array_elements(coalesce(funds->'debtors','[]')) x where x->>'playerId'=auth.uid()::text and x->>'month'=period;
  if amount<=0 then raise exception 'Bạn chưa có khoản quỹ cần nộp trong kỳ.'; end if;
  payment:=jsonb_build_object('id',gen_random_uuid(),'playerId',auth.uid(),'name',actor.name,'month',period,'amount',amount,'status','pending','createdAt',clock_timestamp(),'time',clock_timestamp(),'memo','NO OFFSIDE DONG QUY');
  funds:=jsonb_set(funds,'{pendingApprovals}',pending || jsonb_build_array(payment),true);
  notice:=jsonb_build_object('id',gen_random_uuid(),'title','Đóng quỹ chờ duyệt','content',actor.name || ' đã gửi yêu cầu đối soát khoản đóng quỹ.','audience','leaders','route','fund','createdAt',clock_timestamp());
 elsif p_action in ('approve','reject') then
  if actor.role not in ('owner','admin') then raise exception 'Chỉ ban quản trị được đối soát quỹ.' using errcode='42501'; end if;
  select x into payment from jsonb_array_elements(pending) x where x->>'id'=p_payment_id;
  if payment is null then
   if p_action='approve' and exists(select 1 from jsonb_array_elements(coalesce(funds->'transactions','[]')) x where x->>'paymentId'=p_payment_id) then return public.no_app_snapshot(p_team_id); end if;
   raise exception 'Yêu cầu không còn chờ duyệt. Tải lại để kiểm tra.';
  end if;
  if p_action='reject' and length(trim(coalesce(p_reason,'')))<3 then raise exception 'Nhập lý do từ chối tối thiểu 3 ký tự.'; end if;
  select coalesce(jsonb_agg(x),'[]') into pending from jsonb_array_elements(pending) x where x->>'id'<>p_payment_id;
  funds:=jsonb_set(funds,'{pendingApprovals}',pending,true);
  if p_action='approve' then
   tx:=jsonb_build_object('id',gen_random_uuid(),'paymentId',p_payment_id,'playerId',payment->>'playerId','month',payment->>'month','title','Thu quỹ: ' || (payment->>'name'),'amount',(payment->>'amount')::numeric,'type','income','author',actor.name,'actorId',auth.uid(),'occurredAt',clock_timestamp(),'createdAt',clock_timestamp(),'timePrecision','minute','reconciliation',coalesce(nullif(trim(p_reason),''),'Đối soát thủ công'));
   funds:=jsonb_set(funds,'{transactions}',jsonb_build_array(tx) || coalesce(funds->'transactions','[]'),true);
   funds:=jsonb_set(funds,'{debtors}',(select coalesce(jsonb_agg(x),'[]') from jsonb_array_elements(coalesce(funds->'debtors','[]')) x where x->>'playerId'<>payment->>'playerId' or x->>'month'<>payment->>'month'),true);
  else
   funds:=jsonb_set(funds,'{rejectedPayments}',coalesce(funds->'rejectedPayments','[]') || jsonb_build_array(payment || jsonb_build_object('status','rejected','reason',trim(p_reason),'reviewedBy',auth.uid(),'reviewedAt',clock_timestamp())),true);
  end if;
  notice:=jsonb_build_object('id',gen_random_uuid(),'title',case when p_action='approve' then 'Khoản đóng quỹ đã được xác nhận' else 'Yêu cầu đóng quỹ bị từ chối' end,'content',case when p_action='approve' then 'Ban quản trị đã đối soát thủ công và xác nhận khoản nộp.' else trim(p_reason) end,'audience',payment->>'playerId','route','fund','createdAt',clock_timestamp());
 else raise exception 'Thao tác quỹ không hợp lệ.'; end if;
 next_data:=w.data || jsonb_build_object('funds',funds,'notices',jsonb_build_array(notice) || coalesce(w.data->'notices','[]'));
 update public.no_app_workspaces set data=next_data,revision=revision+1,updated_at=clock_timestamp() where team_id=p_team_id;
 insert into public.no_app_receipts(team_id,actor,request_key,revision,before_value,after_value) values(p_team_id,auth.uid(),p_key,w.revision+1,w.data,next_data);
 return public.no_app_snapshot(p_team_id);
end $$;
revoke all on function public.no_app_payment(text,text,text,text,uuid) from public,anon;
grant execute on function public.no_app_payment(text,text,text,text,uuid) to authenticated;
commit;
