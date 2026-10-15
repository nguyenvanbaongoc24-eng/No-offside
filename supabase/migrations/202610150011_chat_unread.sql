begin;
alter table public.no_team_messages add column if not exists sequence bigint generated always as identity;
create unique index if not exists no_chat_sequence_idx on public.no_team_messages(sequence);
create index if not exists no_chat_unread_idx on public.no_team_messages(team_id,sequence) where not legacy_unverified;
create table public.no_chat_reads(
 team_id text not null references public.no_gov_teams(id),user_id uuid not null references auth.users(id),
 joined_sequence bigint not null default 0,last_read_sequence bigint not null default 0,
 updated_at timestamptz not null default clock_timestamp(),primary key(team_id,user_id)
);
alter table public.no_chat_reads enable row level security;
revoke all on public.no_chat_reads from public,anon,authenticated;
grant select on public.no_chat_reads to authenticated;
create policy own_chat_read_marker on public.no_chat_reads for select to authenticated using(user_id=auth.uid());
-- Start at the current history boundary, never make a new member read old history.
insert into public.no_chat_reads(team_id,user_id,joined_sequence,last_read_sequence)
select m.team_id,m.user_id,coalesce(max(c.sequence),0),coalesce(max(c.sequence),0) from public.no_gov_members m left join public.no_team_messages c on c.team_id=m.team_id group by m.team_id,m.user_id;
create function public.no_chat_member_baseline() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.no_gov_teams where id=new.team_id for update;
 insert into public.no_chat_reads(team_id,user_id,joined_sequence,last_read_sequence)
 select new.team_id,new.user_id,coalesce(max(sequence),0),coalesce(max(sequence),0) from public.no_team_messages where team_id=new.team_id on conflict do nothing;
 return new;
end $$;
revoke all on function public.no_chat_member_baseline() from public,anon,authenticated;
create trigger no_chat_member_baseline after insert on public.no_gov_members for each row execute function public.no_chat_member_baseline();

create or replace function public.no_app_send_message(p_team_id text,p_client_id text,p_text text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result public.no_team_messages;
begin
 -- Serialize before identity allocation: a later visible sequence must never
 -- overtake a still-uncommitted lower sequence in the same conversation.
 perform 1 from public.no_gov_teams where id=p_team_id for update;
 if not public.no_app_is_member(p_team_id) then raise exception 'Bạn không có quyền nhắn tin vào đội này.' using errcode='42501'; end if;
 if p_client_id is null or length(p_client_id) not between 1 and 128 or p_text is null or length(trim(p_text)) not between 1 and 2000 then raise exception 'Tin nhắn không hợp lệ.' using errcode='22023'; end if;
 insert into public.no_team_messages(team_id,sender_id,client_msg_id,text) values(p_team_id,auth.uid(),p_client_id,trim(p_text)) on conflict(team_id,sender_id,client_msg_id) do nothing returning * into result;
 if not found then select * into result from public.no_team_messages where team_id=p_team_id and sender_id=auth.uid() and client_msg_id=p_client_id; end if;
 return to_jsonb(result);
end $$;

create function public.no_chat_unread()
returns jsonb language plpgsql security definer set search_path='' as $$
declare teams jsonb;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('teamId',m.team_id,'unread',
  (select count(*) from public.no_team_messages c where c.team_id=m.team_id and c.sender_id is distinct from auth.uid() and not c.legacy_unverified and c.sequence>greatest(r.joined_sequence,r.last_read_sequence)))),'[]') into teams
 from public.no_gov_members m join public.no_chat_reads r on r.team_id=m.team_id and r.user_id=m.user_id
 where m.user_id=auth.uid() and (m.status='active' or (m.status='locked' and m.locked_until<=clock_timestamp()));
 return jsonb_build_object('success',true,'teams',teams,'observedAt',clock_timestamp(),'total',(select coalesce(sum((x->>'unread')::bigint),0) from jsonb_array_elements(teams) x));
end $$;
revoke all on function public.no_chat_unread() from public,anon;
grant execute on function public.no_chat_unread() to authenticated;

create function public.no_chat_mark_read(p_team_id text,p_message_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare boundary bigint;
begin
 if not public.no_app_is_member(p_team_id) then raise exception 'Team access denied' using errcode='42501'; end if;
 select sequence into boundary from public.no_team_messages where team_id=p_team_id and id=p_message_id;
 if boundary is null then raise exception 'Viewed message not found' using errcode='22023'; end if;
 update public.no_chat_reads set last_read_sequence=greatest(last_read_sequence,boundary),updated_at=clock_timestamp() where team_id=p_team_id and user_id=auth.uid();
 return public.no_chat_unread();
end $$;
revoke all on function public.no_chat_mark_read(text,uuid) from public,anon;
grant execute on function public.no_chat_mark_read(text,uuid) to authenticated;
do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then alter publication supabase_realtime add table public.no_chat_reads; end if;
end $$;
notify pgrst,'reload schema';
commit;
