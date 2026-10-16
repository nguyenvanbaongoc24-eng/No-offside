begin;
create table public.no_pro_offers(id uuid primary key default gen_random_uuid(),team_id text not null references public.no_gov_teams(id),district text not null,level text not null check(level in ('beginner','regular','advanced')),kickoff timestamptz not null,venue text not null,format integer not null check(format in (5,7,11)),finance text not null check(finance in ('split','loser')),status text not null default 'open' check(status in ('open','matched','closed')),actor uuid not null,created_at timestamptz not null default clock_timestamp());
create index no_pro_board on public.no_pro_offers(status,kickoff);
create table public.no_pro_challenges(id uuid primary key default gen_random_uuid(),offer_id uuid references public.no_pro_offers(id),team_id text references public.no_gov_teams(id),status text not null default 'pending' check(status in ('pending','accepted','declined')),created_at timestamptz not null default clock_timestamp(),unique(offer_id,team_id));
create table public.no_pro_settings(team_id text primary key references public.no_gov_teams(id),policy jsonb not null default '{"yellow":false,"late":false,"absence":false}');
create table public.no_pro_stats(team_id text references public.no_gov_teams(id),match_id text not null,subject text not null,goals integer not null check(goals between 0 and 100),assists integer not null check(assists between 0 and 100),yellow integer not null check(yellow between 0 and 2),actor uuid not null,created_at timestamptz not null default clock_timestamp(),primary key(team_id,match_id,subject));
create table public.no_pro_votes(team_id text references public.no_gov_teams(id),match_id text not null,voter uuid not null,candidate text not null,created_at timestamptz not null default clock_timestamp(),primary key(team_id,match_id,voter));
create table public.no_pro_bills(id uuid primary key,team_id text references public.no_gov_teams(id),title text not null,total bigint not null check(total between 1 and 1000000000),actor uuid not null,created_at timestamptz not null default clock_timestamp());
create table public.no_pro_charges(id uuid primary key default gen_random_uuid(),team_id text references public.no_gov_teams(id),subject text not null,kind text not null check(kind in ('fine','third')),source_key text not null,label text not null,amount bigint not null check(amount between 1 and 1000000000),status text not null default 'owed' check(status in ('owed','paid','void')),actor uuid not null,bill_id uuid references public.no_pro_bills(id),created_at timestamptz not null default clock_timestamp(),resolved_at timestamptz,reason text,unique(team_id,source_key));
create table public.no_pro_media(id uuid primary key default gen_random_uuid(),team_id text references public.no_gov_teams(id),match_id text not null,url text not null,kind text not null check(kind in ('youtube','tiktok','image')),caption text not null default '',actor uuid not null,created_at timestamptz not null default clock_timestamp(),hidden boolean not null default false);
create table public.no_pro_receipts(team_id text references public.no_gov_teams(id),actor uuid not null,request_key uuid not null,result jsonb not null,primary key(team_id,actor,request_key));
alter table public.no_pro_offers enable row level security;alter table public.no_pro_challenges enable row level security;alter table public.no_pro_settings enable row level security;alter table public.no_pro_stats enable row level security;alter table public.no_pro_votes enable row level security;alter table public.no_pro_bills enable row level security;alter table public.no_pro_charges enable row level security;alter table public.no_pro_media enable row level security;alter table public.no_pro_receipts enable row level security;
revoke all on public.no_pro_offers,public.no_pro_challenges,public.no_pro_settings,public.no_pro_stats,public.no_pro_votes,public.no_pro_bills,public.no_pro_charges,public.no_pro_media,public.no_pro_receipts from public,anon,authenticated;
create function public.no_pro_participated(p_team text,p_match text,p_subject text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.no_app_workspaces w where w.team_id=p_team and w.data->'attendance'->p_match->>p_subject='attending') or exists(select 1 from public.no_gov_events e where e.team_id=p_team and e.match_id=p_match and e.subject::text=p_subject and e.action='arrival');
$$;
create function public.no_pro_notice(p_team text,p_subject text,p_key text,p_title text,p_body text,p_route text default 'fund') returns void language plpgsql security definer set search_path='' as $$ begin
 update public.no_app_workspaces set revision=revision+1,data=jsonb_set(data,'{notices}',jsonb_build_array(jsonb_build_object('id',md5(p_key)::uuid,'title',p_title,'content',p_body,'route',p_route,'audience',p_subject,'createdAt',clock_timestamp())) || coalesce(data->'notices','[]')) where team_id=p_team and not exists(select 1 from jsonb_array_elements(coalesce(data->'notices','[]')) n where n->>'id'=md5(p_key)::uuid::text);
