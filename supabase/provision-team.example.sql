-- EXAMPLE ONLY: use an isolated staging project. Verify UUIDs in Auth first.
-- Replace every placeholder. Never assign roles from a client's localStorage.
begin;
insert into public.no_gov_teams(id,name,timezone) values ('REPLACE_VERIFIED_APP_TEAM_ID','Staging team','Asia/Ho_Chi_Minh');
insert into public.no_gov_members(team_id,user_id,name,role) values
 ('REPLACE_VERIFIED_APP_TEAM_ID','REPLACE_VERIFIED_OWNER_AUTH_UUID'::uuid,'Owner','owner'),
 ('REPLACE_VERIFIED_APP_TEAM_ID','REPLACE_VERIFIED_ADMIN_AUTH_UUID'::uuid,'Admin','admin'),
 ('REPLACE_VERIFIED_APP_TEAM_ID','REPLACE_VERIFIED_MEMBER_AUTH_UUID'::uuid,'Member','member');
-- Initial rule must reflect the real effective date; do not fabricate old rules to justify penalties.
insert into public.no_gov_rules(team_id,version,content,effective_at,actor) values
 ('REPLACE_VERIFIED_APP_TEAM_ID',1,'REPLACE_REVIEWED_RULE_CONTENT',now(),'REPLACE_VERIFIED_OWNER_AUTH_UUID'::uuid);
commit;
