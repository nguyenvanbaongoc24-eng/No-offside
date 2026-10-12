-- Schema SQL cho dự án No Offside trên Supabase

-- 1. Bảng Đội bóng (Teams)
create table if not exists public.teams (
  id uuid default gen_random_uuid() primary key,
  name text not null default 'FC No Offside',
  category text default 'Sân 7 Sài Gòn',
  created_at timestamptz default now()
);

-- 2. Bảng Cầu thủ (Players)
create table if not exists public.players (
  id uuid default gen_random_uuid() primary key,
  team_id uuid references public.teams(id) on delete cascade,
  name text not null,
  number int not null,
  role text default 'Tiền Đạo',
  phone text,
  avatar_url text,
  created_at timestamptz default now()
);

-- 3. Bảng Trận đấu (Matches)
create table if not exists public.matches (
  id uuid default gen_random_uuid() primary key,
  team_id uuid references public.teams(id) on delete cascade,
  opponent text not null,
  match_time timestamptz not null,
  venue text not null,
  address text,
  pitch_type text default 'Sân 7',
  created_at timestamptz default now()
);

-- 4. Bảng Điểm danh trận đấu (Match Attendances)
create table if not exists public.match_attendances (
  id uuid default gen_random_uuid() primary key,
  match_id uuid references public.matches(id) on delete cascade,
  player_id uuid references public.players(id) on delete cascade,
  status text check (status in ('attending', 'maybe', 'absent')) default 'attending',
  note text,
  updated_at timestamptz default now(),
  unique (match_id, player_id)
);

-- 5. Bảng Quỹ đội (Team Funds)
create table if not exists public.team_funds (
  id uuid default gen_random_uuid() primary key,
  team_id uuid references public.teams(id) on delete cascade,
  player_id uuid references public.players(id) on delete cascade,
  month text not null, -- '2026-10'
  amount numeric default 150000,
  is_paid boolean default false,
  paid_at timestamptz,
  created_at timestamptz default now(),
  unique (team_id, player_id, month)
);

-- 6. Bảng Thống kê cá nhân (Player Stats)
create table if not exists public.player_stats (
  id uuid default gen_random_uuid() primary key,
  player_id uuid references public.players(id) on delete cascade unique,
  season text default '2026',
  matches int default 0,
  goals int default 0,
  assists int default 0,
  mvp int default 0,
  rating numeric default 9.0,
  updated_at timestamptz default now()
);

-- Bật Row Level Security (RLS)
alter table public.teams enable row level security;
alter table public.players enable row level security;
alter table public.matches enable row level security;
alter table public.match_attendances enable row level security;
alter table public.team_funds enable row level security;
alter table public.player_stats enable row level security;

-- Fail closed until authenticated team membership and server-side role policies
-- have been provisioned. The current client stores team data locally and does
-- not write these tables. Never enable anonymous ALL/SELECT policies here.
-- Run this section on an existing database to remove the old demo policies.
drop policy if exists "Cho phép xem công khai teams" on public.teams;
drop policy if exists "Cho phép xem công khai players" on public.players;
drop policy if exists "Cho phép xem công khai matches" on public.matches;
drop policy if exists "Cho phép xem công khai match_attendances" on public.match_attendances;
drop policy if exists "Cho phép cập nhật điểm danh" on public.match_attendances;
drop policy if exists "Cho phép xem công khai team_funds" on public.team_funds;
drop policy if exists "Cho phép xem công khai player_stats" on public.player_stats;