end $$;
create function public.no_pro_charge(p_team text,p_subject text,p_kind text,p_source text,p_label text,p_amount bigint,p_bill uuid default null) returns void language plpgsql security definer set search_path='' as $$
declare c public.no_pro_charges; member jsonb; debtor jsonb;
begin
 if p_amount<=0 then return;end if;
 select x into member from jsonb_array_elements(public.no_app_snapshot(p_team)->'team'->'members') x where x->>'id'=p_subject and x->>'membershipStatus'='active';
 if member is null then if p_kind='fine' then return;end if;raise exception 'Thành viên không hoạt động trong đội.';end if;
 insert into public.no_pro_charges(team_id,subject,kind,source_key,label,amount,actor,bill_id) values(p_team,p_subject,p_kind,p_source,p_label,p_amount,auth.uid(),p_bill) on conflict(team_id,source_key) do nothing returning * into c;
 if c.id is null then return;end if;
 if p_kind='fine' then
 debtor:=jsonb_build_object('id','pro-'||c.id,'playerId',p_subject,'name',member->>'name','amount',p_amount,'month',to_char(clock_timestamp() at time zone (select timezone from public.no_gov_teams where id=p_team),'YYYY-MM'),'source','pro-fine','label',p_label);
 update public.no_app_workspaces set revision=revision+1,data=jsonb_set(data,'{funds,debtors}',coalesce(data->'funds'->'debtors','[]') || jsonb_build_array(debtor),true) where team_id=p_team;
 end if;
 perform public.no_pro_notice(p_team,p_subject,c.id::text,case p_kind when 'third' then 'Khoản chia Hiệp 3' else 'Nợ phạt mới' end,p_label || ': ' || p_amount::text || ' đ');
end $$;
create function public.no_pro_apply_fines(p_team text,p_match text) returns void language plpgsql security definer set search_path='' as $$
declare policy jsonb; e record; cutoff timestamptz;
begin
 select s.policy into policy from public.no_pro_settings s where s.team_id=p_team;
 if policy is null then return;end if;
 if policy->>'late'='true' then
 for e in select x.subject from public.no_gov_events x where x.team_id=p_team and x.match_id=p_match and x.action='violation' and x.data->>'type'='late' and coalesce((select a.data->>'status' from public.no_gov_events a where a.team_id=p_team and a.action='adjust' and a.data->>'eventId'=x.id::text order by a.seq desc limit 1),'final')<>'void' loop
 perform public.no_pro_charge(p_team,e.subject::text,'fine',p_match||':'||e.subject||':late','Đi muộn · '||p_match,30000);end loop;
 end if;
 if policy->>'absence'='true' then
 select kickoff-interval '2 hours' into cutoff from public.no_gov_matches where team_id=p_team and id=p_match;
 for e in select distinct on(subject) subject,data,created_at from public.no_gov_events where team_id=p_team and match_id=p_match and action='attendance' order by subject,seq desc loop
 if e.data->>'status'='absent' and e.created_at>=cutoff then perform public.no_pro_charge(p_team,e.subject::text,'fine',p_match||':'||e.subject||':absence','Báo vắng trong 2 giờ trước trận · '||p_match,100000);end if;end loop;
 end if;
