-- Function previously installed on production, retained only for upgrade regression.
create or replace function public.no_match_action(p_team text,p_match text,p_action text,p_payload jsonb default '{}',p_key uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
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
 if m->>'cancelledAt' is not null or m->>'archivedAt' is not null then raise exception 'Trận đã hủy; chỉ xem lịch sử.';end if;
 insert into public.no_match_records(team_id,match_id) values(p_team,p_match) on conflict do nothing;
 select * into r from public.no_match_records where team_id=p_team and match_id=p_match for update;before_record:=to_jsonb(r);
 case p_action
 when 'finish','result' then
  if p_action='finish' and m->>'status'='completed' then raise exception 'Trận đã kết thúc; không ghi đè kết quả bằng thao tác kết thúc.';end if;
  if p_action='result' and (m->>'status'<>'completed' or length(trim(coalesce(p_payload->>'reason','')))<3) then raise exception 'Chỉ bổ sung/sửa kết quả trận đã kết thúc; cần lý do cập nhật.';end if;
  if (m->>'datetime')::timestamptz>clock_timestamp() then raise exception 'Chưa đến giờ bắt đầu trận.';end if;
  if (p_payload->>'home' is null)<>(p_payload->>'away' is null) or coalesce((p_payload->>'home')::numeric,0) not between 0 and 999 or coalesce((p_payload->>'away')::numeric,0) not between 0 and 999 or coalesce((p_payload->>'home')::numeric,0)<>trunc(coalesce((p_payload->>'home')::numeric,0)) or coalesce((p_payload->>'away')::numeric,0)<>trunc(coalesce((p_payload->>'away')::numeric,0)) or length(coalesce(p_payload->>'note',''))>4000 then raise exception 'Tỷ số phải là số nguyên không âm, nhập cả hai đội hoặc để trống.';end if;
  update public.no_match_records set ended_at=case when p_action='finish' then clock_timestamp() else ended_at end,ended_by=case when p_action='finish' then auth.uid() else ended_by end,score_home=(p_payload->>'home')::integer,score_away=(p_payload->>'away')::integer,post_note=coalesce(p_payload->>'note','') where team_id=p_team and match_id=p_match;
  update public.no_app_workspaces set data=jsonb_set(data,'{matches}',(select jsonb_agg(case when x->>'id'=p_match then x||jsonb_build_object('status','completed','scoreHome',(p_payload->>'home')::integer,'scoreAway',(p_payload->>'away')::integer)||case when p_action='finish' then jsonb_build_object('endedAt',clock_timestamp()) else '{}'::jsonb end else x end) from jsonb_array_elements(data->'matches') x)),revision=revision+1 where team_id=p_team;
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
   perform public.no_fund_notice(p_team,person->>'id','match-'||p_key||':'||(person->>'id'),case when p_action='cancel' then 'Trận đấu đã hủy' when p_action='result' then 'Kết quả trận được cập nhật' else 'Trận đấu đã kết thúc' end,coalesce(m->>'title','Trận đấu'),'dashboard',jsonb_build_object('matchId',p_match));
  end loop;
 end if;
 update public.no_app_workspaces set revision=revision+1 where team_id=p_team;
 return public.no_match_state(p_team,p_match);
end$$;
