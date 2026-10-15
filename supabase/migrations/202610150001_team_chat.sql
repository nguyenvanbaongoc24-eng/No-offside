-- Persistent messages; authority is canonical membership, never a JSON roster.
begin;
create or replace function public.no_app_is_member(p_team_id text)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.no_gov_members where team_id=p_team_id and user_id=auth.uid() and (status='active' or (status='locked' and locked_until<=clock_timestamp())));
$$;
revoke all on function public.no_app_is_member(text) from public,anon;
grant execute on function public.no_app_is_member(text) to authenticated;
create table if not exists public.no_team_messages (
 id uuid primary key default gen_random_uuid(),team_id text not null references public.no_gov_teams(id),
 sender_id uuid not null references auth.users(id),client_msg_id text not null check(length(client_msg_id) between 1 and 128),
 text text not null check(length(trim(text)) between 1 and 2000),created_at timestamptz not null default clock_timestamp()
);
create unique index if not exists idx_no_team_messages_dedup on public.no_team_messages(team_id,sender_id,client_msg_id);
create index if not exists idx_no_team_messages_team_created on public.no_team_messages(team_id,created_at desc,id desc);
alter table public.no_team_messages enable row level security;
revoke all on public.no_team_messages from public,anon,authenticated;
drop policy if exists "team_members_select_messages" on public.no_team_messages;
create policy "team_members_select_messages" on public.no_team_messages for select to authenticated using(public.no_app_is_member(team_id));
grant select on public.no_team_messages to authenticated;
create or replace function public.no_app_send_message(p_team_id text,p_client_id text,p_text text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result public.no_team_messages;
begin
 if not public.no_app_is_member(p_team_id) then raise exception 'Bạn không có quyền nhắn tin vào đội này.' using errcode='42501'; end if;
 if p_client_id is null or length(p_client_id) not between 1 and 128 or p_text is null or length(trim(p_text)) not between 1 and 2000 then raise exception 'Tin nhắn không hợp lệ.' using errcode='22023'; end if;
 insert into public.no_team_messages(team_id,sender_id,client_msg_id,text) values(p_team_id,auth.uid(),p_client_id,trim(p_text)) on conflict(team_id,sender_id,client_msg_id) do nothing returning * into result;
 if not found then select * into result from public.no_team_messages where team_id=p_team_id and sender_id=auth.uid() and client_msg_id=p_client_id; end if;
 return to_jsonb(result);
end $$;
revoke all on function public.no_app_send_message(text,text,text) from public,anon;
grant execute on function public.no_app_send_message(text,text,text) to authenticated;
do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='no_team_messages') then
  alter publication supabase_realtime add table public.no_team_messages;
 end if;
end $$;
commit;
