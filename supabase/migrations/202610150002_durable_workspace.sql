-- Additive: preserve legacy Storage objects, use transactional PostgreSQL writes.
begin;
create table if not exists public.no_app_workspaces (
 team_id text primary key references public.no_gov_teams(id),
 settings jsonb not null default '{}'::jsonb,
 data jsonb not null default '{"funds":{"transactions":[],"pendingApprovals":[],"debtors":[]},"matches":[],"attendance":{},"reports":{},"notices":[]}'::jsonb,
 revision bigint not null default 0,
 updated_at timestamptz not null default clock_timestamp()
);
create table if not exists public.no_app_receipts (
 team_id text not null references public.no_gov_teams(id), actor uuid not null,
 request_key uuid not null, revision bigint not null, before_value jsonb not null, after_value jsonb not null,
 created_at timestamptz not null default clock_timestamp(), primary key(team_id,actor,request_key)
);
alter table public.no_app_workspaces enable row level security;
alter table public.no_app_receipts enable row level security;
revoke all on public.no_app_workspaces,public.no_app_receipts from public,anon,authenticated;
create trigger no_app_receipts_immutable before update or delete on public.no_app_receipts for each row execute function public.no_gov_immutable();

create or replace function public.no_app_is_member(p_team_id text)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.no_gov_members where team_id=p_team_id and user_id=auth.uid() and (status='active' or (status='locked' and locked_until<=clock_timestamp())));
$$;
revoke all on function public.no_app_is_member(text) from public,anon;
grant execute on function public.no_app_is_member(text) to authenticated;

-- Seed ONLY from trusted server-side legacy objects after a canonical membership check.
-- No membership or owner is imported from JSON; conflict leaves existing workspace intact.
create or replace function public.no_app_seed(p_team_id text,p_settings jsonb,p_data jsonb)
returns void language plpgsql security definer set search_path='' as $$
begin
 insert into public.no_app_workspaces(team_id,settings,data)
 values(p_team_id,(coalesce(p_settings,'{}') - array['members','ownerId','subAdmins','pendingAdminRequests']) || jsonb_build_object('manualMembers',(select coalesce(jsonb_agg(x),'[]') from jsonb_array_elements(coalesce(p_settings->'members','[]')) x where x->>'isManual'='true')),coalesce(p_data,'{}'))
 on conflict(team_id) do nothing;
end $$;
revoke all on function public.no_app_seed(text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.no_app_seed(text,jsonb,jsonb) to service_role;

create or replace function public.no_app_snapshot(p_team_id text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare w public.no_app_workspaces; t public.no_gov_teams; m public.no_gov_members; roster jsonb;
begin
 select * into m from public.no_gov_members where team_id=p_team_id and user_id=auth.uid() and (status='active' or (status='locked' and locked_until<=clock_timestamp()));
 if not found then raise exception 'Bạn không có quyền truy cập đội này.' using errcode='42501'; end if;
 select * into w from public.no_app_workspaces where team_id=p_team_id;
 select * into t from public.no_gov_teams where id=p_team_id;
 select coalesce(jsonb_agg(jsonb_build_object('id',gm.user_id,'name',gm.name,'number',gm.jersey_number,'role',gm.position,'roleType',gm.role,'membershipStatus',case when gm.status='locked' and gm.locked_until<=clock_timestamp() then 'active' else gm.status end,'avatar',coalesce(p.avatar_url,''),'customTitle',case gm.role when 'owner' then 'Đội trưởng' when 'admin' then 'Ban quản trị' else 'Cầu thủ' end)),'[]') into roster
 from public.no_gov_members gm left join public.profiles p on p.id=gm.user_id where gm.team_id=p_team_id and gm.status<>'removed';
 roster:=roster || (select coalesce(jsonb_agg(x),'[]') from jsonb_array_elements(coalesce(w.settings->'manualMembers','[]')) x where coalesce(x->>'membershipStatus','active')<>'removed');
 return jsonb_build_object('success',true,'role',m.role,'initialized',w.team_id is not null,'revision',coalesce(w.revision,0),'data',coalesce(w.data,'{}'),
 'team',coalesce(w.settings,'{}') || jsonb_build_object('id',t.id,'teamName',t.name,'logo',t.logo,'teamCategory',t.category,'venue',t.venue,'members',roster,'ownerId',(select user_id from public.no_gov_members where team_id=p_team_id and role='owner' and (status='active' or (status='locked' and locked_until<=clock_timestamp()))),'subAdmins',(select coalesce(jsonb_agg(x),'[]') from jsonb_array_elements(roster) x where x->>'roleType'='admin'),'pendingAdminRequests',coalesce(w.settings->'pendingAdminRequests','[]')));
end $$;
revoke all on function public.no_app_snapshot(text) from public,anon;
grant execute on function public.no_app_snapshot(text) to authenticated;

create or replace function public.no_app_create_team(p_team_id text,p_name text,p_settings jsonb default '{}')
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_team_id,0));
 if exists(select 1 from public.no_gov_teams where id=p_team_id) then
  if not exists(select 1 from public.no_gov_members where team_id=p_team_id and user_id=auth.uid() and role='owner' and (status='active' or (status='locked' and locked_until<=clock_timestamp()))) then raise exception 'Mã đội đã được sử dụng.' using errcode='42501'; end if;
  return public.no_app_snapshot(p_team_id);
 end if;
 perform public.no_gov_create_team(p_team_id,p_name,'Asia/Ho_Chi_Minh');
 update public.no_gov_teams set logo=coalesce(p_settings->>'logo',''),category=coalesce(p_settings->>'teamCategory','Sân 7'),venue=coalesce(p_settings->>'venue','') where id=p_team_id;
 insert into public.no_app_workspaces(team_id,settings) values(p_team_id,jsonb_build_object('appearance',jsonb_build_object('timeFormat','24h'),'treasurerQr','{}'::jsonb,'rules','Nội quy khởi tạo đội bóng No Offside'));
 return public.no_app_snapshot(p_team_id);
