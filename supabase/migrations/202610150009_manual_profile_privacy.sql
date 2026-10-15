-- Forward hardening: private manual contact details and legacy role claims.
begin;
create or replace function public.no_app_seed(p_team_id text,p_settings jsonb,p_data jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare zone text; item jsonb; matches jsonb:='[]'; canonical public.no_gov_matches;
begin
 perform 1 from public.no_gov_teams where id=p_team_id for update;
 if exists(select 1 from public.no_app_workspaces where team_id=p_team_id) then return; end if;
 if jsonb_typeof(p_data)<>'object' or jsonb_typeof(p_data->'funds')<>'object' or jsonb_typeof(p_data->'matches')<>'array' then raise exception 'Dữ liệu cũ cần kiểm tra trước khi chuyển đổi.'; end if;
 insert into public.no_app_legacy_workspaces(team_id,original_settings,original_data) values(p_team_id,coalesce(p_settings,'{}'),p_data) on conflict do nothing;
 select timezone into zone from public.no_gov_teams where id=p_team_id;
 for item in select value from jsonb_array_elements(p_data->'matches') loop
  insert into public.no_gov_matches(team_id,id,title,kickoff,attendance_deadline,late_before,approval_required,grace,fine,approved_policy,archived_at)
  values(p_team_id,item->>'id',coalesce(item->>'title','Trận đấu'),public.no_app_instant(item->>'datetime',zone),public.no_app_instant(item->>'deadline',zone),coalesce((item->'lateConfig'->>'lateBefore')::integer,60),coalesce((item->'lateConfig'->>'approvalRequired')::boolean,true),coalesce((item->'lateConfig'->>'grace')::integer,5),coalesce((item->'lateConfig'->>'fine')::bigint,50000),coalesce(item->'lateConfig'->>'approvedPolicy','eta'),(item->>'archivedAt')::timestamptz)
  on conflict(team_id,id) do nothing;
  select * into canonical from public.no_gov_matches where team_id=p_team_id and id=item->>'id';
  matches:=matches || jsonb_build_array(item || jsonb_build_object('datetime',canonical.kickoff,'deadline',canonical.attendance_deadline,'legacyImport',true));
 end loop;
 insert into public.no_app_workspaces(team_id,settings,data) values(p_team_id,
  (coalesce(p_settings,'{}')-array['members','ownerId','subAdmins','pendingAdminRequests']) || jsonb_build_object('manualMembers',(select coalesce(jsonb_agg(x || jsonb_build_object('roleType','member','customTitle','Cau thu','isManual',true,'linkedUserId',null)),'[]') from jsonb_array_elements(coalesce(p_settings->'members','[]')) x where x->>'isManual'='true' and not exists(select 1 from public.no_gov_members gm where gm.team_id=p_team_id and gm.user_id::text=x->>'id'))),
  p_data || jsonb_build_object('matches',matches));
end $$;
revoke all on function public.no_app_seed(text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.no_app_seed(text,jsonb,jsonb) to service_role;

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
 roster:=roster || (select coalesce(jsonb_agg(case when m.role in ('owner','admin') then x else x-array['phone','email'] end),'[]') from jsonb_array_elements(coalesce(w.settings->'manualMembers','[]')) x where m.status='active' and coalesce(x->>'membershipStatus','active') not in ('removed','linked'));
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
 'team',(coalesce(w.settings,'{}')-'manualMembers') || jsonb_build_object('id',t.id,'teamName',t.name,'timezone',t.timezone,'logo',t.logo,'teamCategory',t.category,'venue',t.venue,'members',roster,'ownerId',(select user_id from public.no_gov_members where team_id=p_team_id and role='owner' and (status='active' or (status='locked' and locked_until<=clock_timestamp()))),'subAdmins',(select coalesce(jsonb_agg(x),'[]') from jsonb_array_elements(roster) x where x->>'roleType'='admin'),'pendingAdminRequests',case when m.status='active' and m.role in ('owner','admin') then coalesce(w.settings->'pendingAdminRequests','[]') else '[]'::jsonb end));
end $$;
revoke all on function public.no_app_snapshot(text) from public,anon;
grant execute on function public.no_app_snapshot(text) to authenticated;



create or replace function public.no_app_member_action(p_team_id text,p_action text,p_member text,p_payload jsonb,p_key uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_actor public.no_gov_members; target public.no_gov_members; w public.no_app_workspaces; next_settings jsonb; manual jsonb; requests jsonb; request jsonb; created jsonb; target_id uuid; n integer;
begin
 perform 1 from public.no_gov_teams where id=p_team_id for update;
 select * into v_actor from public.no_gov_members where team_id=p_team_id and user_id=auth.uid() and (status='active' or (status='locked' and locked_until<=clock_timestamp()));
 if not found then raise exception 'Không có quyền quản lý thành viên.' using errcode='42501'; end if;
 select * into w from public.no_app_workspaces where team_id=p_team_id for update;
 if exists(select 1 from public.no_app_receipts where team_id=p_team_id and actor=auth.uid() and request_key=p_key) then return public.no_app_snapshot(p_team_id); end if;
 if v_actor.role not in ('owner','admin') then raise exception 'Không có quyền quản lý thành viên.' using errcode='42501'; end if;
 next_settings:=w.settings; manual:=coalesce(w.settings->'manualMembers','[]'); requests:=coalesce(w.settings->'pendingAdminRequests','[]');
 if p_action='add-member' then
  n:=(p_payload->>'number')::integer;
  if n is null or n not between 1 and 99 or length(trim(coalesce(p_payload->>'name','')))<2 then raise exception 'Nhập tên và số áo từ 1 đến 99.'; end if;
  if exists(select 1 from public.no_gov_members where team_id=p_team_id and status<>'removed' and jersey_number=n) or exists(select 1 from jsonb_array_elements(manual) x where coalesce(x->>'membershipStatus','active') not in ('removed','linked') and (x->>'number')::integer=n) then raise exception 'Số áo đã được sử dụng.' using errcode='23505'; end if;
  created:=jsonb_build_object('id','manual-' || gen_random_uuid(),'name',trim(p_payload->>'name'),'number',n,'role',coalesce(p_payload->>'role','Tiền đạo'),'roleType','member','customTitle','Cầu thủ','isManual',true,'linkedUserId',null,'avatar','','phone',left(trim(coalesce(p_payload->>'phone','')),30),'membershipStatus','active','createdAt',clock_timestamp());
  next_settings:=jsonb_set(next_settings,'{manualMembers}',manual || jsonb_build_array(created),true);
 elsif p_action='link-member' then
  select x into created from jsonb_array_elements(manual) x where x->>'id'=p_member and coalesce(x->>'membershipStatus','active')='active' and x->>'linkedUserId' is null;
  if created is null then raise exception 'Manual profile is not available for linking.' using errcode='22023'; end if;
  target_id:=(p_payload->>'userId')::uuid;
  select * into target from public.no_gov_members where team_id=p_team_id and user_id=target_id and (status='active' or (status='locked' and locked_until<=clock_timestamp()));
  if not found or (v_actor.role<>'owner' and target.role<>'member') then raise exception 'Target account is not an eligible team member.' using errcode='42501'; end if;
  n:=(created->>'number')::integer;
  if exists(select 1 from public.no_gov_members where team_id=p_team_id and user_id<>target_id and status<>'removed' and jersey_number=n) then raise exception 'Jersey number is already assigned.' using errcode='23505'; end if;
  update public.no_gov_members set jersey_number=n,position=coalesce(created->>'role',position) where team_id=p_team_id and user_id=target_id;
  select jsonb_agg(case when x->>'id'=p_member then x || jsonb_build_object('membershipStatus','linked','linkedUserId',target_id,'linkedAt',clock_timestamp(),'linkedBy',auth.uid()) else x end) into manual from jsonb_array_elements(manual) x;
  next_settings:=jsonb_set(next_settings,'{manualMembers}',manual,true);
  created:=null;
 elsif p_action='remove-member' and exists(select 1 from jsonb_array_elements(manual) x where x->>'id'=p_member) then
  select jsonb_agg(case when x->>'id'=p_member then x || jsonb_build_object('membershipStatus','removed','removedAt',clock_timestamp(),'removedBy',auth.uid()) else x end) into manual from jsonb_array_elements(manual) x;
  next_settings:=jsonb_set(next_settings,'{manualMembers}',manual,true);
 else
  if p_action in ('approve-admin','reject-admin') then
   if v_actor.role<>'owner' then raise exception 'Chỉ chủ đội được duyệt quyền.' using errcode='42501'; end if;
   select x into request from jsonb_array_elements(requests) x where x->>'id'=p_member;
   if request is null then return public.no_app_snapshot(p_team_id); end if;
   p_member:=request->>'memberId';
   select coalesce(jsonb_agg(x),'[]') into requests from jsonb_array_elements(requests) x where x->>'id'<>request->>'id';
   next_settings:=jsonb_set(next_settings,'{pendingAdminRequests}',requests,true);
  end if;
  begin target_id:=p_member::uuid;exception when invalid_text_representation then raise exception 'Cần tài khoản đã liên kết để cấp quyền.';end;
  select * into target from public.no_gov_members where team_id=p_team_id and user_id=target_id and (status='active' or (status='locked' and locked_until<=clock_timestamp()));
  if not found then raise exception 'Không tìm thấy thành viên đang hoạt động.'; end if;
  if target.role='owner' then raise exception 'Không được thay đổi chủ đội bằng thao tác này.' using errcode='42501'; end if;
  if p_action='request-admin' then
   if target.role<>'member' then raise exception 'Thành viên đã có quyền quản trị.'; end if;
   if not exists(select 1 from jsonb_array_elements(requests) x where x->>'memberId'=p_member) then
    requests:=requests || jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'memberId',p_member,'name',target.name,'number',target.jersey_number,'requestedTitle',coalesce(p_payload->>'title','Ban quản trị'),'requestedBy',v_actor.name,'createdAt',clock_timestamp()));
   end if;
   next_settings:=jsonb_set(next_settings,'{pendingAdminRequests}',requests,true);
  elsif p_action='remove-member' then
   if v_actor.role='admin' and target.role<>'member' then raise exception 'Không được xóa quản trị viên.' using errcode='42501'; end if;
   update public.no_gov_members set status='removed' where team_id=p_team_id and user_id=target_id;
  elsif p_action in ('promote','approve-admin','demote','title','transfer') then
   if v_actor.role<>'owner' then raise exception 'Chỉ chủ đội được cấp/chuyển quyền.' using errcode='42501'; end if;
   if p_action='transfer' then
    if target.role<>'admin' then raise exception 'Người nhận phải là quản trị viên đang hoạt động.'; end if;
    update public.no_gov_members set role='member',custom_title='Cầu thủ' where team_id=p_team_id and user_id=auth.uid();
    update public.no_gov_members set role='owner',custom_title='Đội trưởng' where team_id=p_team_id and user_id=target_id;
   else
    update public.no_gov_members set role=case when p_action='demote' then 'member' when p_action='title' then role else 'admin' end,custom_title=case when p_action='demote' then 'Cầu thủ' else coalesce(p_payload->>'title',request->>'requestedTitle','Ban quản trị') end where team_id=p_team_id and user_id=target_id;
   end if;
  elsif p_action<>'reject-admin' then raise exception 'Thao tác không hợp lệ.'; end if;
 end if;
 update public.no_app_workspaces set settings=next_settings,revision=revision+1,updated_at=clock_timestamp() where team_id=p_team_id;
 insert into public.no_app_receipts(team_id,actor,request_key,revision,before_value,after_value) values(p_team_id,auth.uid(),p_key,w.revision+1,jsonb_build_object('settings',w.settings,'member',to_jsonb(target)),jsonb_build_object('settings',next_settings,'action',p_action,'memberId',p_member));
 return public.no_app_snapshot(p_team_id) || jsonb_build_object('member',created);
end $$;
revoke all on function public.no_app_member_action(text,text,text,jsonb,uuid) from public,anon;
grant execute on function public.no_app_member_action(text,text,text,jsonb,uuid) to authenticated;

create or replace function public.no_app_chat_archive_info(p_team_id text)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not public.no_app_is_member(p_team_id) then raise exception 'Team access denied' using errcode='42501'; end if;
 return coalesce((select jsonb_build_object('unreadableCount',unreadable_count) from public.no_app_chat_archives where team_id=p_team_id),'{}');
end $$;
revoke all on function public.no_app_chat_archive_info(text) from public,anon;
grant execute on function public.no_app_chat_archive_info(text) to authenticated;
commit;
