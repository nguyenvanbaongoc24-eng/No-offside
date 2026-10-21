begin;
-- Cancellation must still work for the remaining active team when an opponent
-- dissolves. Never allow a dissolved team to receive a fresh proposal/decision.
do $$declare definition text;previous text;begin
 definition:=pg_get_functiondef('public.no_mm_action(text,text,jsonb,uuid)'::regprocedure);previous:=definition;
 definition:=replace(definition,$old$if oid is not null then select * into o from public.no_pro_offers where id=oid;end if;$old$,$new$if cid is null and p_action='cancel' then select proposal_row.* into c from public.no_pro_challenges proposal_row join public.no_mm_links linked on linked.challenge_id=proposal_row.id where linked.offer_id=oid;cid:=c.id;end if;
 if oid is not null then select * into o from public.no_pro_offers where id=oid;end if;
 if p_action='propose' and exists(select 1 from public.no_gov_teams where id=o.team_id and dissolved_at is not null) then raise exception 'Đội đăng tin không còn hoạt động.';end if;$new$);
 if definition=previous then raise exception 'Unexpected cancellation lookup; review migration.';end if;previous:=definition;
 definition:=replace(definition,$old$where id in(o.team_id,c.team_id) and dissolved_at is null order by id for update;$old$,$new$where id in(o.team_id,c.team_id) order by id for update;$new$);
 definition:=replace(definition,$old$if (select count(*) from public.no_gov_teams where id in(o.team_id,c.team_id) and dissolved_at is null)<>2$old$,$new$if p_action not in ('cancel','withdraw','decline') and (select count(*) from public.no_gov_teams where id in(o.team_id,c.team_id) and dissolved_at is null)<>2$new$);
 if definition=previous then raise exception 'Unexpected team activity guard; review migration.';end if;
 execute definition;
 definition:=pg_get_functiondef('public.no_mm_state(text)'::regprocedure);previous:=definition;
 definition:=replace(definition,$old$where t.dissolved_at is null and ((o.status='open'$old$,$new$where ((t.dissolved_at is null and o.status='open'$new$);
 if definition=previous then raise exception 'Unexpected private-history projection; review migration.';end if;
 execute definition;
end$$;
notify pgrst,'reload schema';
commit;
