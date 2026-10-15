-- No cached invitation can override server revocation, expiry or team restrictions.
begin;
alter table public.no_gov_invites add column if not exists expires_at timestamptz default (now()+interval '30 days');
create or replace function public.no_generate_club_code()
returns text language sql volatile security definer set search_path='' as $$ select upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)); $$;
revoke all on function public.no_generate_club_code() from public,anon,authenticated;
create or replace function public.no_gov_get_invite(p_code text,p_client_id text default 'global')
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_invite public.no_gov_invites; v_team public.no_gov_teams; attempt public.no_auth_attempts; v_key text; v_now timestamptz:=clock_timestamp();
begin
 -- One anonymous bucket cannot be bypassed by rotating guessed codes/client IDs.
 v_key:='invite-resolve:' || coalesce(auth.uid()::text,'anonymous');
 insert into public.no_auth_attempts(identifier,attempts,last_attempt,locked_until) values(v_key,1,v_now,null)
 on conflict(identifier) do update set attempts=case when public.no_auth_attempts.last_attempt<v_now-interval '1 minute' then 1 else public.no_auth_attempts.attempts+1 end,last_attempt=v_now returning * into attempt;
 if attempt.attempts>100 then return jsonb_build_object('valid',false,'error','Quá nhiều yêu cầu. Vui lòng thử lại sau một phút.'); end if;
 if p_code is null or length(trim(p_code)) not between 6 and 12 then return jsonb_build_object('valid',false,'error','Mã Club không hợp lệ.'); end if;
 select * into v_invite from public.no_gov_invites where upper(code)=upper(trim(p_code)) and status='active' and expires_at>v_now;
 if not found then return jsonb_build_object('valid',false,'error','Mã Club không hợp lệ hoặc lời mời đã hết hạn / bị thu hồi.'); end if;
 select * into v_team from public.no_gov_teams where id=v_invite.team_id;
 return jsonb_build_object('valid',true,'code',v_invite.code,'teamId',v_team.id,'teamName',v_team.name,'logo',v_team.logo,'category',v_team.category,'venue',v_team.venue,'expiresAt',v_invite.expires_at,'status','active',
 'captain',(select name from public.no_gov_members where team_id=v_team.id and role='owner' and (status='active' or (status='locked' and locked_until<=clock_timestamp()))),
 'memberCount',(select count(*) from public.no_gov_members where team_id=v_team.id and (status='active' or (status='locked' and locked_until<=clock_timestamp()))),
 'takenNumbers',(select coalesce(jsonb_agg(jersey_number),'[]') from public.no_gov_members where team_id=v_team.id and status<>'removed' and jersey_number is not null));
end $$;
revoke all on function public.no_gov_get_invite(text,text) from public;
grant execute on function public.no_gov_get_invite(text,text) to anon,authenticated;

create or replace function public.no_gov_join_via_invite(p_code text,p_name text,p_number integer,p_position text default 'Tiền đạo')
returns jsonb language plpgsql security definer set search_path='' as $$
declare i public.no_gov_invites; t public.no_gov_teams; m public.no_gov_members;
begin
 if auth.uid() is null then raise exception 'Vui lòng đăng nhập để gia nhập đội.' using errcode='42501'; end if;
 select * into i from public.no_gov_invites where upper(code)=upper(trim(p_code)) and status='active' and expires_at>clock_timestamp() for update;
 if not found then raise exception 'Lời mời không hợp lệ, đã hết hạn hoặc bị thu hồi.' using errcode='42501'; end if;
 select * into t from public.no_gov_teams where id=i.team_id for update;
 select * into m from public.no_gov_members where team_id=i.team_id and user_id=auth.uid();
 if found then
  if m.status='locked' and m.locked_until<=clock_timestamp() then m.status:='active'; end if;
  if m.status<>'active' then raise exception 'Tư cách thành viên đang bị hạn chế. Liên hệ ban quản trị.' using errcode='42501'; end if;
  return jsonb_build_object('success',true,'alreadyMember',true,'team',to_jsonb(t),'me',to_jsonb(m));
 end if;
 if p_number is null or p_number not between 1 and 99 or length(trim(coalesce(p_name,'')))<2 then raise exception 'Nhập tên và số áo từ 1 đến 99.' using errcode='22023'; end if;
 if exists(select 1 from public.no_app_workspaces w cross join lateral jsonb_array_elements(coalesce(w.settings->'manualMembers','[]')) x where w.team_id=i.team_id and coalesce(x->>'membershipStatus','active')<>'removed' and (x->>'number')::integer=p_number) then raise exception 'Jersey number is reserved by an unlinked member profile.' using errcode='23505'; end if;
 insert into public.no_gov_members(team_id,user_id,name,role,status,jersey_number,position) values(i.team_id,auth.uid(),trim(p_name),'member','active',p_number,coalesce(nullif(trim(p_position),''),'Tiền đạo')) returning * into m;
 return jsonb_build_object('success',true,'alreadyMember',false,'team',to_jsonb(t),'me',to_jsonb(m));
end $$;
revoke all on function public.no_gov_join_via_invite(text,text,integer,text) from public,anon;
grant execute on function public.no_gov_join_via_invite(text,text,integer,text) to authenticated;
commit;
