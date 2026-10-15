-- Preserve original legacy payload privately; migrate readable messages without inventing authors.
begin;
alter table public.no_team_messages alter column sender_id drop not null;
alter table public.no_team_messages add column if not exists legacy_sender_name text;
alter table public.no_team_messages add column if not exists legacy_unverified boolean not null default false;
create table if not exists public.no_app_chat_archives(team_id text primary key references public.no_gov_teams(id),payload jsonb not null,unreadable_count integer not null default 0,imported_at timestamptz not null default clock_timestamp());
alter table public.no_app_chat_archives enable row level security;
revoke all on public.no_app_chat_archives from public,anon,authenticated;
create or replace function public.no_app_chat_ready(p_team_id text)
returns boolean language plpgsql security definer set search_path='' as $$
begin
 if not public.no_app_is_member(p_team_id) then raise exception 'Không có quyền truy cập chat.' using errcode='42501'; end if;
 return exists(select 1 from public.no_app_chat_archives where team_id=p_team_id);
end $$;
revoke all on function public.no_app_chat_ready(text) from public,anon;
grant execute on function public.no_app_chat_ready(text) to authenticated;
create or replace function public.no_app_import_chat(p_team_id text,p_messages jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare item jsonb; sender uuid; message_id uuid; sent_at timestamptz; position integer:=0; rejected integer:=0;
begin
 perform 1 from public.no_gov_teams where id=p_team_id for update;
 if not found then raise exception 'Không tìm thấy đội.'; end if;
 if exists(select 1 from public.no_app_chat_archives where team_id=p_team_id) then return; end if;
 insert into public.no_app_chat_archives(team_id,payload) values(p_team_id,coalesce(p_messages,'[]'));
 if jsonb_typeof(p_messages)<>'array' then update public.no_app_chat_archives set unreadable_count=1 where team_id=p_team_id; return; end if;
 for item in select value from jsonb_array_elements(p_messages) loop
  position:=position+1;
  begin
   if item->>'text' is null or length(trim(item->>'text')) not between 1 and 2000 or item->>'createdAt' is null then raise exception 'Invalid legacy message'; end if;
   sent_at:=(item->>'createdAt')::timestamptz;
   begin sender:=(item->>'senderId')::uuid;exception when invalid_text_representation then sender:=null;end;
   if not exists(select 1 from auth.users where id=sender) then sender:=null; end if;
   message_id:=md5(p_team_id || ':legacy:' || coalesce(item->>'id',position::text))::uuid;
   insert into public.no_team_messages(id,team_id,sender_id,client_msg_id,text,created_at,legacy_sender_name,legacy_unverified)
   values(message_id,p_team_id,sender,coalesce(nullif(item->>'clientMsgId',''),'legacy-' || message_id),item->>'text',sent_at,left(coalesce(item->>'sender','Thành viên'),100),true) on conflict do nothing;
  exception when others then rejected:=rejected+1;
  end;
 end loop;
 update public.no_app_chat_archives set unreadable_count=rejected where team_id=p_team_id;
end $$;
revoke all on function public.no_app_import_chat(text,jsonb) from public,anon,authenticated;
grant execute on function public.no_app_import_chat(text,jsonb) to service_role;
commit;