end $$;
revoke all on function public.no_app_create_team(text,text,jsonb) from public,anon;
grant execute on function public.no_app_create_team(text,text,jsonb) to authenticated;

create or replace function public.no_app_commit(p_team_id text,p_revision bigint,p_key uuid,p_patch jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare w public.no_app_workspaces; m public.no_gov_members; before_data jsonb; next_data jsonb; old_value jsonb; new_value jsonb; entry record; item jsonb; match_value jsonb; existing_receipt public.no_app_receipts;
begin
 perform 1 from public.no_gov_teams where id=p_team_id for update;
 select * into m from public.no_gov_members where team_id=p_team_id and user_id=auth.uid() and (status='active' or (status='locked' and locked_until<=clock_timestamp()));
 if not found then raise exception 'Bạn không có quyền ghi vào đội này.' using errcode='42501'; end if;
 select * into w from public.no_app_workspaces where team_id=p_team_id for update;
 if not found then raise exception 'Đội chưa sẵn sàng lưu dữ liệu.'; end if;
 select * into existing_receipt from public.no_app_receipts where team_id=p_team_id and actor=auth.uid() and request_key=p_key;
 if found then return public.no_app_snapshot(p_team_id); end if;
 if w.revision<>p_revision then raise exception 'Dữ liệu đã thay đổi trên thiết bị khác. Tải lại dữ liệu rồi thử lại.' using errcode='40001'; end if;
 if jsonb_typeof(p_patch)<>'object' or p_key is null then raise exception 'Yêu cầu lưu không hợp lệ.'; end if;
 before_data:=w.data; next_data:=w.data;
 for entry in select * from jsonb_each(p_patch) loop
  if entry.key not in ('funds','matches','attendance','reports','notices','lineups') then raise exception 'Trường dữ liệu không được phép: %',entry.key using errcode='42501'; end if;
  old_value:=coalesce(w.data->entry.key,case when entry.key in ('attendance','reports') then '{}'::jsonb else '[]'::jsonb end); new_value:=entry.value;
  if entry.key='matches' then
   if m.role not in ('owner','admin') then raise exception 'Chỉ ban quản trị được sửa trận.' using errcode='42501'; end if;
   if jsonb_typeof(new_value)<>'array' then raise exception 'Danh sách trận không hợp lệ.'; end if;
   if exists(select 1 from jsonb_array_elements(old_value) old_match where not exists(select 1 from jsonb_array_elements(new_value) x where x->>'id'=old_match->>'id')) then raise exception 'Không được xóa lịch sử trận; hãy lưu trữ trận.'; end if;
   for item in select value from jsonb_array_elements(new_value) loop
    select value into match_value from jsonb_array_elements(old_value) where value->>'id'=item->>'id';
    if item is distinct from match_value then
     if coalesce(item->>'id','')='' or coalesce(item->>'status','') not in ('upcoming','completed') then raise exception 'Trận không hợp lệ.'; end if;
     if match_value is null then
      if item->>'status'<>'upcoming' then raise exception 'Trận mới phải ở trạng thái sắp đá.'; end if;
      item:=item || jsonb_build_object('eligibleMembers',(select coalesce(jsonb_agg(x),'[]') from jsonb_array_elements(public.no_app_snapshot(p_team_id)->'team'->'members') x where x->>'membershipStatus'='active'),'eligibleMemberIds',(select coalesce(jsonb_agg(x->'id'),'[]') from jsonb_array_elements(public.no_app_snapshot(p_team_id)->'team'->'members') x where x->>'membershipStatus'='active'),'createdAt',clock_timestamp());
     else
      item:=item || jsonb_build_object('eligibleMemberIds',match_value->'eligibleMemberIds','eligibleMembers',match_value->'eligibleMembers');
      if match_value->>'status'='completed' and item->>'status'<>'completed' then raise exception 'Trận đã kết thúc không thể mở lại bằng thao tác này.'; end if;
     end if;
     if match_value is null or (item-array['status','archivedAt','archivedBy','archiveReason','eligibleMemberIds']) is distinct from (match_value-array['status','archivedAt','archivedBy','archiveReason','eligibleMemberIds']) then
      perform public.no_gov_mutate(p_team_id,'match',jsonb_build_object('id',item->>'id','title',coalesce(item->>'title','Trận đấu'),'kickoff',item->>'datetime','deadline',item->>'deadline') || coalesce(item->'lateConfig','{}'),md5(p_key::text || (item->>'id') || ':match')::uuid);
     end if;
     if item->>'archivedAt' is not null and match_value->>'archivedAt' is null then
      perform public.no_gov_mutate(p_team_id,'archive_match',jsonb_build_object('matchId',item->>'id'),md5(p_key::text || (item->>'id') || ':archive')::uuid);
     elsif item->>'archivedAt' is null and match_value->>'archivedAt' is not null then
      perform public.no_gov_mutate(p_team_id,'restore_match',jsonb_build_object('matchId',item->>'id'),md5(p_key::text || (item->>'id') || ':restore')::uuid);
     end if;
     select coalesce(jsonb_agg(case when x->>'id'=item->>'id' then item else x end),'[]') into new_value from jsonb_array_elements(new_value) x;
     next_data:=jsonb_set(next_data,'{notices}',jsonb_build_array(jsonb_build_object('id',md5(p_key::text || (item->>'id') || ':notice')::uuid,'title',case when match_value is null then 'Lịch thi đấu mới' when item->>'status'='completed' then 'Trận đấu đã kết thúc' else 'Lịch thi đấu cập nhật' end,'content',coalesce(item->>'title','Trận đấu'),'route','dashboard','matchId',item->>'id','audience','all','createdAt',clock_timestamp())) || coalesce(next_data->'notices','[]'),true);
    end if;
   end loop;
  elsif entry.key='attendance' then
   for item in select jsonb_build_object('id',key,'votes',value) from jsonb_each(new_value) loop
    if coalesce(old_value->(item->>'id'),'{}') is distinct from item->'votes' then
     if (coalesce(old_value->(item->>'id'),'{}')-auth.uid()::text) is distinct from ((item->'votes')-auth.uid()::text) then raise exception 'Chỉ được điểm danh cho chính mình.' using errcode='42501'; end if;
     select value into match_value from jsonb_array_elements(w.data->'matches') where value->>'id'=item->>'id';
     if match_value is null or match_value->>'status'='completed' or match_value->>'archivedAt' is not null or clock_timestamp()>=(match_value->>'deadline')::timestamptz then raise exception 'Đã hết hạn điểm danh.' using errcode='42501'; end if;
     if coalesce(item->'votes'->>auth.uid()::text,'') not in ('attending','maybe','absent') then raise exception 'Trạng thái điểm danh không hợp lệ.'; end if;
     perform public.no_gov_mutate(p_team_id,'attendance',jsonb_build_object('matchId',item->>'id','status',item->'votes'->>auth.uid()::text),md5(p_key::text || (item->>'id') || ':attendance')::uuid);
    end if;
   end loop;
   if not new_value @> (old_value - auth.uid()::text) then
    -- Per-match checks above prevent changing peers; never remove whole match histories.
    if exists(select 1 from jsonb_object_keys(old_value) k where not new_value ? k) then raise exception 'Không được xóa lịch sử điểm danh.'; end if;
   end if;
  elsif entry.key='reports' then
   if (old_value-auth.uid()::text) is distinct from (new_value-auth.uid()::text) then raise exception 'Chỉ được báo cáo cho chính mình.' using errcode='42501'; end if;
   if jsonb_typeof(new_value) is distinct from 'object' or jsonb_typeof(new_value->auth.uid()::text) is distinct from 'object' then raise exception 'Invalid report structure.' using errcode='22023'; end if;
   if exists(select 1 from jsonb_object_keys(coalesce(old_value->auth.uid()::text,'{}')) k where not (new_value->auth.uid()::text) ? k) then raise exception 'Report history cannot be removed.'; end if;
   for item in select jsonb_build_object('id',key,'stats',value) from jsonb_each(coalesce(new_value->auth.uid()::text,'{}')) loop
    if old_value->auth.uid()::text->(item->>'id') is distinct from item->'stats' then
     if not exists(select 1 from jsonb_array_elements(w.data->'matches') x where x->>'id'=item->>'id' and x->>'status'='completed' and x->>'archivedAt' is null) then raise exception 'Chỉ báo cáo trận đã kết thúc.'; end if;
     if jsonb_typeof(item->'stats'->'goals') is distinct from 'number' or jsonb_typeof(item->'stats'->'assists') is distinct from 'number' then raise exception 'Report totals are required.'; end if;
     if (item->'stats'->>'goals')::integer not between 0 and 100 or (item->'stats'->>'assists')::integer not between 0 and 100 then raise exception 'Thành tích không hợp lệ.'; end if;
    end if;
   end loop;
  elsif entry.key='funds' then
   if jsonb_typeof(new_value) is distinct from 'object' or jsonb_typeof(new_value->'transactions') is distinct from 'array' or jsonb_typeof(new_value->'pendingApprovals') is distinct from 'array' or jsonb_typeof(new_value->'debtors') is distinct from 'array' then raise exception 'Invalid ledger structure.' using errcode='22023'; end if;
   if exists(select 1 from jsonb_array_elements(new_value->'transactions') tx where coalesce(tx->>'id','')='' or jsonb_typeof(tx->'amount') is distinct from 'number' or coalesce(tx->>'type','') not in ('income','expense')) or exists(select 1 from jsonb_array_elements(new_value->'transactions') tx group by tx->>'id' having count(*)>1) then raise exception 'Invalid or duplicate transaction.' using errcode='22023'; end if;
   if m.role not in ('owner','admin') then
    raise exception 'Không có quyền sửa sổ quỹ; hãy dùng yêu cầu đối soát.' using errcode='42501';
   else
    if exists(select 1 from jsonb_array_elements(coalesce(old_value->'transactions','[]')) old_tx where not exists(select 1 from jsonb_array_elements(coalesce(new_value->'transactions','[]')) tx where tx->>'id'=old_tx->>'id')) then raise exception 'Không được xóa lịch sử giao dịch.'; end if;
    if exists(select 1 from jsonb_array_elements(coalesce(new_value->'transactions','[]')) tx where (tx->>'amount')::numeric<0 or tx->>'type' not in ('income','expense')) then raise exception 'Giao dịch không hợp lệ.'; end if;
   end if;
   select jsonb_set(new_value,'{transactions}',coalesce(jsonb_agg(case when not exists(select 1 from jsonb_array_elements(coalesce(old_value->'transactions','[]')) old_tx where old_tx->>'id'=x->>'id') then x || jsonb_build_object('createdAt',clock_timestamp()) else x || case when old_value->'transactions' is not null then coalesce((select jsonb_build_object('createdAt',o->'createdAt') from jsonb_array_elements(old_value->'transactions') o where o->>'id'=x->>'id' and o ? 'createdAt'),'{}') else '{}' end end),'[]'),true) into new_value from jsonb_array_elements(coalesce(new_value->'transactions','[]')) x;
   if exists(select 1 from jsonb_array_elements(coalesce(new_value->'pendingApprovals','[]')) x group by x->>'playerId',x->>'month' having count(*)>1) then raise exception 'Yêu cầu đóng quỹ đã tồn tại.' using errcode='23505'; end if;
   if exists(select 1 from jsonb_array_elements(coalesce(new_value->'transactions','[]')) x where x->>'paymentId' is not null group by x->>'paymentId' having count(*)>1) then raise exception 'Khoản đóng quỹ đã được duyệt.' using errcode='23505'; end if;
  elsif entry.key='notices' then
   if m.role not in ('owner','admin') then raise exception 'Chỉ ban quản trị được gửi thông báo đội.' using errcode='42501'; end if;
   if jsonb_typeof(new_value)<>'array' then raise exception 'Thông báo không hợp lệ.'; end if;
   for item in select value from jsonb_array_elements(new_value) loop
    select value into match_value from jsonb_array_elements(coalesce(old_value,'[]')) x where x->>'id'=item->>'id';
    if match_value is not null then
     if item-'unread' is distinct from match_value-'unread' then raise exception 'Không được sửa lịch sử thông báo.'; end if;
    else
     if length(trim(coalesce(item->>'title',''))) not between 1 and 150 or length(trim(coalesce(item->>'content',''))) not between 1 and 2000 then raise exception 'Nội dung thông báo không hợp lệ.'; end if;
     if coalesce(item->>'audience','all') not in ('all','leaders') and not exists(select 1 from public.no_gov_members where team_id=p_team_id and user_id::text=item->>'audience' and (status='active' or (status='locked' and locked_until<=clock_timestamp()))) then raise exception 'Người nhận không thuộc đội.' using errcode='42501'; end if;
     old_value:=jsonb_build_array(item || jsonb_build_object('createdAt',clock_timestamp(),'actor',auth.uid())) || coalesce(old_value,'[]');
    end if;
   end loop;
   new_value:=old_value;
  elsif entry.key='lineups' then
   if m.role not in ('owner','admin') then raise exception 'Chỉ ban quản trị được lưu chiến thuật.' using errcode='42501'; end if;
   if jsonb_typeof(new_value->'formations')<>'array' or jsonb_array_length(new_value->'formations')=0 or not exists(select 1 from jsonb_array_elements(new_value->'formations') f where f->>'id'=new_value->>'activeId') then raise exception 'Sơ đồ được chọn không hợp lệ.'; end if;
   for item in select value from jsonb_array_elements(new_value->'formations') loop
    if jsonb_typeof(item->'players')<>'array' or jsonb_array_length(item->'players')>11 then raise exception 'Danh sách vị trí không hợp lệ.'; end if;
    if exists(select 1 from jsonb_array_elements(item->'players') p where nullif(p->>'memberId','') is not null group by p->>'memberId' having count(*)>1) then raise exception 'Một cầu thủ không thể ở hai vị trí.'; end if;
    if exists(select 1 from jsonb_array_elements(item->'players') p where nullif(p->>'memberId','') is not null and not exists(select 1 from public.no_gov_members gm where gm.team_id=p_team_id and gm.user_id::text=p->>'memberId' and (gm.status='active' or (gm.status='locked' and gm.locked_until<=clock_timestamp()))) and not exists(select 1 from jsonb_array_elements(coalesce(w.settings->'manualMembers','[]')) mm where mm->>'id'=p->>'memberId' and coalesce(mm->>'membershipStatus','active')='active')) then raise exception 'Cầu thủ không thuộc danh sách hoạt động của đội.'; end if;
   end loop;
  elsif m.role not in ('owner','admin') then raise exception 'Chỉ ban quản trị được sửa dữ liệu này.' using errcode='42501';
  end if;
  next_data:=jsonb_set(next_data,array[entry.key],new_value,true);
 end loop;
 update public.no_app_workspaces set data=next_data,revision=revision+1,updated_at=clock_timestamp() where team_id=p_team_id;
 insert into public.no_app_receipts(team_id,actor,request_key,revision,before_value,after_value) values(p_team_id,auth.uid(),p_key,w.revision+1,before_data,next_data);
 return public.no_app_snapshot(p_team_id);
end $$;
revoke all on function public.no_app_commit(text,bigint,uuid,jsonb) from public,anon;
grant execute on function public.no_app_commit(text,bigint,uuid,jsonb) to authenticated;

-- Direct team-ID joining bypasses invite revocation/expiry and must not be exposed.
revoke all on function public.no_gov_join_team(text,text) from public,anon,authenticated;
-- Profiles contain email/phone; roster RPC returns only intended public fields.
drop policy if exists "Profiles are viewable by authenticated users" on public.profiles;
grant select on public.profiles to authenticated;
revoke insert,update,delete on public.profiles from authenticated;
grant update(avatar_url,updated_at) on public.profiles to authenticated;
create policy "Read own private profile" on public.profiles for select to authenticated using(auth.uid()=id);

create or replace function public.no_app_save_profile(p_profile jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.profiles;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if length(trim(coalesce(p_profile->>'name','')))<2 or (p_profile->>'number')::integer not between 1 and 99 then raise exception 'Nhập tên và số áo từ 1 đến 99.'; end if;
 update public.profiles set full_name=trim(p_profile->>'name'),jersey_number=(p_profile->>'number')::integer,position=coalesce(p_profile->>'role',''),phone=coalesce(p_profile->>'phone',''),height=nullif(p_profile->>'height','')::integer,weight=nullif(p_profile->>'weight','')::integer,updated_at=clock_timestamp() where id=auth.uid() returning * into p;
 if not found then raise exception 'Chưa có hồ sơ tài khoản.'; end if;
 if p_profile->>'teamId' is not null then
  update public.no_gov_members set name=p.full_name,jersey_number=p.jersey_number,position=p.position where team_id=p_profile->>'teamId' and user_id=auth.uid() and (status='active' or (status='locked' and locked_until<=clock_timestamp()));
 end if;
 return to_jsonb(p);
end $$;
revoke all on function public.no_app_save_profile(jsonb) from public,anon;
grant execute on function public.no_app_save_profile(jsonb) to authenticated;

create or replace function public.no_app_settings(p_team_id text,p_updates jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare m public.no_gov_members; entry record; w public.no_app_workspaces;
begin
 select * into m from public.no_gov_members where team_id=p_team_id and user_id=auth.uid() and (status='active' or (status='locked' and locked_until<=clock_timestamp()));
 if not found or m.role not in ('owner','admin') then raise exception 'Không có quyền sửa cài đặt đội.' using errcode='42501'; end if;
 select * into w from public.no_app_workspaces where team_id=p_team_id for update;
 for entry in select * from jsonb_each(p_updates) loop
  if entry.key not in ('teamName','venue','teamCategory','logo','treasurerQr','appearance','schedule') or (m.role<>'owner' and entry.key<>'treasurerQr') then raise exception 'Trường cài đặt không được phép.' using errcode='42501'; end if;
 end loop;
 if p_updates ? 'teamName' then
  if length(trim(p_updates->>'teamName'))<2 then raise exception 'Tên đội phải có ít nhất 2 ký tự.'; end if;
  update public.no_gov_teams set name=trim(p_updates->>'teamName') where id=p_team_id;
 end if;
 update public.no_gov_teams set logo=coalesce(p_updates->>'logo',logo),category=coalesce(p_updates->>'teamCategory',category),venue=coalesce(p_updates->>'venue',venue) where id=p_team_id;
 update public.no_app_workspaces set settings=settings || p_updates,revision=revision+1,updated_at=clock_timestamp() where team_id=p_team_id;
 insert into public.no_app_receipts(team_id,actor,request_key,revision,before_value,after_value) values(p_team_id,auth.uid(),gen_random_uuid(),w.revision+1,w.settings,w.settings || p_updates);
 return public.no_app_snapshot(p_team_id);
end $$;
revoke all on function public.no_app_settings(text,jsonb) from public,anon;
grant execute on function public.no_app_settings(text,jsonb) to authenticated;
commit;