end $$;
create function public.no_pro_completed() returns trigger language plpgsql security definer set search_path='' as $$ declare m jsonb;begin
 if new.data->'matches' is distinct from old.data->'matches' then
 for m in select value from jsonb_array_elements(coalesce(new.data->'matches','[]')) loop
 if m->>'status'='completed' and not exists(select 1 from jsonb_array_elements(coalesce(old.data->'matches','[]')) o where o->>'id'=m->>'id' and o->>'status'='completed') then perform public.no_pro_apply_fines(new.team_id,m->>'id');end if;end loop;end if;return new;end $$;
create trigger no_pro_completed after update of data on public.no_app_workspaces for each row execute function public.no_pro_completed();
create table public.no_pro_awards(team_id text references public.no_gov_teams(id),match_id text not null,winner text not null,awarded_at timestamptz not null default clock_timestamp(),valid_until timestamptz not null default clock_timestamp()+interval '7 days',primary key(team_id,match_id));
alter table public.no_pro_awards enable row level security;revoke all on public.no_pro_awards from public,anon,authenticated;
create function public.no_pro_finalize_awards(p_team text) returns void language plpgsql security definer set search_path='' as $$
declare mt jsonb;total integer;votes integer;top_count integer;winner text;ties integer;begin
 for mt in select j.value from public.no_app_workspaces ws cross join jsonb_array_elements(coalesce(ws.data->'matches','[]')) j(value) where ws.team_id=p_team and j.value->>'status'='completed' and j.value->>'archivedAt' is null loop
 if exists(select 1 from public.no_pro_awards where team_id=p_team and match_id=mt->>'id') then continue;end if;
 select count(*) into total from jsonb_array_elements(public.no_app_snapshot(p_team)->'team'->'members') r where public.no_pro_participated(p_team,mt->>'id',r->>'id');
 select count(*) into votes from public.no_pro_votes where team_id=p_team and match_id=mt->>'id';
 if votes>0 and (votes>=total or (mt->>'datetime')::timestamptz<clock_timestamp()-interval '3 days') then
 select candidate,count(*) into winner,top_count from public.no_pro_votes where team_id=p_team and match_id=mt->>'id' group by candidate order by count(*) desc,candidate limit 1;
 select count(*) into ties from (select candidate from public.no_pro_votes where team_id=p_team and match_id=mt->>'id' group by candidate having count(*)=top_count) t;
 if ties=1 then insert into public.no_pro_awards(team_id,match_id,winner,awarded_at,valid_until) values(p_team,mt->>'id',winner,least(clock_timestamp(),(mt->>'datetime')::timestamptz+interval '3 days'),least(clock_timestamp(),(mt->>'datetime')::timestamptz+interval '3 days')+interval '7 days') on conflict do nothing;end if;
 end if;end loop;end $$;
