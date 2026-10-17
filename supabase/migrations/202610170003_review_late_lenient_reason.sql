begin;
-- Automatically expand short or empty feedback on review_late when approved, preventing 'Decision and reason required' exceptions.
create or replace function public.no_gov_mutate(p_team_id text,p_action text,p_payload jsonb,p_key uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare previous public.no_gov_events;
begin
 if p_action='late_request' then
  perform 1 from public.no_gov_teams where id=p_team_id for update;
  select * into previous from public.no_gov_events where team_id=p_team_id and subject=auth.uid() and match_id=p_payload->>'matchId' and action='late_request' order by seq desc limit 1;
  if previous.id is not null and (previous.data->>'eta')::timestamptz=(p_payload->>'eta')::timestamptz and previous.data->>'reason'=trim(p_payload->>'reason') then return jsonb_build_object('id',previous.id,'action',previous.action,'data',previous.data);end if;
 end if;
 if p_action='review_late' and p_payload->>'status'='approved' and length(trim(coalesce(p_payload->>'reason','')))<3 then
  p_payload := jsonb_set(p_payload, '{reason}', to_jsonb(case when length(trim(coalesce(p_payload->>'reason','')))>0 then 'Đồng ý: ' || trim(p_payload->>'reason') else 'Đồng ý yêu cầu đến muộn' end));
 end if;
 return public.no_gov_mutate_before_named_notices(p_team_id,p_action,p_payload,p_key);
end $$;
revoke all on function public.no_gov_mutate(text,text,jsonb,uuid) from public,anon;
grant execute on function public.no_gov_mutate(text,text,jsonb,uuid) to authenticated;
commit;
