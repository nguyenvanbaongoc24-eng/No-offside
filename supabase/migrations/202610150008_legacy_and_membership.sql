begin;
create table if not exists public.no_app_legacy_workspaces(team_id text primary key references public.no_gov_teams(id),original_settings jsonb not null,original_data jsonb not null,imported_at timestamptz not null default clock_timestamp());
alter table public.no_app_legacy_workspaces enable row level security;
revoke all on public.no_app_legacy_workspaces from public,anon,authenticated;
create trigger no_app_legacy_immutable before update or delete on public.no_app_legacy_workspaces for each row execute function public.no_gov_immutable();
create or replace function public.no_app_instant(p_value text,p_timezone text)
returns timestamptz language sql stable set search_path='' as $$
 select case when p_value ~ '([zZ]|[+-][0-9]{2}:[0-9]{2})$' then p_value::timestamptz else p_value::timestamp at time zone p_timezone end;
$$;
revoke all on function public.no_app_instant(text,text) from public,anon,authenticated;
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
  (coalesce(p_settings,'{}')-array['members','ownerId','subAdmins','pendingAdminRequests']) || jsonb_build_object('manualMembers',(select coalesce(jsonb_agg(x),'[]') from jsonb_array_elements(coalesce(p_settings->'members','[]')) x where x->>'isManual'='true')),
  p_data || jsonb_build_object('matches',matches));
end $$;
revoke all on function public.no_app_seed(text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.no_app_seed(text,jsonb,jsonb) to service_role;
create or replace function public.no_gov_my_memberships()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_res jsonb;
begin
  if v_actor is null then
    return '[]'::jsonb;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'teamId', m.team_id,
        'teamName', t.name,
        'role', m.role,
        'status', case when m.status='locked' and m.locked_until<=clock_timestamp() then 'active' else m.status end,
        'jerseyNumber', m.jersey_number,
        'position', m.position,
        'logo', coalesce(nullif(t.logo, ''), t.policy->>'logo', ''),
        'category', coalesce(nullif(t.category, ''), t.policy->>'category', 'Sân 7'),
        'venue', coalesce(nullif(t.venue, ''), t.policy->>'venue', '')
      ) order by m.status asc, t.name asc
    ),
    '[]'::jsonb
  ) into v_res
  from public.no_gov_members m
  join public.no_gov_teams t on t.id = m.team_id
  where m.user_id = v_actor;

  return v_res;
end;
$$;
revoke all on function public.no_gov_my_memberships() from public,anon;
grant execute on function public.no_gov_my_memberships() to authenticated;

create or replace function public.no_gov_create_invite(p_team_id text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_role text;
  v_code text;
  v_invite public.no_gov_invites;
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  perform 1 from public.no_gov_teams where id=trim(p_team_id) for update;
  select role into v_role
  from public.no_gov_members
  where team_id = trim(p_team_id)
    and user_id = v_actor
    and (status='active' or (status='locked' and locked_until<=clock_timestamp()));

  if v_role is null or v_role not in ('owner', 'admin') then
    raise exception 'Chỉ Đội trưởng hoặc Ban quản trị mới có quyền tạo mã mời.' using errcode = '42501';
  end if;

  -- Revoke any existing active invites for this team so previous code/QR becomes invalid
  update public.no_gov_invites
  set status = 'revoked', revoked_at = now()
  where team_id = trim(p_team_id) and status = 'active';

  v_code := public.no_generate_club_code();

  insert into public.no_gov_invites (team_id, code, status, created_by, created_at)
  values (trim(p_team_id), v_code, 'active', v_actor, now())
  returning * into v_invite;

  return jsonb_build_object(
    'success', true,
    'code', v_invite.code,
    'teamId', v_invite.team_id,
    'status', v_invite.status,
    'createdAt', v_invite.created_at
  );
end;
$$;
grant execute on function public.no_gov_create_invite(text) to authenticated;

-- 5. Revoke invite (Owner or Admin only)
create or replace function public.no_gov_revoke_invite(p_team_id text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_role text;
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  perform 1 from public.no_gov_teams where id=trim(p_team_id) for update;
  select role into v_role
  from public.no_gov_members
  where team_id = trim(p_team_id)
    and user_id = v_actor
    and (status='active' or (status='locked' and locked_until<=clock_timestamp()));

  if v_role is null or v_role not in ('owner', 'admin') then
    raise exception 'Chỉ Đội trưởng hoặc Ban quản trị mới có quyền thu hồi mã mời.' using errcode = '42501';
  end if;

  update public.no_gov_invites
  set status = 'revoked', revoked_at = now()
  where team_id = trim(p_team_id) and status = 'active';

  return jsonb_build_object('success', true, 'revoked', true);
end;
$$;
grant execute on function public.no_gov_revoke_invite(text) to authenticated;


revoke all on function public.no_gov_create_invite(text),public.no_gov_revoke_invite(text) from public,anon;

commit;
