-- Revoke account/team access for removed, pending or actively locked memberships.
begin;
create or replace function public.no_fund_state(p_team text) returns jsonb language plpgsql security definer set search_path='' as $$
declare m public.no_gov_members; manager boolean;
begin
 select * into m from public.no_gov_members where team_id=p_team and user_id=auth.uid();
 if not found or not (m.status='active' or (m.status='locked' and m.locked_until<=clock_timestamp())) then raise exception 'Không có quyền truy cập quỹ đội.' using errcode='42501';end if;
 manager:=public.no_fund_manager(p_team);
 return jsonb_build_object('success',true,'teamId',p_team,'canManage',manager,'treasurer',manager and m.can_manage_funds,'owner',m.role='owner',
 'schedulerConfigured',public.no_fund_scheduler_ready(),'schedules',(select coalesce(jsonb_agg(s order by s.created_at desc),'[]') from public.no_fund_schedules s where s.team_id=p_team and manager),
 'collections',(select coalesce(jsonb_agg(c order by c.created_at desc),'[]') from public.no_fund_collections c where c.team_id=p_team and (manager or exists(select 1 from public.no_pro_charges ch where ch.collection_id=c.id and ch.subject=auth.uid()::text))),
 'charges',(select coalesce(jsonb_agg(c order by c.created_at desc),'[]') from public.no_pro_charges c where c.team_id=p_team and (manager or c.subject=auth.uid()::text)),
 'bills',(select coalesce(jsonb_agg(b order by b.created_at desc),'[]') from public.no_pro_bills b where b.team_id=p_team and (manager or exists(select 1 from public.no_pro_charges c where c.bill_id=b.id and c.subject=auth.uid()::text))),
 'members',case when manager then public.no_fund_roster(p_team) else '[]'::jsonb end,
 'history',(select coalesce(jsonb_agg(e order by e.created_at desc),'[]') from (select id,request_key,actor,action,payload,before_value,after_value,created_at from public.no_fund_events where team_id=p_team and manager order by created_at desc limit 100) e));
end $$;

revoke all on function public.no_fund_state(text) from public,anon,authenticated;
notify pgrst,'reload schema';
commit;
