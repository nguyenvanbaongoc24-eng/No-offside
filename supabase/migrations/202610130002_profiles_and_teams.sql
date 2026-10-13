-- Additive migration 202610130002: User profiles, username auth resolution, team creation & joining.
begin;

-- 1. User Profiles
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  username text unique check (username is null or (length(username) between 3 and 20 and username ~ '^[a-z0-9_-]+$')),
  full_name text not null default '',
  avatar_url text default '',
  email text not null default '',
  phone text default '',
  jersey_number integer check (jersey_number between 1 and 99),
  position text default 'Tiền Đạo',
  height integer check (height > 0 and height < 300),
  weight integer check (weight > 0 and weight < 300),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists profiles_username_lower_idx on public.profiles(lower(username)) where username is not null and username <> '';

alter table public.profiles enable row level security;

drop policy if exists "Profiles are viewable by authenticated users" on public.profiles;
create policy "Profiles are viewable by authenticated users"
  on public.profiles for select to authenticated
  using (true);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert to authenticated
  with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 2. Auth attempts & rate-limiting table
create table if not exists public.no_auth_attempts (
  identifier text primary key,
  attempts integer not null default 0,
  last_attempt timestamptz not null default now(),
  locked_until timestamptz
);

alter table public.no_auth_attempts enable row level security;
revoke all on public.no_auth_attempts from public, anon, authenticated;

-- 3. Availability check RPC for registration
create or replace function public.no_auth_check_availability(p_username text default null, p_email text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_username_taken boolean := false;
  v_email_taken boolean := false;
begin
  if p_username is not null and length(trim(p_username)) > 0 then
    select exists(
      select 1 from public.profiles
      where lower(username) = lower(trim(p_username))
    ) into v_username_taken;
  end if;

  if p_email is not null and length(trim(p_email)) > 0 then
    select exists(
      select 1 from public.profiles
      where lower(email) = lower(trim(p_email))
    ) into v_email_taken;
    if not v_email_taken then
      select exists(
        select 1 from auth.users
        where lower(email) = lower(trim(p_email))
      ) into v_email_taken;
    end if;
  end if;

  return jsonb_build_object(
    'usernameAvailable', not v_username_taken,
    'emailAvailable', not v_email_taken
  );
end;
$$;
grant execute on function public.no_auth_check_availability(text, text) to anon, authenticated;

-- 4. Secure Username Resolution for Login
create or replace function public.no_auth_resolve_username(p_username text, p_client_id text default 'global')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user_email text;
  v_user_id uuid;
  v_attempt public.no_auth_attempts;
  v_key text;
  v_now timestamptz := now();
begin
  if p_username is null or length(trim(p_username)) = 0 then
    raise exception 'Tên đăng nhập hoặc mật khẩu không chính xác.' using errcode = '42501';
  end if;

  v_key := coalesce(nullif(trim(p_client_id), ''), 'global') || ':' || lower(trim(p_username));
  select * into v_attempt from public.no_auth_attempts where identifier = v_key for update;

  if v_attempt is not null and v_attempt.locked_until is not null and v_attempt.locked_until > v_now then
    raise exception 'Bạn đã thử đăng nhập quá nhiều lần. Vui lòng chờ 15 phút rồi thử lại.' using errcode = '42501';
  end if;

  select p.email, p.id into v_user_email, v_user_id
  from public.profiles p
  where lower(p.username) = lower(trim(p_username));

  if v_user_email is null or length(trim(v_user_email)) = 0 then
    insert into public.no_auth_attempts(identifier, attempts, last_attempt, locked_until)
    values (v_key, 1, v_now, null)
    on conflict (identifier) do update set
      attempts = case when public.no_auth_attempts.last_attempt < v_now - interval '15 minutes' then 1 else public.no_auth_attempts.attempts + 1 end,
      last_attempt = v_now,
      locked_until = case when (case when public.no_auth_attempts.last_attempt < v_now - interval '15 minutes' then 1 else public.no_auth_attempts.attempts + 1 end) >= 5 then v_now + interval '15 minutes' else null end;

    raise exception 'Tên đăng nhập hoặc mật khẩu không chính xác.' using errcode = '42501';
  end if;

  return jsonb_build_object('email', v_user_email, 'id', v_user_id);
end;
$$;
grant execute on function public.no_auth_resolve_username(text, text) to anon, authenticated;

-- 5. Record Login Attempt Result (Success or Failure)
create or replace function public.no_auth_record_login_result(p_username text, p_success boolean, p_client_id text default 'global')
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_key text;
  v_now timestamptz := now();
begin
  v_key := coalesce(nullif(trim(p_client_id), ''), 'global') || ':' || lower(trim(p_username));
  if p_success then
    delete from public.no_auth_attempts where identifier = v_key;
  else
    insert into public.no_auth_attempts(identifier, attempts, last_attempt, locked_until)
    values (v_key, 1, v_now, null)
    on conflict (identifier) do update set
      attempts = case when public.no_auth_attempts.last_attempt < v_now - interval '15 minutes' then 1 else public.no_auth_attempts.attempts + 1 end,
      last_attempt = v_now,
      locked_until = case when (case when public.no_auth_attempts.last_attempt < v_now - interval '15 minutes' then 1 else public.no_auth_attempts.attempts + 1 end) >= 5 then v_now + interval '15 minutes' else null end;
  end if;
end;
$$;
grant execute on function public.no_auth_record_login_result(text, boolean, text) to anon, authenticated;

-- 6. Set / Update Username for Authenticated User
create or replace function public.no_set_username(p_username text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_cleaned text;
  v_taken boolean;
begin
  if v_actor is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  v_cleaned := lower(trim(p_username));
  if length(v_cleaned) < 3 or length(v_cleaned) > 20 then
    raise exception 'Tên đăng nhập phải từ 3 đến 20 ký tự.';
  end if;
  if v_cleaned !~ '^[a-z0-9_-]+$' then
    raise exception 'Tên đăng nhập chỉ được chứa chữ cái, chữ số, gạch dưới (_) hoặc gạch ngang (-).';
  end if;

  select exists(
    select 1 from public.profiles
    where lower(username) = v_cleaned and id <> v_actor
  ) into v_taken;

  if v_taken then
    raise exception 'Tên đăng nhập này đã được sử dụng. Vui lòng chọn tên khác.';
  end if;

  update public.profiles
  set username = v_cleaned, updated_at = now()
  where id = v_actor;

  return jsonb_build_object('success', true, 'username', v_cleaned);
end;
$$;
grant execute on function public.no_set_username(text) to authenticated;

-- 7. Trigger on auth.users to auto-create profile
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_username text;
begin
  v_username := lower(trim(coalesce(new.raw_user_meta_data->>'username', '')));
  if v_username = '' then
    v_username := null;
  end if;

  insert into public.profiles (id, username, full_name, avatar_url, email, phone)
  values (
    new.id,
    v_username,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(coalesce(new.email, 'user'), '@', 1)),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', ''),
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'phone', coalesce(new.phone, ''))
  )
  on conflict (id) do update set
    username = coalesce(public.profiles.username, excluded.username),
    full_name = case when public.profiles.full_name = '' then excluded.full_name else public.profiles.full_name end,
    avatar_url = case when public.profiles.avatar_url = '' then excluded.avatar_url else public.profiles.avatar_url end,
    email = case when public.profiles.email = '' then excluded.email else public.profiles.email end,
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 8. Self-serve Team Creation RPC for Authenticated Owners
create or replace function public.no_gov_create_team(p_team_id text, p_name text, p_timezone text default 'Asia/Ho_Chi_Minh')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_team public.no_gov_teams;
  v_member public.no_gov_members;
  v_owner_name text;
