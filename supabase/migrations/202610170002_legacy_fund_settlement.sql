-- Keep legacy monthly fine approvals and per-charge settlement in the same transaction.
begin;
create function public.no_legacy_fund_settlement() returns trigger language plpgsql security definer set search_path='' as $$
declare tx jsonb; old_tx jsonb; pending jsonb; debt jsonb; allocation jsonb; allocations jsonb; transactions jsonb; debts jsonb; c public.no_pro_charges; delta bigint;
begin
 if new.data->'funds' is not distinct from old.data->'funds' then return new;end if;
 transactions:=coalesce(new.data->'funds'->'transactions','[]');debts:=coalesce(new.data->'funds'->'debtors','[]');
 for old_tx in select x from jsonb_array_elements(coalesce(old.data->'funds'->'transactions','[]')) x where x ? 'chargeAllocations' loop
  select x into tx from jsonb_array_elements(transactions) x where x->>'id'=old_tx->>'id';
  if tx is null or tx->'chargeAllocations' is distinct from old_tx->'chargeAllocations' or tx->>'type'<>'income' then raise exception 'Không được xóa hoặc đổi liên kết khoản thu đã đối soát.';end if;
  if tx->'amount' is distinct from old_tx->'amount' then
   if (tx->>'amount')::bigint<>0 or tx->>'status'<>'void' then raise exception 'Khoản thu tổng hợp đã liên kết: hủy có lý do rồi ghi lại từng khoản đúng số tiền.';end if;
   for allocation in select x from jsonb_array_elements(old_tx->'chargeAllocations') x loop
    select * into c from public.no_pro_charges where team_id=new.team_id and id=(allocation->>'chargeId')::uuid for update;
    delta:=c.paid_amount-(allocation->>'amount')::bigint;
    if c.id is null or delta<0 then raise exception 'Khoản đóng đã thay đổi, cần đối soát trước khi hủy.';end if;
    update public.no_pro_charges set paid_amount=delta,status=case when c.status='void' then 'void' when delta=c.amount then 'paid' else 'owed' end where id=c.id;
    debts:=(select coalesce(jsonb_agg(x),'[]') from jsonb_array_elements(debts) x where x->>'id'<>'pro-'||c.id);
    if c.status<>'void' and c.amount>delta then debts:=debts||jsonb_build_array(jsonb_build_object('id','pro-'||c.id,'playerId',c.subject,'name',(select name from public.no_gov_members where team_id=c.team_id and user_id::text=c.subject),'amount',c.amount-delta,'month',to_char(c.created_at at time zone 'Asia/Ho_Chi_Minh','YYYY-MM'),'source','pro-fine','label',c.label));end if;
   end loop;
  end if;
 end loop;
 for tx in select x from jsonb_array_elements(transactions) x where x->>'type'='income' and not(x ? 'chargeId') and not(x ? 'chargeAllocations') and x->>'paymentId' is not null loop
  if exists(select 1 from jsonb_array_elements(coalesce(old.data->'funds'->'transactions','[]')) x where x->>'id'=tx->>'id') then continue;end if;
  select x into pending from jsonb_array_elements(coalesce(old.data->'funds'->'pendingApprovals','[]')) x where x->>'id'=tx->>'paymentId';
  if pending is null then continue;end if;
  allocations:='[]';
  for debt in select x from jsonb_array_elements(coalesce(pending->'debtSnapshot',old.data->'funds'->'debtors','[]')) x where x->>'playerId'=pending->>'playerId' and x->>'month'=pending->>'month' loop
   select * into c from public.no_pro_charges where team_id=new.team_id and 'pro-'||id=debt->>'id' and kind='fine' for update;
   if c.id is null then continue;end if;
   delta:=(debt->>'amount')::bigint;
   if c.status<>'owed' or delta<>c.amount-c.paid_amount then raise exception 'Khoản phạt đã đổi; từ chối yêu cầu cũ và gửi lại đúng phần còn thiếu.';end if;
   update public.no_pro_charges set paid_amount=c.paid_amount+delta,status='paid',resolved_at=clock_timestamp() where id=c.id;
   allocations:=allocations||jsonb_build_array(jsonb_build_object('chargeId',c.id,'amount',delta));
  end loop;
  if jsonb_array_length(allocations)>0 then
   transactions:=(select jsonb_agg(case when x->>'id'=tx->>'id' then x||jsonb_build_object('chargeAllocations',allocations) else x end) from jsonb_array_elements(transactions) x);
  end if;
 end loop;
 new.data:=jsonb_set(jsonb_set(new.data,'{funds,transactions}',transactions),'{funds,debtors}',debts);
 return new;
end $$;
revoke all on function public.no_legacy_fund_settlement() from public,anon,authenticated;
create trigger no_legacy_fund_settlement before update of data on public.no_app_workspaces for each row execute function public.no_legacy_fund_settlement();
notify pgrst,'reload schema';
commit;
