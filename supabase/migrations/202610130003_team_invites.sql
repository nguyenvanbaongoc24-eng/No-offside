-- Additive migration 202610130003: Team invites via Club Code and QR, with secure join workflow.
begin;

-- 1. Extend no_gov_teams with display metadata if not exists
alter table public.no_gov_teams add column if not exists logo text default '';
alter table public.no_gov_teams add column if not exists category text default 'Sân 7';
alter table public.no_gov_teams add column if not exists venue text default '';

-- 2. Extend no_gov_members with jersey number and position
alter table public.no_gov_members add column if not exists jersey_number integer check (jersey_number between 0 and 99);
alter table public.no_gov_members add column if not exists position text default 'Tiền đạo';

-- Uniqueness of jersey number per active team membership
create unique index if not exists no_gov_members_team_jersey_idx
  on public.no_gov_members(team_id, jersey_number)
  where jersey_number is not null and status <> 'removed';

-- 3. Team Invites table
create table if not exists public.no_gov_invites (
  id uuid primary key default gen_random_uuid(),
  team_id text not null references public.no_gov_teams(id) on delete cascade,
  code text not null,
  status text not null default 'active' check (status in ('active', 'revoked', 'expired')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create unique index if not exists no_gov_invites_code_idx on public.no_gov_invites (upper(code));
create index if not exists no_gov_invites_team_status_idx on public.no_gov_invites (team_id, status);

alter table public.no_gov_invites enable row level security;
revoke all on public.no_gov_invites from public, anon, authenticated;

-- Helper to generate a clean 6-character alphanumeric code without ambiguous characters (0, O, 1, I, L)
create or replace function public.no_generate_club_code()
returns text language plpgsql security definer set search_path = '' as $$
declare
  chars text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  res text := '';
  i integer;
  cand text;
  attempts integer := 0;
begin
  loop
    res := '';
    for i in 1..6 loop
      res := res || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    end loop;
    cand := upper(res);
    if not exists (select 1 from public.no_gov_invites where upper(code) = cand) then
      return cand;
    end if;
    attempts := attempts + 1;
    if attempts > 20 then
      return cand || floor(random() * 90 + 10)::text;
    end if;
  end loop;
end;
$$;

-- 4. Create or replace active invite (Owner or Admin only)
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

  select role into v_role
  from public.no_gov_members
  where team_id = trim(p_team_id)
    and user_id = v_actor
    and status = 'active';

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

  select role into v_role
  from public.no_gov_members
  where team_id = trim(p_team_id)
    and user_id = v_actor
    and status = 'active';

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

-- 6. Get invite information (publicly readable with rate-limiting, does not leak sensitive roster data)
create or replace function public.no_gov_get_invite(p_code text, p_client_id text default 'global')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_clean_code text;
  v_key text;
  v_attempt public.no_auth_attempts;
  v_now timestamptz := now();
  v_invite public.no_gov_invites;
  v_team public.no_gov_teams;
  v_captain text;
  v_member_count integer;
  v_taken_numbers integer[];
begin
  if p_code is null or length(trim(p_code)) = 0 then
    raise exception 'Vui lòng nhập mã Club.' using errcode = '42501';
  end if;

  v_clean_code := upper(trim(p_code));
  v_key := coalesce(nullif(trim(p_client_id), ''), 'global') || ':invite:' || v_clean_code;

  select * into v_attempt from public.no_auth_attempts where identifier = v_key for update;
  if v_attempt is not null and v_attempt.locked_until is not null and v_attempt.locked_until > v_now then
    raise exception 'Bạn đã thử mã quá nhiều lần. Vui lòng chờ 15 phút rồi thử lại.' using errcode = '42501';
  end if;

  select * into v_invite
  from public.no_gov_invites
  where upper(code) = v_clean_code and status = 'active';

  if v_invite is null then
    insert into public.no_auth_attempts (identifier, attempts, last_attempt, locked_until)
    values (v_key, 1, v_now, null)
    on conflict (identifier) do update set
      attempts = case when public.no_auth_attempts.last_attempt < v_now - interval '15 minutes' then 1 else public.no_auth_attempts.attempts + 1 end,
      last_attempt = v_now,
      locked_until = case when (case when public.no_auth_attempts.last_attempt < v_now - interval '15 minutes' then 1 else public.no_auth_attempts.attempts + 1 end) >= 10 then v_now + interval '15 minutes' else null end;

    raise exception 'Mã Club không hợp lệ hoặc lời mời đã hết hạn / bị thu hồi.' using errcode = '42501';
  end if;

  select * into v_team from public.no_gov_teams where id = v_invite.team_id;
  if v_team is null then
    raise exception 'Đội bóng không còn hoạt động.' using errcode = '42501';
  end if;

  select name into v_captain
  from public.no_gov_members
  where team_id = v_team.id and role = 'owner' and status = 'active'
  limit 1;

  select count(*) into v_member_count
  from public.no_gov_members
  where team_id = v_team.id and status = 'active';

  select coalesce(array_agg(jersey_number), array[]::integer[]) into v_taken_numbers
  from public.no_gov_members
  where team_id = v_team.id and status = 'active' and jersey_number is not null;

  return jsonb_build_object(
    'valid', true,
    'code', v_invite.code,
    'teamId', v_team.id,
    'teamName', v_team.name,
    'logo', coalesce(nullif(v_team.logo, ''), v_team.policy->>'logo', ''),
    'category', coalesce(nullif(v_team.category, ''), v_team.policy->>'category', 'Sân 7'),
    'venue', coalesce(nullif(v_team.venue, ''), v_team.policy->>'venue', ''),
    'captain', coalesce(v_captain, 'Đội trưởng'),
    'memberCount', v_member_count,
    'takenNumbers', v_taken_numbers,
    'status', v_invite.status
  );
end;
$$;
grant execute on function public.no_gov_get_invite(text, text) to anon, authenticated;

-- 7. Join team via active invite (Authenticated User only)
-- Backend resolves team_id and assigns role 'member' exclusively from the valid invite.
create or replace function public.no_gov_join_via_invite(
  p_code text,
  p_name text,
  p_number integer,
  p_position text default 'Tiền đạo'
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_clean_code text;
  v_invite public.no_gov_invites;
  v_team public.no_gov_teams;
  v_existing public.no_gov_members;
  v_member public.no_gov_members;
  v_name text;
  v_position text;
  v_number_taken boolean;
begin
  if v_actor is null then
    raise exception 'Vui lòng đăng nhập để hoàn tất gia nhập đội.' using errcode = '42501';
  end if;

  if p_code is null or length(trim(p_code)) = 0 then
    raise exception 'Mã Club không được để trống.' using errcode = '42501';
  end if;

  v_clean_code := upper(trim(p_code));

  select * into v_invite
  from public.no_gov_invites
  where upper(code) = v_clean_code and status = 'active';

  if v_invite is null then
    raise exception 'Lời mời không hợp lệ hoặc đã bị thu hồi.' using errcode = '42501';
  end if;

  select * into v_team from public.no_gov_teams where id = v_invite.team_id;
  if v_team is null then
    raise exception 'Đội bóng không còn hoạt động.' using errcode = '42501';
  end if;

  -- Check if already a member of this team (idempotent; do not overwrite existing jersey/role)
  select * into v_existing
  from public.no_gov_members
  where team_id = v_team.id and user_id = v_actor;

  if v_existing.user_id is not null and v_existing.status = 'active' then
    return jsonb_build_object(
      'success', true,
      'alreadyMember', true,
      'team', jsonb_build_object('id', v_team.id, 'name', v_team.name, 'logo', v_team.logo),
      'me', to_jsonb(v_existing)
    );
  end if;

  -- Validate jersey number 0-99
  if p_number is null or p_number < 0 or p_number > 99 then
    raise exception 'Số áo phải là số nguyên từ 0 đến 99.' using errcode = '42501';
  end if;

  -- Check if jersey number is already taken
  select exists(
    select 1 from public.no_gov_members
    where team_id = v_team.id
      and jersey_number = p_number
      and status <> 'removed'
      and user_id <> v_actor
  ) into v_number_taken;

  if v_number_taken then
    raise exception 'Số áo % đã có thành viên sử dụng. Vui lòng chọn số khác.', p_number using errcode = '42501';
  end if;

  v_name := coalesce(nullif(trim(p_name), ''), (select nullif(trim(full_name), '') from public.profiles where id = v_actor), 'Cầu thủ');
  v_position := coalesce(nullif(trim(p_position), ''), 'Tiền đạo');

  if v_existing.user_id is not null then
    update public.no_gov_members
    set name = v_name,
        role = 'member',
        status = 'active',
        jersey_number = p_number,
        position = v_position,
        locked_until = null
    where team_id = v_team.id and user_id = v_actor
    returning * into v_member;
  else
    insert into public.no_gov_members (team_id, user_id, name, role, status, jersey_number, position)
    values (v_team.id, v_actor, v_name, 'member', 'active', p_number, v_position)
    returning * into v_member;
  end if;

  return jsonb_build_object(
    'success', true,
    'alreadyMember', false,
    'team', jsonb_build_object('id', v_team.id, 'name', v_team.name, 'logo', v_team.logo),
    'me', to_jsonb(v_member)
  );
end;
$$;
grant execute on function public.no_gov_join_via_invite(text, text, integer, text) to authenticated;

-- 8. Fetch current user's actual database memberships across all teams
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
        'status', m.status,
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
  where m.user_id = v_actor and m.status <> 'removed';

  return v_res;
end;
$$;
grant execute on function public.no_gov_my_memberships() to authenticated;

commit;
