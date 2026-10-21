begin;
-- Keep private match notes when linking an existing match or amending shared
-- terms. The agreed public note is stored separately, never copied cross-team.
do $$declare definition text;previous text;begin
 definition:=pg_get_functiondef('public.no_mm_link_matches(uuid,uuid,jsonb,integer)'::regprocedure);previous:=definition;
 definition:=replace(definition,$old$'note',p_terms->'note','sourceOffer'$old$,$new$'note',coalesce(prior->'note',p_terms->'note'),'sharedMatchNote',p_terms->'note','sourceOffer'$new$);
 if definition=previous then raise exception 'Unexpected linked match definition; review private-note migration.';end if;
 execute definition;
 definition:=pg_get_functiondef('public.no_mm_guard_match()'::regprocedure);previous:=definition;
 definition:=replace(definition,$old$'sharedConditionsVersion','cancelledAt'$old$,$new$'sharedConditionsVersion','sharedMatchNote','cancelledAt'$new$);
 if definition=previous then raise exception 'Unexpected linked-field guard; review private-note migration.';end if;
 execute definition;
end$$;
notify pgrst,'reload schema';
commit;
