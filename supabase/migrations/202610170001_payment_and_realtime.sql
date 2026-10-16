begin;
alter function public.no_fund_state(text) rename to no_fund_state_before_requests;
revoke all on function public.no_fund_state_before_requests(text) from public,anon,authenticated;
create function public.no_fund_state(p_team text) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; f jsonb;begin
 result:=public.no_fund_state_before_requests(p_team);
 select data->'funds' into f from public.no_app_workspaces where team_id=p_team;
 return result || jsonb_build_object(
 'pendingRequests',(select coalesce(jsonb_agg(x),'[]') from jsonb_array_elements(coalesce(f->'pendingApprovals','[]')) x where (result->>'canManage')::boolean or x->>'playerId'=auth.uid()::text),
 'rejectedRequests',(select coalesce(jsonb_agg(x),'[]') from jsonb_array_elements(coalesce(f->'rejectedPayments','[]')) x where (result->>'canManage')::boolean or x->>'playerId'=auth.uid()::text));
end $$;
revoke all on function public.no_fund_state(text) from public,anon,authenticated;
create or replace function public.no_fund_action(p_team text,p_action text,p_payload jsonb default '{}',p_key uuid default null) returns jsonb
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
   funds:=jsonb_set(funds,'{pendingApprovals}',coalesce(funds->'pendingApprovals','[]') || jsonb_build_array(jsonb_build_object('id',p_key,'chargeId',c.id,'playerId',c.subject,'name',me.name,'amount',amount,'title',c.label,'status','pending','note',left(coalesce(p_payload->>'note',''),1000),'createdAt',clock_timestamp())));
   for person in select jsonb_build_object('id',user_id::text) from public.no_gov_members where team_id=p_team and public.no_fund_manager(p_team,user_id) loop
    perform public.no_fund_notice(p_team,person->>'id','payment-request:'||p_key||':'||(person->>'id'),'Chờ xác nhận đóng quỹ',me.name||' · '||c.label||coalesce(' · Kỳ '||(select col.period from public.no_fund_collections col where col.id=c.collection_id),'')||' · '||amount||' đ. Chờ đối soát.');
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

create function public.no_gov_update_signal() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.no_team_updates(team_id,version) values(new.team_id,1) on conflict(team_id) do update set version=no_team_updates.version+1;
 return new;
end $$;
create trigger no_gov_update_signal after insert on public.no_gov_events for each row execute function public.no_gov_update_signal();
create table public.no_user_updates(user_id uuid primary key references auth.users(id) on delete cascade,version bigint not null default 0);
alter table public.no_user_updates enable row level security;
revoke all on public.no_user_updates from public,anon,authenticated;
grant select on public.no_user_updates to authenticated;
create policy no_user_updates_self on public.no_user_updates for select to authenticated using(user_id=auth.uid());
create function public.no_user_update_signal() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.no_user_updates(user_id,version) values(new.user_id,1) on conflict(user_id) do update set version=no_user_updates.version+1;
 if tg_table_name='no_app_notice_reads' then update public.no_app_workspaces set revision=revision+1 where team_id=new.team_id;end if;
 return new;
end $$;
create trigger no_preferences_update_signal after insert or update on public.no_notification_preferences for each row execute function public.no_user_update_signal();
create trigger no_reads_update_signal after insert on public.no_app_notice_reads for each row execute function public.no_user_update_signal();
do $$begin if exists(select 1 from pg_publication where pubname='supabase_realtime') then alter publication supabase_realtime add table public.no_user_updates;end if;end $$;
revoke all on function public.no_gov_update_signal(),public.no_user_update_signal() from public,anon,authenticated;
notify pgrst,'reload schema';
commit;
