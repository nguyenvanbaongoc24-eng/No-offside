-- Runs inside the existing Supabase database; no new paid service or client timer.
-- Apply after 005 and 006. The named job is updated rather than duplicated.
begin;
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('no-offside-fund-tick', '* * * * *', 'select public.no_fund_tick();');
commit;
