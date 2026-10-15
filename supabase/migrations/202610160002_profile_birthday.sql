-- One private calendar-date source; team roster exposes only today's birthday flag.
begin;
alter table public.profiles add column if not exists birthday date;
create or replace function public.no_app_save_profile(p_profile jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.profiles; b date;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if length(trim(coalesce(p_profile->>'name','')))<2 or (p_profile->>'number')::integer not between 1 and 99 then raise exception 'Nhập tên và số áo từ 1 đến 99.'; end if;
 if p_profile ? 'birthday' then
  if nullif(p_profile->>'birthday','') is not null then
   if p_profile->>'birthday' !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Ngày sinh không hợp lệ.'; end if;
   begin b:=(p_profile->>'birthday')::date; exception when others then raise exception 'Ngày sinh không hợp lệ.'; end;
   if b>(clock_timestamp() at time zone 'Asia/Ho_Chi_Minh')::date then raise exception 'Ngày sinh không được ở tương lai.'; end if;
  end if;
 end if;
 update public.profiles set birthday=case when p_profile ? 'birthday' then b else birthday end, full_name=trim(p_profile->>'name'),jersey_number=(p_profile->>'number')::integer,position=coalesce(p_profile->>'role',''),phone=coalesce(p_profile->>'phone',''),height=nullif(p_profile->>'height','')::integer,weight=nullif(p_profile->>'weight','')::integer,updated_at=clock_timestamp() where id=auth.uid() returning * into p;
 if not found then raise exception 'Chưa có hồ sơ tài khoản.'; end if;
 if p_profile->>'teamId' is not null then
  update public.no_gov_members set name=p.full_name,jersey_number=p.jersey_number,position=p.position where team_id=p_profile->>'teamId' and user_id=auth.uid() and (status='active' or (status='locked' and locked_until<=clock_timestamp()));
 end if;
 return to_jsonb(p);
end $$;
revoke all on function public.no_app_save_profile(jsonb) from public,anon;
grant execute on function public.no_app_save_profile(jsonb) to authenticated;

create or replace function public.no_app_snapshot(p_team_id text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare w public.no_app_workspaces; t public.no_gov_teams; m public.no_gov_members; roster jsonb; output_data jsonb;
begin
 select * into m from public.no_gov_members where team_id=p_team_id and user_id=auth.uid();
 if not found then raise exception 'Bạn không có quyền truy cập đội này.' using errcode='42501'; end if;
 if m.status='locked' and m.locked_until<=clock_timestamp() then m.status:='active'; end if;
 select * into w from public.no_app_workspaces where team_id=p_team_id;
 select * into t from public.no_gov_teams where id=p_team_id;
 select coalesce(jsonb_agg(jsonb_build_object('id',gm.user_id,'name',gm.name,'number',gm.jersey_number,'role',gm.position,'roleType',gm.role,'membershipStatus',case when gm.status='locked' and gm.locked_until<=clock_timestamp() then 'active' else gm.status end,'avatar',coalesce(p.avatar_url,''),'birthdayToday',coalesce(to_char(p.birthday,'MM-DD')=to_char(clock_timestamp() at time zone t.timezone,'MM-DD'),false),'customTitle',coalesce(gm.custom_title,case gm.role when 'owner' then 'Đội trưởng' when 'admin' then 'Ban quản trị' else 'Cầu thủ' end))),'[]') into roster
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



notify pgrst,'reload schema';
commit;
