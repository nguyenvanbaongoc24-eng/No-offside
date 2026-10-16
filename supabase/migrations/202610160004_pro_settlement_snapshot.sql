-- Preserve debts added after a payment request; never clear an unpaid new fine.
begin;
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
  payment:=jsonb_build_object('id',gen_random_uuid(),'playerId',auth.uid(),'name',actor.name,'month',period,'amount',amount,'status','pending','createdAt',clock_timestamp(),'time',clock_timestamp(),'memo','NO OFFSIDE DONG QUY','debtSnapshot',(select coalesce(jsonb_agg(x),'[]') from jsonb_array_elements(coalesce(funds->'debtors','[]')) x where x->>'playerId'=auth.uid()::text and x->>'month'=period));
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
   select coalesce(sum((x->>'amount')::numeric),0) into amount from jsonb_array_elements(coalesce(funds->'debtors','[]')) x where x->>'playerId'=payment->>'playerId' and x->>'month'=payment->>'month' and (not (payment ? 'debtSnapshot') or payment->'debtSnapshot' @> jsonb_build_array(x));
   if amount is distinct from (payment->>'amount')::numeric then raise exception 'Khoản nợ đã thay đổi. Từ chối yêu cầu cũ và đối soát lại số tiền thực tế.';end if;
   tx:=jsonb_build_object('id',gen_random_uuid(),'paymentId',p_payment_id,'playerId',payment->>'playerId','month',payment->>'month','title','Thu quỹ: ' || (payment->>'name'),'amount',(payment->>'amount')::numeric,'type','income','author',actor.name,'actorId',auth.uid(),'occurredAt',clock_timestamp(),'createdAt',clock_timestamp(),'timePrecision','minute','reconciliation',coalesce(nullif(trim(p_reason),''),'Đối soát thủ công'));
   funds:=jsonb_set(funds,'{transactions}',jsonb_build_array(tx) || coalesce(funds->'transactions','[]'),true);
   funds:=jsonb_set(funds,'{debtors}',(select coalesce(jsonb_agg(x),'[]') from jsonb_array_elements(coalesce(funds->'debtors','[]')) x where x->>'playerId'<>payment->>'playerId' or x->>'month'<>payment->>'month' or (payment ? 'debtSnapshot' and not (payment->'debtSnapshot' @> jsonb_build_array(x)))),true);
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
notify pgrst,'reload schema';
commit;
