-- Migration: 202610150001_team_chat.sql
-- Persistent Team Chat Messages with Idempotency and RLS

create table if not exists public.no_team_messages (
  id uuid primary key default gen_random_uuid(),
  team_id text not null,
  sender_id uuid not null references auth.users(id),
  client_msg_id text not null,
  text text not null check(length(trim(text)) > 0 and length(text) <= 2000),
  created_at timestamptz not null default clock_timestamp()
);

-- Idempotency constraint: cannot insert duplicate message for same client_msg_id from same sender in same team
create unique index if not exists idx_no_team_messages_dedup
  on public.no_team_messages (team_id, sender_id, client_msg_id);

-- Performance index for chronological message retrieval
create index if not exists idx_no_team_messages_team_created
  on public.no_team_messages (team_id, created_at asc);

-- Enable Row Level Security
alter table public.no_team_messages enable row level security;

-- RLS: Only authenticated active members of the team or team owner can read messages
drop policy if exists "team_members_select_messages" on public.no_team_messages;
create policy "team_members_select_messages" on public.no_team_messages
  for select to authenticated
  using (
    exists (
      select 1 from public.no_gov_members m
      where m.team_id = no_team_messages.team_id
        and m.user_id = auth.uid()
        and m.status = 'active'
    ) or exists (
      select 1 from public.no_gov_teams t
      where t.id = no_team_messages.team_id
        and t.owner_id = auth.uid()
    )
  );

-- RLS: Only authenticated active members can insert their own messages (sender_id must match auth.uid())
drop policy if exists "team_members_insert_messages" on public.no_team_messages;
create policy "team_members_insert_messages" on public.no_team_messages
  for insert to authenticated
  with check (
    auth.uid() = sender_id
    and (
      exists (
        select 1 from public.no_gov_members m
        where m.team_id = no_team_messages.team_id
          and m.user_id = auth.uid()
          and m.status = 'active'
      ) or exists (
        select 1 from public.no_gov_teams t
        where t.id = no_team_messages.team_id
          and t.owner_id = auth.uid()
      )
    )
  );

grant select, insert on public.no_team_messages to authenticated;
