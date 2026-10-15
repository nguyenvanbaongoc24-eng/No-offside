-- Existing Auth accounts may predate handle_new_user. Restore only the caller's
-- missing profile; never overwrite edits or import membership/role claims.
begin;
create or replace function public.no_app_ensure_profile()
returns jsonb language plpgsql security definer set search_path='' as $$
declare u auth.users; p public.profiles; candidate text;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 select * into p from public.profiles where id=auth.uid();
 if found then return to_jsonb(p); end if;
 select * into u from auth.users where id=auth.uid();
 if not found then raise exception 'Authenticated account not found' using errcode='42501'; end if;
 candidate:=lower(trim(coalesce(u.raw_user_meta_data->>'username','')));
 if candidate !~ '^[a-z0-9_-]{3,20}$' or exists(select 1 from public.profiles where lower(username)=candidate) then candidate:=null; end if;
 insert into public.profiles(id,username,full_name,email,avatar_url,phone)
 values(u.id,candidate,coalesce(nullif(trim(u.raw_user_meta_data->>'full_name'),''),nullif(trim(u.raw_user_meta_data->>'name'),''),''),coalesce(u.email,''),coalesce(u.raw_user_meta_data->>'avatar_url',''),coalesce(u.phone,''))
 on conflict do nothing;
 -- A concurrent account may reserve the candidate username. Preserve that
 -- reservation and still restore the authenticated caller's own profile.
 insert into public.profiles(id,full_name,email,avatar_url,phone)
 values(u.id,coalesce(nullif(trim(u.raw_user_meta_data->>'full_name'),''),nullif(trim(u.raw_user_meta_data->>'name'),''),''),coalesce(u.email,''),coalesce(u.raw_user_meta_data->>'avatar_url',''),coalesce(u.phone,''))
 on conflict(id) do nothing;
 select * into p from public.profiles where id=u.id;
 return to_jsonb(p);
end $$;
revoke all on function public.no_app_ensure_profile() from public,anon;
grant execute on function public.no_app_ensure_profile() to authenticated;
notify pgrst,'reload schema';
commit;