begin
  if v_actor is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if length(trim(coalesce(p_name, ''))) < 2 then raise exception 'Team name must be at least 2 characters'; end if;
  if p_team_id is null or length(trim(p_team_id)) < 2 then raise exception 'Team ID required'; end if;

  insert into public.no_gov_teams(id, name, timezone)
  values (trim(p_team_id), trim(p_name), coalesce(nullif(trim(p_timezone), ''), 'Asia/Ho_Chi_Minh'))
  returning * into v_team;

  select coalesce(nullif(trim(full_name), ''), 'Đội Trưởng') into v_owner_name from public.profiles where id = v_actor;
  if v_owner_name is null then v_owner_name := 'Đội Trưởng'; end if;

  insert into public.no_gov_members(team_id, user_id, name, role, status)
  values (
    v_team.id,
    v_actor,
    v_owner_name,
    'owner',
    'active'
  )
  returning * into v_member;

  -- Initial rule version 1
  insert into public.no_gov_rules(team_id, version, content, effective_at, actor)
  values (v_team.id, 1, 'Nội quy khởi tạo đội bóng No Offside', clock_timestamp(), v_actor);

  return jsonb_build_object('team', to_jsonb(v_team), 'me', to_jsonb(v_member));
end;
$$;

grant execute on function public.no_gov_create_team(text, text, text) to authenticated;

-- 9. Team Joining RPC for Authenticated Members
create or replace function public.no_gov_join_team(p_team_id text, p_name text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_team public.no_gov_teams;
  v_member public.no_gov_members;
  v_member_name text;
begin
  if v_actor is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select * into v_team from public.no_gov_teams where id = trim(p_team_id);
  if not found then raise exception 'Team not found'; end if;

  select * into v_member from public.no_gov_members where team_id = v_team.id and user_id = v_actor;
  if found then
    return jsonb_build_object('team', to_jsonb(v_team), 'me', to_jsonb(v_member));
  end if;

  v_member_name := coalesce(nullif(trim(p_name), ''), (select nullif(trim(full_name), '') from public.profiles where id = v_actor), 'Cầu thủ');

  insert into public.no_gov_members(team_id, user_id, name, role, status)
  values (v_team.id, v_actor, v_member_name, 'member', 'active')
  returning * into v_member;

  return jsonb_build_object('team', to_jsonb(v_team), 'me', to_jsonb(v_member));
end;
$$;

grant execute on function public.no_gov_join_team(text, text) to authenticated;

commit;