revoke all on function public.no_pro_finalize_awards(text) from public,anon,authenticated;
create function public.no_pro_action(p_team text,p_action text,p_payload jsonb default '{}',p_key uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare me public.no_gov_members; w public.no_app_workspaces; offer public.no_pro_offers; challenge public.no_pro_challenges; result jsonb; x jsonb; m jsonb; item jsonb; target text; team text; teamname text; matchid text; ids text[]; subject text; total bigint; amount bigint; idx integer:=0; bill uuid; policy jsonb; charge public.no_pro_charges;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501';end if;
 select * into me from public.no_gov_members where team_id=p_team and user_id=auth.uid() and (status='active' or (status='locked' and locked_until<=clock_timestamp()));
 if not found or exists(select 1 from public.no_gov_teams where id=p_team and dissolved_at is not null) then raise exception 'Không có quyền vào đội.' using errcode='42501';end if;
 if jsonb_typeof(p_payload)<>'object' then raise exception 'Invalid payload';end if;
 if p_action='state' then
 perform pg_advisory_xact_lock(hashtext('no-pro:'||p_team));
 perform public.no_pro_finalize_awards(p_team);
 select * into w from public.no_app_workspaces where team_id=p_team;
 return jsonb_build_object('success',true,'offers',(select coalesce(jsonb_agg((to_jsonb(o)-'actor')||jsonb_build_object('teamName',t.name,'logo',t.logo) order by o.kickoff),'[]') from public.no_pro_offers o join public.no_gov_teams t on t.id=o.team_id where o.status='open' and o.kickoff>clock_timestamp() and t.dissolved_at is null),
 'challenges',(select coalesce(jsonb_agg(to_jsonb(c)||jsonb_build_object('opponent',t.name,'offerTeam',o.team_id,'kickoff',o.kickoff,'venue',o.venue)),'[]') from public.no_pro_challenges c join public.no_pro_offers o on o.id=c.offer_id join public.no_gov_teams t on t.id=case when c.team_id=p_team then o.team_id else c.team_id end where c.team_id=p_team or o.team_id=p_team),
 'policy',coalesce((select s.policy from public.no_pro_settings s where s.team_id=p_team),'{"yellow":false,"late":false,"absence":false}'),
 'awards',(select coalesce(jsonb_agg(to_jsonb(a)),'[]') from public.no_pro_awards a where a.team_id=p_team and a.valid_until>clock_timestamp()),
 'stats',(select coalesce(jsonb_agg(to_jsonb(s)),'[]') from public.no_pro_stats s where s.team_id=p_team),
 'votes',(select coalesce(jsonb_agg(jsonb_build_object('match_id',v.match_id,'candidate',v.candidate,'own',v.voter=auth.uid())),'[]') from public.no_pro_votes v where v.team_id=p_team),
 'charges',(select coalesce(jsonb_agg(to_jsonb(c) order by c.created_at desc),'[]') from public.no_pro_charges c where c.team_id=p_team and (me.role in ('owner','admin') or c.subject=auth.uid()::text)),
 'bills',(select coalesce(jsonb_agg(to_jsonb(b) order by b.created_at desc),'[]') from public.no_pro_bills b where b.team_id=p_team and (me.role in ('owner','admin') or exists(select 1 from public.no_pro_charges c where c.bill_id=b.id and c.subject=auth.uid()::text))),
 'media',(select coalesce(jsonb_agg(to_jsonb(s) order by s.created_at desc),'[]') from public.no_pro_media s where s.team_id=p_team and not s.hidden),
 'reports',(select coalesce(jsonb_object_agg(r.key,(select coalesce(jsonb_object_agg(mt.key,jsonb_build_object('goals',mt.value->'goals','assists',mt.value->'assists')),'{}') from jsonb_each(r.value) mt)),'{}') from jsonb_each(coalesce(w.data->'reports','{}')) r),'participation',(select coalesce(jsonb_agg(jsonb_build_object('match_id',mt->>'id','subject',a->>'id')),'[]') from jsonb_array_elements(coalesce(w.data->'matches','[]')) mt cross join jsonb_array_elements(public.no_app_snapshot(p_team)->'team'->'members') a where public.no_pro_participated(p_team,mt->>'id',a->>'id')));
 end if;
 if p_key is null then raise exception 'Request key required';end if;
 perform pg_advisory_xact_lock(hashtext('no-pro:'||p_team));
 perform pg_advisory_xact_lock(hashtext(p_team||auth.uid()::text||p_key::text));
 select r.result into result from public.no_pro_receipts r where r.team_id=p_team and r.actor=auth.uid() and r.request_key=p_key;if found then return result;end if;
 if p_action not in ('vote','media-add','media-hide') and me.role not in ('owner','admin') then raise exception 'Chỉ ban quản trị được thao tác.' using errcode='42501';end if;
 case p_action
 when 'offer' then
 if length(trim(coalesce(p_payload->>'district','')))<2 or length(trim(coalesce(p_payload->>'venue','')))<2 or length(p_payload->>'venue')>150 or length(p_payload->>'district')>80 or (p_payload->>'kickoff')::timestamptz<clock_timestamp()+interval '2 hours' or (p_payload->>'kickoff')::timestamptz>clock_timestamp()+interval '180 days' then raise exception 'Nhập khu vực, sân và giờ đá từ 2 giờ tới 180 ngày.';end if;
 if (select count(*) from public.no_pro_offers where team_id=p_team and status='open' and kickoff>clock_timestamp())>=10 then raise exception 'Mỗi đội có tối đa 10 kèo đang mở.';end if;
 insert into public.no_pro_offers(team_id,district,venue,kickoff,format,level,finance,actor) values(p_team,trim(p_payload->>'district'),trim(p_payload->>'venue'),(p_payload->>'kickoff')::timestamptz,(p_payload->>'format')::integer,p_payload->>'level',p_payload->>'finance',auth.uid()) returning id into bill;
 when 'challenge' then
 select * into offer from public.no_pro_offers where id=(p_payload->>'offerId')::uuid for update;
 if not found or offer.team_id=p_team or offer.status<>'open' or offer.kickoff<=clock_timestamp()+interval '1 hour' then raise exception 'Kèo không còn nhận thách đấu.';end if;
 insert into public.no_pro_challenges(offer_id,team_id) values(offer.id,p_team) on conflict(offer_id,team_id) do nothing;
 perform public.no_pro_notice(offer.team_id,'leaders',offer.id||p_team,'Có lời thách đấu mới','Mở No Offside Pro để xem và phản hồi.','dashboard');
 when 'close-offer' then
 update public.no_pro_offers set status='closed' where id=(p_payload->>'offerId')::uuid and team_id=p_team and status='open';if not found then raise exception 'Không đóng được kèo.';end if;
 when 'accept','decline' then
 select * into offer from public.no_pro_offers where id=(select offer_id from public.no_pro_challenges where id=(p_payload->>'challengeId')::uuid) for update;
 select * into challenge from public.no_pro_challenges where id=(p_payload->>'challengeId')::uuid for update;
 if challenge.id is null or offer.team_id<>p_team or offer.status<>'open' or challenge.status<>'pending' or offer.kickoff<=clock_timestamp()+interval '1 hour' then raise exception 'Lời thách đấu không hợp lệ hoặc đã xử lý.';end if;
 if p_action='decline' then update public.no_pro_challenges set status='declined' where id=challenge.id;
 else
 perform 1 from public.no_gov_teams t where t.id in (p_team,challenge.team_id) and t.dissolved_at is null order by t.id for update;
 if not exists(select 1 from public.no_gov_members where team_id=challenge.team_id and role='owner' and status='active') then raise exception 'Đội đối thủ không hoạt động.';end if;
 perform 1 from public.no_app_workspaces aw where aw.team_id in(p_team,challenge.team_id) order by aw.team_id for update;
 if (select count(*) from public.no_app_workspaces where team_id in(p_team,challenge.team_id))<>2 then raise exception 'Hai đội cần hoàn tất khởi tạo trước khi nhận kèo.';end if;
 matchid:='cap-'||offer.id;
 foreach team in array array[p_team,challenge.team_id] loop
 select name into teamname from public.no_gov_teams where id=case when team=p_team then challenge.team_id else p_team end;
 insert into public.no_gov_matches(team_id,id,title,kickoff,attendance_deadline) values(team,matchid,'Giao hữu với '||teamname,offer.kickoff,offer.kickoff-interval '1 hour');
 item:=jsonb_build_object('id',matchid,'title','Giao hữu với '||teamname,'opponent',teamname,'datetime',offer.kickoff,'deadline',offer.kickoff-interval '1 hour','venue',offer.venue,'status','upcoming','penaltyEnabled',false,'penaltyAmount','0 đ','opponentLogo',(select logo from public.no_gov_teams where id=case when team=p_team then challenge.team_id else p_team end),'format',offer.format,'finance',offer.finance,'createdAt',clock_timestamp(),'sourceOffer',offer.id,'eligibleMemberIds',(select coalesce(jsonb_agg(g.user_id::text),'[]') from public.no_gov_members g where g.team_id=team and g.status='active'));
 update public.no_app_workspaces set revision=revision+1,data=jsonb_set(data,'{matches}',coalesce(data->'matches','[]')||jsonb_build_array(item)) where team_id=team;
 perform public.no_pro_notice(team,'all',matchid||team,'Đã cáp kèo','Giao hữu với '||teamname||' tại '||offer.venue,'dashboard');
 end loop;
 update public.no_pro_offers set status='matched' where id=offer.id;update public.no_pro_challenges set status=case when id=challenge.id then 'accepted' else 'declined' end where offer_id=offer.id;
 end if;
 when 'policy' then
 if not (p_payload ?& array['yellow','late','absence']) or exists(select 1 from jsonb_each(p_payload) e where e.key not in ('yellow','late','absence') or jsonb_typeof(e.value)<>'boolean') then raise exception 'Luật phạt không hợp lệ.';end if;
 insert into public.no_pro_settings values(p_team,p_payload) on conflict(team_id) do update set policy=excluded.policy;
 when 'third-bill' then
 total:=(p_payload->>'total')::bigint;select array_agg(distinct value order by value) into ids from jsonb_array_elements_text(p_payload->'participants');
 if total is null or total<1 or total>1000000000 or cardinality(ids) not between 1 and 100 or total<cardinality(ids) or length(trim(coalesce(p_payload->>'title','')))<2 or length(p_payload->>'title')>120 then raise exception 'Bill hoặc danh sách người tham gia không hợp lệ.';end if;
 bill:=p_key;insert into public.no_pro_bills values(bill,p_team,trim(p_payload->>'title'),total,auth.uid(),clock_timestamp());
 foreach subject in array ids loop
 amount:=total/cardinality(ids)+case when idx<total%cardinality(ids) then 1 else 0 end;idx:=idx+1;
 perform public.no_pro_charge(p_team,subject,'third',bill||':'||subject,trim(p_payload->>'title'),amount,bill);end loop;
 when 'charge-paid','charge-void' then
 select * into charge from public.no_pro_charges where id=(p_payload->>'chargeId')::uuid and team_id=p_team for update;
 if charge.id is null or charge.status<>'owed' then raise exception 'Khoản nợ không còn chờ xử lý.';end if;
 if charge.kind='fine' and p_action='charge-paid' then raise exception 'Đối soát phạt qua quy trình Quỹ đội.';end if;
 if length(trim(coalesce(p_payload->>'reason','')))<3 then raise exception 'Cần lý do đối soát.';end if;
 update public.no_pro_charges set status=case when p_action='charge-paid' then 'paid' else 'void' end,reason=p_payload->>'reason',resolved_at=clock_timestamp() where id=charge.id;
 if charge.kind='fine' then update public.no_app_workspaces set revision=revision+1,data=jsonb_set(data,'{funds,debtors}',(select coalesce(jsonb_agg(d),'[]') from jsonb_array_elements(data->'funds'->'debtors') d where d->>'id'<>'pro-'||charge.id)) where team_id=p_team;end if;
 when 'finalize-stats' then
 matchid:=p_payload->>'matchId';select j.value into m from public.no_app_workspaces ws cross join jsonb_array_elements(ws.data->'matches') j(value) where ws.team_id=p_team and j.value->>'id'=matchid and j.value->>'status'='completed' and j.value->>'archivedAt' is null;
 if m is null or jsonb_typeof(p_payload->'players')<>'array' or jsonb_array_length(p_payload->'players') not between 1 and 100 then raise exception 'Chỉ chốt thống kê trận đã kết thúc.';end if;
 if exists(select 1 from public.no_pro_stats where team_id=p_team and match_id=matchid) then raise exception 'Thống kê trận đã chốt; không được ghi phạt lần nữa.';end if;
 select s.policy into policy from public.no_pro_settings s where s.team_id=p_team;
 for x in select value from jsonb_array_elements(p_payload->'players') loop
 subject:=x->>'id';if not public.no_pro_participated(p_team,matchid,subject) then raise exception 'Cầu thủ chưa có xác nhận tham gia.';end if;
 insert into public.no_pro_stats values(p_team,matchid,subject,(x->>'goals')::integer,(x->>'assists')::integer,(x->>'yellow')::integer,auth.uid(),clock_timestamp());
 if policy->>'yellow'='true' then perform public.no_pro_charge(p_team,subject,'fine',matchid||':'||subject||':yellow','Thẻ vàng · '||matchid,(x->>'yellow')::integer*50000);end if;end loop;
 perform public.no_pro_apply_fines(p_team,matchid);
 when 'vote' then
 matchid:=p_payload->>'matchId';subject:=p_payload->>'candidate';if exists(select 1 from public.no_pro_awards where team_id=p_team and match_id=matchid) then raise exception 'MOTM đã chốt.';end if;select j.value into m from public.no_app_workspaces ws cross join jsonb_array_elements(ws.data->'matches') j(value) where ws.team_id=p_team and j.value->>'id'=matchid and j.value->>'status'='completed' and j.value->>'archivedAt' is null and (j.value->>'datetime')::timestamptz>clock_timestamp()-interval '3 days' and (j.value->>'datetime')::timestamptz<=clock_timestamp();
 if m is null or not public.no_pro_participated(p_team,matchid,auth.uid()::text) or not public.no_pro_participated(p_team,matchid,subject) then raise exception 'Chỉ người tham gia trận được bầu trong 72 giờ.';end if;
 insert into public.no_pro_votes(team_id,match_id,voter,candidate) values(p_team,matchid,auth.uid(),subject) on conflict(team_id,match_id,voter) do update set candidate=excluded.candidate;
 perform public.no_pro_finalize_awards(p_team);
 when 'media-add' then
 matchid:=p_payload->>'matchId';if not exists(select 1 from public.no_app_workspaces ws cross join jsonb_array_elements(ws.data->'matches') mt where ws.team_id=p_team and mt->>'id'=matchid and mt->>'status'='completed' and mt->>'archivedAt' is null) then raise exception 'Chỉ thêm khoảnh khắc vào trận đã đá.';end if;
 if length(coalesce(p_payload->>'caption',''))>200 or length(coalesce(p_payload->>'url',''))>1000 then raise exception 'Nội dung quá dài.';end if;
 if not ((p_payload->>'kind'='youtube' and p_payload->>'url' ~ '^https://www.youtube-nocookie.com/embed/[A-Za-z0-9_-]{11}$') or (p_payload->>'kind'='tiktok' and p_payload->>'url' ~ '^https://www.tiktok.com/player/v1/[0-9]{10,25}$') or (p_payload->>'kind'='image' and p_payload->>'url' ~ '^https://[A-Za-z0-9.-]+/[^?#]+\.(png|jpg|jpeg|webp)$')) then raise exception 'Liên kết media không được hỗ trợ.';end if;
 if (select count(*) from public.no_pro_media where actor=auth.uid() and created_at>clock_timestamp()-interval '1 hour')>=20 then raise exception 'Tối đa 20 khoảnh khắc mỗi giờ.';end if;
 insert into public.no_pro_media(team_id,match_id,url,kind,caption,actor) values(p_team,matchid,p_payload->>'url',p_payload->>'kind',coalesce(p_payload->>'caption',''),auth.uid());
 when 'media-hide' then
 update public.no_pro_media set hidden=true where id=(p_payload->>'mediaId')::uuid and team_id=p_team and (actor=auth.uid() or me.role in ('owner','admin'));if not found then raise exception 'Không có quyền ẩn khoảnh khắc.';end if;
 else raise exception 'Unknown action';end case;
 result:=jsonb_build_object('success',true);insert into public.no_pro_receipts values(p_team,auth.uid(),p_key,result);return result;
end $$;
revoke all on function public.no_pro_participated(text,text,text),public.no_pro_notice(text,text,text,text,text,text),public.no_pro_charge(text,text,text,text,text,bigint,uuid),public.no_pro_apply_fines(text,text),public.no_pro_completed(),public.no_pro_action(text,text,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.no_pro_action(text,text,jsonb,uuid) to authenticated;
create function public.no_pro_validate_drawing() returns trigger language plpgsql set search_path='' as $$
declare f jsonb;s jsonb;p jsonb;begin
 if new.data->'lineups' is not distinct from old.data->'lineups' then return new;end if;
 if octet_length((new.data->'lineups')::text)>300000 or jsonb_array_length(coalesce(new.data->'lineups'->'formations','[]'))>30 then raise exception 'Tối đa 30 mẫu chiến thuật hoặc dữ liệu nét vẽ quá lớn.';end if;
 for f in select value from jsonb_array_elements(coalesce(new.data->'lineups'->'formations','[]')) loop
 if f ? 'drawing' then
 if jsonb_typeof(f->'drawing')<>'array' or jsonb_array_length(f->'drawing')>80 then raise exception 'Nét vẽ không hợp lệ.';end if;
 for s in select value from jsonb_array_elements(f->'drawing') loop
 if coalesce(s->>'color','') not in ('red','blue') or jsonb_typeof(s->'points') is distinct from 'array' or jsonb_array_length(s->'points') not between 2 and 400 then raise exception 'Nét vẽ không hợp lệ.';end if;
 for p in select value from jsonb_array_elements(s->'points') loop
 if jsonb_typeof(p)<>'array' or jsonb_array_length(p)<>2 or jsonb_typeof(p->0)<>'number' or jsonb_typeof(p->1)<>'number' or (p->>0)::numeric not between 0 and 1 or (p->>1)::numeric not between 0 and 1 then raise exception 'Tọa độ không hợp lệ.';end if;end loop;end loop;end if;end loop;return new;end $$;
create trigger no_pro_validate_drawing before update of data on public.no_app_workspaces for each row execute function public.no_pro_validate_drawing();
revoke all on function public.no_pro_validate_drawing() from public,anon,authenticated;
-- A fine is marked paid only when the existing approval flow removes its debtor
-- and writes a corresponding income transaction in the same update.
create function public.no_pro_payment_sync() returns trigger language plpgsql security definer set search_path='' as $$ declare c public.no_pro_charges;d jsonb;begin
 if new.data->'funds' is not distinct from old.data->'funds' then return new;end if;
 for c in select * from public.no_pro_charges where team_id=new.team_id and kind='fine' and status='owed' loop
 select x into d from jsonb_array_elements(coalesce(old.data->'funds'->'debtors','[]')) x where x->>'id'='pro-'||c.id;
 if d is not null and not exists(select 1 from jsonb_array_elements(coalesce(new.data->'funds'->'debtors','[]')) x where x->>'id'='pro-'||c.id)
 and exists(select 1 from jsonb_array_elements(coalesce(new.data->'funds'->'transactions','[]')) tx where tx->>'type'='income' and tx->>'playerId'=c.subject and tx->>'month'=d->>'month' and not exists(select 1 from jsonb_array_elements(coalesce(old.data->'funds'->'transactions','[]')) ot where ot->>'id'=tx->>'id')) then
 update public.no_pro_charges set status='paid',resolved_at=clock_timestamp(),reason='Đối soát qua Quỹ đội' where id=c.id;end if;end loop;return new;end $$;
create trigger no_pro_payment_sync after update of data on public.no_app_workspaces for each row execute function public.no_pro_payment_sync();
revoke all on function public.no_pro_payment_sync() from public,anon,authenticated;
notify pgrst,'reload schema';
commit;
