begin;
-- Extend existing offers/proposals; preserve legacy rows and their history.
alter table public.no_pro_offers drop constraint no_pro_offers_status_check;
alter table public.no_pro_offers add constraint no_pro_offers_status_check check(status in ('open','confirming','matched','closed','cancelled','expired'));
alter table public.no_pro_offers add column ends_at timestamptz;
alter table public.no_pro_offers add column expires_at timestamptz;
alter table public.no_pro_offers add column conditions jsonb not null default '{}';
alter table public.no_pro_offers add column source_match text;
update public.no_pro_offers set ends_at=kickoff+interval '90 minutes',expires_at=kickoff,
 conditions=jsonb_build_object('kickoff',kickoff,'endsAt',kickoff+interval '90 minutes','expiresAt',kickoff,'district',district,'format',format,'level',level,'venue',venue,'venueStatus','booked','address','','mapUrl','','cost',null,'sharing',finance,'support',0,'shirt','','note','','requirements','');
alter table public.no_pro_offers alter column ends_at set not null;
alter table public.no_pro_offers alter column expires_at set not null;
alter table public.no_pro_offers add constraint no_mm_offer_time check(ends_at>kickoff and expires_at<=kickoff);
create unique index no_mm_source_match on public.no_pro_offers(team_id,source_match) where source_match is not null and status in ('open','confirming','matched');
alter table public.no_pro_challenges drop constraint no_pro_challenges_status_check;
alter table public.no_pro_challenges add constraint no_pro_challenges_status_check check(status in ('pending','discussing','confirming','accepted','declined','withdrawn','closed'));
alter table public.no_pro_challenges add column current_version integer not null default 0;
alter table public.no_pro_challenges add column closed_reason text;
create index no_mm_proposal_team on public.no_pro_challenges(team_id,created_at desc);
create table public.no_mm_terms(
 id uuid primary key default gen_random_uuid(),challenge_id uuid not null references public.no_pro_challenges(id),
 version integer not null check(version>0),conditions jsonb not null,actor uuid not null,actor_team text not null references public.no_gov_teams(id),created_at timestamptz not null default clock_timestamp(),unique(challenge_id,version));
create table public.no_mm_confirmations(
 challenge_id uuid not null,version integer not null,team_id text not null references public.no_gov_teams(id),actor uuid not null,
 allow_conflict boolean not null default false,created_at timestamptz not null default clock_timestamp(),
 primary key(challenge_id,version,team_id),foreign key(challenge_id,version) references public.no_mm_terms(challenge_id,version));
create table public.no_mm_messages(
 id uuid primary key default gen_random_uuid(),challenge_id uuid not null references public.no_pro_challenges(id),team_id text not null references public.no_gov_teams(id),actor uuid not null,
 body text not null check(length(trim(body)) between 1 and 2000),created_at timestamptz not null default clock_timestamp());
create index no_mm_messages_thread on public.no_mm_messages(challenge_id,created_at,id);
create table public.no_mm_links(
 offer_id uuid primary key references public.no_pro_offers(id),challenge_id uuid not null unique references public.no_pro_challenges(id),
 home_team text not null references public.no_gov_teams(id),away_team text not null references public.no_gov_teams(id),
 home_match text not null,away_match text not null,version integer not null,created_at timestamptz not null default clock_timestamp(),
 cancelled_at timestamptz,cancelled_by uuid,cancelled_team text,cancel_reason text,check(home_team<>away_team));
create table public.no_mm_reports(
 offer_id uuid not null references public.no_mm_links(offer_id),team_id text not null references public.no_gov_teams(id),
 home integer not null check(home between 0 and 999),away integer not null check(away between 0 and 999),played boolean not null,
 actor uuid not null,created_at timestamptz not null default clock_timestamp(),primary key(offer_id,team_id));
create table public.no_mm_events(
 id uuid primary key default gen_random_uuid(),team_id text not null references public.no_gov_teams(id),actor uuid not null,
 action text not null,offer_id uuid references public.no_pro_offers(id),challenge_id uuid references public.no_pro_challenges(id),
 payload jsonb not null,created_at timestamptz not null default clock_timestamp());
create index no_mm_events_team on public.no_mm_events(team_id,created_at desc);
create table public.no_mm_receipts(team_id text not null,actor uuid not null,request_key uuid not null,action text not null,payload jsonb not null,result jsonb not null,primary key(team_id,actor,request_key));
create table public.no_team_entitlements(
 team_id text primary key references public.no_gov_teams(id),plan text not null check(plan in ('free','pro')),
 status text not null check(status in ('active','suspended','expired')),starts_at timestamptz not null,ends_at timestamptz,
 source text not null,features jsonb not null default '["templates","filters","opponents"]',updated_at timestamptz not null default clock_timestamp(),check(ends_at is null or ends_at>starts_at));
create table public.no_mm_assets(
 id uuid primary key default gen_random_uuid(),team_id text not null references public.no_gov_teams(id),
 kind text not null check(kind in ('templates','filters','opponents')),name text not null check(length(trim(name)) between 1 and 80),
 owner_id uuid not null,data jsonb not null,created_at timestamptz not null default clock_timestamp(),updated_at timestamptz not null default clock_timestamp());
create index no_mm_assets_team on public.no_mm_assets(team_id,kind,owner_id);
create unique index no_mm_familiar_once on public.no_mm_assets(team_id,(data->>'teamId')) where kind='opponents';
do $$declare tab text;begin
 foreach tab in array array['no_mm_terms','no_mm_confirmations','no_mm_messages','no_mm_links','no_mm_reports','no_mm_events','no_mm_receipts','no_team_entitlements','no_mm_assets'] loop
 execute format('alter table public.%I enable row level security',tab);
 execute format('revoke all on public.%I from public,anon,authenticated',tab);
 end loop;
end$$;

create function public.no_mm_entitlement(p_team text) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce((select to_jsonb(e)||jsonb_build_object('enabled',e.plan='pro' and e.status='active' and e.starts_at<=clock_timestamp() and (e.ends_at is null or e.ends_at>clock_timestamp())) from public.no_team_entitlements e where e.team_id=p_team),'{"plan":"free","status":"inactive","enabled":false,"features":[]}'::jsonb)
$$;
create function public.no_mm_conditions(p_data jsonb) returns jsonb language plpgsql set search_path='' as $$
declare k timestamptz;en timestamptz;ex timestamptz;cost bigint;support bigint;
begin
 k:=(p_data->>'kickoff')::timestamptz;en:=(p_data->>'endsAt')::timestamptz;ex:=(p_data->>'expiresAt')::timestamptz;
 if k is null or en is null or ex is null or k<=clock_timestamp() or k>clock_timestamp()+interval '180 days' or en<=k or en>k+interval '24 hours' or ex<=clock_timestamp() or ex>k then raise exception 'Chọn ngày giờ tương lai, kết thúc trong 24 giờ và hạn nhận đề nghị trước giờ đá.';end if;
 if coalesce(p_data->>'format','') not in ('5','7','11') or coalesce(p_data->>'level','') not in ('beginner','regular','advanced') or length(trim(coalesce(p_data->>'district','')) ) not between 2 and 80 then raise exception 'Chọn khu vực, loại sân và trình độ tự đánh giá.';end if;
 if coalesce(p_data->>'venueStatus','') not in ('booked','planned','unknown') or (p_data->>'venueStatus'<>'unknown' and length(trim(coalesce(p_data->>'venue','')))<2) or length(coalesce(p_data->>'venue',''))>150 or length(coalesce(p_data->>'address',''))>500 or length(coalesce(p_data->>'mapUrl',''))>2000 or (coalesce(p_data->>'mapUrl','')<>'' and p_data->>'mapUrl' !~* '^https://') then raise exception 'Thông tin sân không hợp lệ; bản đồ phải dùng HTTPS.';end if;
 if coalesce(p_data->>'sharing','') not in ('split','support','agreement','loser') then raise exception 'Chọn cách chia chi phí dự kiến.';end if;
 cost:=nullif(p_data->>'cost','')::bigint;support:=coalesce(nullif(p_data->>'support','')::bigint,0);
 if (cost is not null and (cost<0 or cost>1000000000 or (p_data->>'cost')::numeric<>cost)) or support<0 or support>coalesce(cost,0) or coalesce(nullif(p_data->>'support','')::numeric,0)<>support then raise exception 'Chi phí và hỗ trợ phải là số nguyên không âm, hỗ trợ không vượt tổng dự kiến.';end if;
 if length(coalesce(p_data->>'shirt',''))>80 or length(coalesce(p_data->>'note',''))>2000 or length(coalesce(p_data->>'requirements',''))>1000 then raise exception 'Nội dung quá dài.';end if;
 return jsonb_build_object('kickoff',k,'endsAt',en,'expiresAt',ex,'format',(p_data->>'format')::integer,'level',p_data->>'level','district',trim(p_data->>'district'),'venueStatus',p_data->>'venueStatus','venue',trim(coalesce(p_data->>'venue','')),'address',trim(coalesce(p_data->>'address','')),'mapUrl',trim(coalesce(p_data->>'mapUrl','')),'cost',cost,'sharing',p_data->>'sharing','support',support,'shirt',coalesce(p_data->>'shirt',''),'note',coalesce(p_data->>'note',''),'requirements',coalesce(p_data->>'requirements',''));
end$$;
create function public.no_mm_conflict(p_team text,p_terms jsonb,p_offer uuid,p_match text) returns boolean language sql security definer set search_path='' as $$
 select exists(select 1 from public.no_app_workspaces w cross join jsonb_array_elements(w.data->'matches') m where w.team_id=p_team and m->>'id' is distinct from p_match and (p_offer is null or m->>'sourceOffer' is distinct from p_offer::text) and coalesce(m->>'status','upcoming') not in ('completed','archived','cancelled','canceled') and m->>'cancelledAt' is null and m->>'archivedAt' is null and (m->>'datetime')::timestamptz<(p_terms->>'endsAt')::timestamptz and coalesce((m->>'endsAt')::timestamptz,(m->>'datetime')::timestamptz+interval '90 minutes')>(p_terms->>'kickoff')::timestamptz)
 or exists(select 1 from public.no_pro_offers o where o.team_id=p_team and o.id is distinct from p_offer and o.status in ('open','confirming') and o.expires_at>clock_timestamp() and o.kickoff<(p_terms->>'endsAt')::timestamptz and o.ends_at>(p_terms->>'kickoff')::timestamptz)
$$;
create function public.no_mm_notice(p_team text,p_key text,p_title text,p_body text,p_offer uuid,p_challenge uuid) returns void language plpgsql security definer set search_path='' as $$
declare recipient record;begin
 for recipient in select user_id from public.no_gov_members where team_id=p_team and role in ('owner','admin') and (status='active' or (status='locked' and locked_until<=clock_timestamp())) loop
 perform public.no_fund_notice(p_team,recipient.user_id::text,p_key||':'||recipient.user_id,p_title,p_body,'dashboard',jsonb_build_object('kind','matchmaking','offerId',p_offer,'proposalId',p_challenge));
 end loop;
 insert into public.no_team_updates(team_id,version) values(p_team,1) on conflict(team_id) do update set version=no_team_updates.version+1;
end$$;

create function public.no_mm_state(p_team text default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare me public.no_gov_members;manage boolean:=false;result jsonb;begin
 if p_team is not null then
 select * into me from public.no_gov_members where team_id=p_team and user_id=auth.uid() and (status='active' or (status='locked' and locked_until<=clock_timestamp()));
 if not found or exists(select 1 from public.no_gov_teams where id=p_team and dissolved_at is not null) then raise exception 'Bạn không còn là thành viên hoạt động của đội.' using errcode='42501';end if;
 manage:=me.role in ('owner','admin');end if;
 result:=jsonb_build_object('success',true,'canManage',manage,'serverNow',clock_timestamp(),'offers',
 (select coalesce(jsonb_agg(x order by x->>'kickoff'),'[]') from (select jsonb_build_object('id',o.id,'team_id',o.team_id,'teamName',t.name,'logo',t.logo,'district',o.district,'format',o.format,'level',o.level,'kickoff',o.kickoff,'endsAt',o.ends_at,'status',case when o.status in ('open','confirming') and o.expires_at<=clock_timestamp() then 'expired' else o.status end,'conditions',case when p_team is null then jsonb_build_object('district',o.district,'format',o.format,'level',o.level,'kickoff',o.kickoff,'endsAt',o.ends_at,'venueStatus',o.conditions->'venueStatus','cost',o.conditions->'cost','sharing',o.conditions->'sharing','support',o.conditions->'support') else o.conditions end,'sourceMatch',case when o.team_id=p_team then o.source_match end,'created_at',o.created_at) x from public.no_pro_offers o join public.no_gov_teams t on t.id=o.team_id where t.dissolved_at is null and ((o.status='open' and o.expires_at>clock_timestamp() and o.kickoff>clock_timestamp()) or (p_team is not null and o.team_id=p_team) or (manage and exists(select 1 from public.no_pro_challenges c where c.offer_id=o.id and c.team_id=p_team))) order by o.created_at desc limit 200) v),
 'entitlement',case when p_team is null then '{"enabled":false,"plan":"free","features":[]}'::jsonb else public.no_mm_entitlement(p_team) end);
 if p_team is null then return result;end if;
 return result||jsonb_build_object('proposals',case when manage then (select coalesce(jsonb_agg(to_jsonb(c)||case when o.status in ('open','confirming') and o.expires_at<=clock_timestamp() and c.status in ('pending','discussing','confirming') and not exists(select 1 from public.no_mm_links linked_row where linked_row.challenge_id=c.id) then jsonb_build_object('status','closed','closed_reason','Tin đã hết hạn nhận đề nghị') else '{}'::jsonb end||jsonb_build_object('offerTeam',o.team_id,'teamName',t.name,'offerTeamName',ot.name) order by c.created_at desc),'[]') from public.no_pro_challenges c join public.no_pro_offers o on o.id=c.offer_id join public.no_gov_teams t on t.id=c.team_id join public.no_gov_teams ot on ot.id=o.team_id where c.team_id=p_team or o.team_id=p_team) else '[]'::jsonb end,
 'terms',case when manage then (select coalesce(jsonb_agg(to_jsonb(v) order by v.version),'[]') from public.no_mm_terms v join public.no_pro_challenges c on c.id=v.challenge_id join public.no_pro_offers o on o.id=c.offer_id where c.team_id=p_team or o.team_id=p_team) else '[]'::jsonb end,
 'confirmations',case when manage then (select coalesce(jsonb_agg(to_jsonb(v)),'[]') from public.no_mm_confirmations v join public.no_pro_challenges c on c.id=v.challenge_id join public.no_pro_offers o on o.id=c.offer_id where c.team_id=p_team or o.team_id=p_team) else '[]'::jsonb end,
 'messages',case when manage then (select coalesce(jsonb_agg(to_jsonb(v) order by v.created_at,v.id),'[]') from public.no_mm_messages v join public.no_pro_challenges c on c.id=v.challenge_id join public.no_pro_offers o on o.id=c.offer_id where c.team_id=p_team or o.team_id=p_team) else '[]'::jsonb end,
 'links',case when manage then (select coalesce(jsonb_agg(to_jsonb(v)),'[]') from public.no_mm_links v where v.home_team=p_team or v.away_team=p_team) else '[]'::jsonb end,
 'reports',case when manage then (select coalesce(jsonb_agg(to_jsonb(v)),'[]') from public.no_mm_reports v join public.no_mm_links l on l.offer_id=v.offer_id where l.home_team=p_team or l.away_team=p_team) else '[]'::jsonb end,
 'history',case when manage then (select coalesce(jsonb_agg(to_jsonb(v) order by v.created_at desc),'[]') from (select e.* from public.no_mm_events e where e.team_id=p_team or exists(select 1 from public.no_pro_challenges c join public.no_pro_offers o on o.id=c.offer_id where c.id=e.challenge_id and (c.team_id=p_team or o.team_id=p_team)) order by e.created_at desc limit 100) v) else '[]'::jsonb end,
 'assets',(select coalesce(jsonb_agg(to_jsonb(a) order by a.name),'[]') from public.no_mm_assets a where a.team_id=p_team and (a.kind='templates' or (a.kind='filters' and a.owner_id=auth.uid()) or (a.kind='opponents' and manage))));
end$$;

create function public.no_mm_link_matches(p_offer uuid,p_challenge uuid,p_terms jsonb,p_version integer) returns void language plpgsql security definer set search_path='' as $$
declare o public.no_pro_offers;c public.no_pro_challenges;l public.no_mm_links;t text;mid text;opponent text;item jsonb;prior jsonb;roster jsonb;begin
 select * into o from public.no_pro_offers where id=p_offer;select * into c from public.no_pro_challenges where id=p_challenge;select * into l from public.no_mm_links where offer_id=p_offer;
 foreach t in array array[o.team_id,c.team_id] loop
 mid:=case when t=o.team_id then coalesce(l.home_match,o.source_match,'mm-'||o.id) else coalesce(l.away_match,'mm-'||o.id) end;
 select m into prior from public.no_app_workspaces w cross join jsonb_array_elements(w.data->'matches') m where w.team_id=t and m->>'id'=mid;
 if prior->>'status'='completed' or exists(select 1 from public.no_match_records r where r.team_id=t and r.match_id=mid and r.finalized_at is not null) then raise exception 'Trận đã kết thúc/chốt; không đổi điều kiện chung của lịch sử.';end if;
 select name into opponent from public.no_gov_teams where id=case when t=o.team_id then c.team_id else o.team_id end;
 select coalesce(jsonb_agg(jsonb_build_object('id',user_id,'name',name,'number',jersey_number)),'[]') into roster from public.no_gov_members where team_id=t and status='active';
 item:=coalesce(prior,'{}')||jsonb_build_object('id',mid,'title','Giao hữu với '||opponent,'opponent',opponent,'matchType','friendly','modelVersion',2,'datetime',p_terms->'kickoff','endsAt',p_terms->'endsAt','deadline',case when prior is null or (prior->>'deadline')::timestamptz>=(p_terms->>'kickoff')::timestamptz then to_jsonb((p_terms->>'kickoff')::timestamptz-interval '1 hour') else prior->'deadline' end,'venue',p_terms->'venue','address',p_terms->'address','mapUrl',p_terms->'mapUrl','format',p_terms->'format','note',p_terms->'note','sourceOffer',o.id,'sharedConditionsVersion',p_version,'expectedPitch',coalesce((prior->>'expectedPitch')::bigint,0),'expectedOther',coalesce((prior->>'expectedOther')::bigint,0),'paymentPlan',coalesce(prior->>'paymentPlan','mixed'));
 if prior is null then item:=item||jsonb_build_object('status','upcoming','expectedPitch',0,'expectedOther',0,'paymentPlan','mixed','penaltyEnabled',false,'penaltyAmount','0 đ','createdAt',clock_timestamp(),'eligibleMembers',roster,'eligibleMemberIds',(select coalesce(jsonb_agg(v->'id'),'[]') from jsonb_array_elements(roster) v));end if;
 insert into public.no_gov_matches(team_id,id,title,kickoff,attendance_deadline) values(t,mid,item->>'title',(p_terms->>'kickoff')::timestamptz,(item->>'deadline')::timestamptz) on conflict(team_id,id) do update set title=excluded.title,kickoff=excluded.kickoff,attendance_deadline=excluded.attendance_deadline;
 update public.no_app_workspaces set revision=revision+1,data=jsonb_set(data,'{matches}',(select coalesce(jsonb_agg(m),'[]') from jsonb_array_elements(data->'matches') m where m->>'id'<>mid)||jsonb_build_array(item)) where team_id=t;
 end loop;
 insert into public.no_mm_links(offer_id,challenge_id,home_team,away_team,home_match,away_match,version) values(o.id,c.id,o.team_id,c.team_id,coalesce(o.source_match,'mm-'||o.id),'mm-'||o.id,p_version) on conflict(offer_id) do update set version=excluded.version;
end$$;

create function public.no_mm_action(p_team text,p_action text,p_payload jsonb default '{}',p_key uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare me public.no_gov_members;o public.no_pro_offers;c public.no_pro_challenges;l public.no_mm_links;receipt public.no_mm_receipts;
 terms jsonb;res jsonb;v integer;oid uuid;cid uuid;target text;mid text;other text;reason text;asset public.no_mm_assets;ent jsonb;row_record record;old_guard text;
begin
 if p_action='state' then return public.no_mm_state(p_team);end if;
 if auth.uid() is null then raise exception 'Đăng nhập để đại diện đội.' using errcode='42501';end if;
 if jsonb_typeof(p_payload) is distinct from 'object' or length(p_payload::text)>24000 or p_key is null then raise exception 'Thiếu dữ liệu hoặc mã chống trùng.';end if;
 -- Serialize decisions before locking both team workspaces in deterministic order.
 perform pg_advisory_xact_lock(hashtext('no-mm-decision-v1'));
 select * into me from public.no_gov_members where team_id=p_team and user_id=auth.uid() and (status='active' or (status='locked' and locked_until<=clock_timestamp()));
 if not found or exists(select 1 from public.no_gov_teams where id=p_team and dissolved_at is not null) then raise exception 'Bạn không còn là thành viên hoạt động của đội.' using errcode='42501';end if;
 if me.role not in ('owner','admin') and not (p_action='asset_save' and p_payload->>'kind'='filters') and p_action<>'asset_use' then raise exception 'Chỉ Chủ đội hoặc người quản lý trận được đại diện đội.' using errcode='42501';end if;
 select * into receipt from public.no_mm_receipts where team_id=p_team and actor=auth.uid() and request_key=p_key;
 if found then if receipt.action<>p_action or receipt.payload<>p_payload then raise exception 'Mã thao tác đã dùng cho dữ liệu khác.';end if;return receipt.result;end if;
 if (select count(*) from public.no_mm_events where team_id=p_team and actor=auth.uid() and created_at>clock_timestamp()-interval '1 minute' and action=p_action)>=(case p_action when 'message' then 30 when 'publish' then 6 else 12 end) then raise exception 'Thao tác quá nhanh; vui lòng thử lại sau một phút.';end if;
 oid:=nullif(p_payload->>'offerId','')::uuid;cid:=nullif(p_payload->>'proposalId','')::uuid;
 if cid is not null then select * into c from public.no_pro_challenges where id=cid;oid:=c.offer_id;end if;
 if oid is not null then select * into o from public.no_pro_offers where id=oid;end if;
 if p_action not in ('publish','asset_save','asset_use') and (o.id is null or (p_team<>o.team_id and (c.id is null or c.team_id<>p_team) and p_action<>'propose')) then raise exception 'Không có quyền với lời mời này.' using errcode='42501';end if;
 if c.id is not null then
 perform 1 from public.no_gov_teams where id in(o.team_id,c.team_id) and dissolved_at is null order by id for update;
 if (select count(*) from public.no_gov_teams where id in(o.team_id,c.team_id) and dissolved_at is null)<>2 then raise exception 'Một trong hai đội không còn hoạt động.';end if;
 perform 1 from public.no_app_workspaces where team_id in(o.team_id,c.team_id) order by team_id for update;
 else perform 1 from public.no_gov_teams where id=p_team for update;end if;
 if p_action in ('message','terms','confirm') and o.status in ('open','confirming') and o.expires_at<=clock_timestamp() and not exists(select 1 from public.no_mm_links linked_row where linked_row.challenge_id=c.id) then raise exception 'Tin đã hết hạn; tạo lời mời mới thay vì chốt điều kiện cũ.';end if;
 case p_action
 when 'publish' then
 if p_payload->>'templateId' is not null or p_payload->>'familiarId' is not null then
 ent:=public.no_mm_entitlement(p_team);
 select * into asset from public.no_mm_assets where id=coalesce(p_payload->>'templateId',p_payload->>'familiarId')::uuid and team_id=p_team and kind=case when p_payload->>'templateId' is not null then 'templates' else 'opponents' end;
 if asset.id is null or ent->>'enabled'<>'true' or not (ent->'features') ? asset.kind then raise exception 'Mẫu/đối thủ quen cần quyền Pro còn hiệu lực.';end if;
 end if;
 terms:=public.no_mm_conditions(p_payload->'conditions');mid:=nullif(p_payload->>'sourceMatch','');
 if mid is not null and not exists(select 1 from public.no_app_workspaces w cross join jsonb_array_elements(w.data->'matches') m where w.team_id=p_team and m->>'id'=mid and coalesce(m->>'status','upcoming')='upcoming' and m->>'archivedAt' is null and m->>'cancelledAt' is null and m->>'sourceOffer' is null and (m->>'datetime')::timestamptz>clock_timestamp()) then raise exception 'Chọn trận sắp tới chưa liên kết tìm đối của đội.';end if;
 if public.no_mm_conflict(p_team,terms,null,mid) and coalesce(p_payload->>'allowConflict','false')<>'true' then raise exception 'Lịch bị chồng lấn với tin hoặc trận của đội. Kiểm tra và xác nhận cảnh báo trước khi tiếp tục.';end if;
 insert into public.no_pro_offers(team_id,district,level,kickoff,ends_at,expires_at,venue,format,finance,actor,conditions,source_match) values(p_team,terms->>'district',terms->>'level',(terms->>'kickoff')::timestamptz,(terms->>'endsAt')::timestamptz,(terms->>'expiresAt')::timestamptz,terms->>'venue',(terms->>'format')::integer,'split',auth.uid(),terms,mid) returning id into oid;
 if asset.kind='opponents' then perform public.no_mm_notice(asset.data->>'teamId','mm-invite:'||p_key,'Có lời mời giao hữu mới',(select name from public.no_gov_teams where id=p_team)||' mời đội xem tin tìm đối. Trận chỉ được chốt khi hai bên xác nhận.',oid,null);end if;
 when 'propose' then
 if o.team_id=p_team then raise exception 'Không gửi đề nghị đến tin của đội mình.';end if;
 if o.status<>'open' or o.expires_at<=clock_timestamp() or o.kickoff<=clock_timestamp() then raise exception 'Tin không còn nhận đề nghị.';end if;
 select * into c from public.no_pro_challenges where offer_id=oid and team_id=p_team;
 if c.id is not null and c.status not in ('withdrawn','declined') then raise exception 'Đội đã có một đề nghị cho tin này.';end if;
 insert into public.no_pro_challenges(offer_id,team_id) values(oid,p_team) on conflict(offer_id,team_id) do update set status='pending',closed_reason=null returning * into c;
 cid:=c.id;v:=c.current_version+1;
 insert into public.no_mm_terms(challenge_id,version,conditions,actor,actor_team) values(cid,v,o.conditions,auth.uid(),p_team);
 update public.no_pro_challenges set current_version=v where id=cid;
 perform public.no_mm_notice(o.team_id,'mm-proposal:'||p_key,'Có đề nghị giao hữu mới',(select name from public.no_gov_teams where id=p_team)||' gửi đề nghị. Mở Tìm đối để trao đổi.',oid,cid);
 when 'message' then
 if c.status not in ('pending','discussing','confirming','accepted') then raise exception 'Cuộc trao đổi đã đóng; lịch sử vẫn được giữ.';end if;
 if length(trim(coalesce(p_payload->>'body',''))) not between 1 and 2000 then raise exception 'Tin nhắn từ 1 đến 2000 ký tự.';end if;
 insert into public.no_mm_messages(challenge_id,team_id,actor,body) values(cid,p_team,auth.uid(),trim(p_payload->>'body'));
 update public.no_pro_challenges set status='discussing' where id=cid and status='pending';
 perform public.no_mm_notice(case when p_team=o.team_id then c.team_id else o.team_id end,'mm-message:'||p_key,'Có phản hồi tìm đối',(select name from public.no_gov_teams where id=p_team)||' đã phản hồi trong trao đổi giao hữu.',oid,cid);
 when 'terms' then
 if c.status not in ('pending','discussing','confirming','accepted') or o.status not in ('open','confirming','matched') then raise exception 'Không thể sửa điều kiện của đề nghị đã đóng.';end if;
 if exists(select 1 from public.no_mm_links x where x.offer_id=oid and (x.challenge_id<>cid or x.cancelled_at is not null)) then raise exception 'Tin đã chốt với đối khác hoặc đã hủy.';end if;
 if (p_payload->>'version')::integer is distinct from c.current_version then raise exception 'Điều kiện đã thay đổi; tải lại phiên bản mới.';end if;
 terms:=public.no_mm_conditions(p_payload->'conditions');v:=c.current_version+1;
 insert into public.no_mm_terms(challenge_id,version,conditions,actor,actor_team) values(cid,v,terms,auth.uid(),p_team);
 update public.no_pro_challenges set current_version=v,status='confirming' where id=cid;
 update public.no_pro_offers set status='confirming',expires_at=(terms->>'expiresAt')::timestamptz where id=oid;
 foreach target in array array[o.team_id,c.team_id] loop perform public.no_mm_notice(target,'mm-terms:'||p_key,'Cần xác nhận điều kiện mới',(select name from public.no_gov_teams where id=p_team)||' cập nhật điều kiện v'||v||'. Cả hai đội cần xác nhận lại.',oid,cid);end loop;
 when 'confirm' then
 if c.status not in ('pending','discussing','confirming') or o.status not in ('open','confirming','matched') then raise exception 'Đề nghị không còn chờ xác nhận.';end if;
 if (p_payload->>'version')::integer is distinct from c.current_version then raise exception 'Điều kiện đã thay đổi; tải lại phiên bản mới.';end if;
 select conditions into terms from public.no_mm_terms where challenge_id=cid and version=c.current_version;
 if terms is null or (terms->>'expiresAt')::timestamptz<=clock_timestamp() or (terms->>'kickoff')::timestamptz<=clock_timestamp() then raise exception 'Điều kiện đã hết hạn; thống nhất lại giờ trước khi chốt.';end if;
 select * into l from public.no_mm_links where offer_id=oid;
 if l.offer_id is not null and (l.challenge_id<>cid or l.cancelled_at is not null) then raise exception 'Tin đã chốt với đối khác hoặc đã hủy.';end if;
 if not exists(select 1 from public.no_gov_members where team_id=case when p_team=o.team_id then c.team_id else o.team_id end and role in ('owner','admin') and status='active') then raise exception 'Đội bên kia chưa có đại diện hoạt động.';end if;
 mid:=case when p_team=o.team_id then coalesce(l.home_match,o.source_match) else l.away_match end;
 if public.no_mm_conflict(p_team,terms,oid,mid) and coalesce(p_payload->>'allowConflict','false')<>'true' then raise exception 'Lịch bị chồng lấn; kiểm tra và xác nhận cảnh báo trước khi tiếp tục.';end if;
 insert into public.no_mm_confirmations(challenge_id,version,team_id,actor,allow_conflict) values(cid,c.current_version,p_team,auth.uid(),coalesce((p_payload->>'allowConflict')::boolean,false)) on conflict do nothing;
 if (select count(*) from public.no_mm_confirmations where challenge_id=cid and version=c.current_version)=2 then
 for row_record in select * from public.no_mm_confirmations where challenge_id=cid and version=c.current_version loop
 mid:=case when row_record.team_id=o.team_id then coalesce(l.home_match,o.source_match) else l.away_match end;
 if public.no_mm_conflict(row_record.team_id,terms,oid,mid) and not row_record.allow_conflict then raise exception 'Lịch một đội vừa thay đổi và bị chồng lấn; cần xác nhận lại cảnh báo.';end if;
 if not exists(select 1 from public.no_gov_members where team_id=row_record.team_id and user_id=row_record.actor and role in ('owner','admin') and (status='active' or(status='locked' and locked_until<=clock_timestamp()))) then raise exception 'Đại diện đã xác nhận không còn quyền; cần quản trị viên xác nhận lại điều kiện mới.';end if;
 end loop;
 old_guard:=current_setting('no.mm_sync',true);perform set_config('no.mm_sync','yes',true);
 perform public.no_mm_link_matches(oid,cid,terms,c.current_version);perform set_config('no.mm_sync',coalesce(old_guard,''),true);
 update public.no_pro_offers set status='matched',conditions=terms,kickoff=(terms->>'kickoff')::timestamptz,ends_at=(terms->>'endsAt')::timestamptz,expires_at=(terms->>'expiresAt')::timestamptz,venue=terms->>'venue',district=terms->>'district',format=(terms->>'format')::integer,level=terms->>'level' where id=oid;
 update public.no_pro_challenges set status='accepted' where id=cid;
 for row_record in select * from public.no_pro_challenges where offer_id=oid and id<>cid and status in ('pending','discussing','confirming') loop
 update public.no_pro_challenges set status='closed',closed_reason='Tin đã chốt với đội khác' where id=row_record.id;
 perform public.no_mm_notice(row_record.team_id,'mm-closed:'||p_key,'Đề nghị giao hữu đã đóng','Tin đã chốt với đội khác. Lịch sử trao đổi được giữ.',oid,row_record.id);end loop;
 foreach target in array array[o.team_id,c.team_id] loop perform public.no_mm_notice(target,'mm-matched:'||p_key,'Hai đội đã chốt giao hữu','Điều kiện v'||c.current_version||' đã được cả hai đội xác nhận. Trận đã liên kết vào lịch riêng của mỗi đội.',oid,cid);end loop;
 else
 update public.no_pro_challenges set status='confirming' where id=cid;update public.no_pro_offers set status='confirming' where id=oid;
 perform public.no_mm_notice(case when p_team=o.team_id then c.team_id else o.team_id end,'mm-confirm:'||p_key,'Cần xác nhận giao hữu',(select name from public.no_gov_teams where id=p_team)||' đã xác nhận điều kiện v'||c.current_version||'.',oid,cid);
 end if;
 when 'withdraw','decline' then
 if (p_action='withdraw' and c.team_id<>p_team) or (p_action='decline' and o.team_id<>p_team) or c.status not in ('pending','discussing','confirming') or exists(select 1 from public.no_mm_links where challenge_id=cid) then raise exception 'Không thể rút/từ chối đề nghị đã chốt.';end if;
 reason:=trim(coalesce(p_payload->>'reason',''));if length(reason) not between 3 and 1000 then raise exception 'Nhập lý do từ 3 đến 1000 ký tự.';end if;
 update public.no_pro_challenges set status=case p_action when 'withdraw' then 'withdrawn' else 'declined' end,closed_reason=reason where id=cid;
 if o.status='confirming' and not exists(select 1 from public.no_pro_challenges where offer_id=oid and status='confirming') then update public.no_pro_offers set status='open' where id=oid;end if;
 perform public.no_mm_notice(case when p_team=o.team_id then c.team_id else o.team_id end,'mm-decision:'||p_key,'Đề nghị giao hữu đã đóng',(select name from public.no_gov_teams where id=p_team)||' đã '||case p_action when 'withdraw' then 'rút đề nghị.' else 'từ chối đề nghị.' end,oid,cid);
 when 'cancel' then
 select * into l from public.no_mm_links where offer_id=oid;
 if l.offer_id is null and o.team_id<>p_team then raise exception 'Chỉ đội đăng được hủy tin chưa chốt.';end if;
 if o.status in ('closed','cancelled','expired') then raise exception 'Tin đã đóng.';end if;
 reason:=trim(coalesce(p_payload->>'reason',''));if length(reason) not between 3 and 1000 then raise exception 'Nhập lý do hủy từ 3 đến 1000 ký tự.';end if;
 old_guard:=current_setting('no.mm_sync',true);perform set_config('no.mm_sync','yes',true);
 if l.offer_id is not null then
 foreach target in array array[l.home_team,l.away_team] loop
 mid:=case when target=l.home_team then l.home_match else l.away_match end;
 if exists(select 1 from public.no_app_workspaces w cross join jsonb_array_elements(w.data->'matches') m where w.team_id=target and m->>'id'=mid and m->>'status'='completed') then raise exception 'Trận đã có đội xác nhận kết thúc; giữ lịch sử, không hủy bằng thao tác này.';end if;
 update public.no_app_workspaces set revision=revision+1,data=jsonb_set(data,'{matches}',(select jsonb_agg(case when m->>'id'=mid then m||jsonb_build_object('cancelledAt',clock_timestamp(),'cancelReason',reason,'cancelledBy',auth.uid()) else m end) from jsonb_array_elements(data->'matches') m)) where team_id=target;
 update public.no_gov_matches set archived_at=clock_timestamp() where team_id=target and id=mid;
 end loop;
 update public.no_mm_links set cancelled_at=clock_timestamp(),cancelled_by=auth.uid(),cancelled_team=p_team,cancel_reason=reason where offer_id=oid;
 end if;
 perform set_config('no.mm_sync',coalesce(old_guard,''),true);
 update public.no_pro_offers set status='cancelled' where id=oid;
 for row_record in select * from public.no_pro_challenges where offer_id=oid and status in ('pending','discussing','confirming','accepted') loop
 update public.no_pro_challenges set status='closed',closed_reason=reason where id=row_record.id;
 foreach target in array array[o.team_id,row_record.team_id] loop perform public.no_mm_notice(target,'mm-cancel:'||p_key,'Giao hữu đã hủy',(select name from public.no_gov_teams where id=p_team)||' hủy: '||reason,oid,row_record.id);end loop;
 end loop;
 when 'report' then
 select * into l from public.no_mm_links where challenge_id=cid;
 if l.offer_id is null or l.cancelled_at is not null then raise exception 'Chỉ báo cáo trận giao hữu đã chốt, chưa hủy.';end if;
 mid:=case when p_team=l.home_team then l.home_match else l.away_match end;
 if not exists(select 1 from public.no_app_workspaces w cross join jsonb_array_elements(w.data->'matches') m where w.team_id=p_team and m->>'id'=mid and m->>'status'='completed') then raise exception 'Xác nhận kết thúc trận trong module Trận đấu trước khi báo cáo.';end if;
 if p_payload->>'played' is distinct from 'true' or (p_payload->>'home')::numeric<>trunc((p_payload->>'home')::numeric) or (p_payload->>'away')::numeric<>trunc((p_payload->>'away')::numeric) then raise exception 'Xác nhận đã thi đấu và nhập tỷ số nguyên.';end if;
 insert into public.no_mm_reports(offer_id,team_id,home,away,played,actor) values(oid,p_team,(p_payload->>'home')::integer,(p_payload->>'away')::integer,true,auth.uid()) on conflict(offer_id,team_id) do update set home=excluded.home,away=excluded.away,played=true,actor=excluded.actor,created_at=clock_timestamp();
 perform public.no_mm_notice(case when p_team=o.team_id then c.team_id else o.team_id end,'mm-report:'||p_key,'Có báo cáo kết quả giao hữu',(select name from public.no_gov_teams where id=p_team)||' đã báo cáo kết quả. Kiểm tra và xác nhận độc lập.',oid,cid);
 when 'asset_use' then
 select * into asset from public.no_mm_assets where id=(p_payload->>'assetId')::uuid and team_id=p_team and (kind='filters' and owner_id=auth.uid() or kind<>'filters' and me.role in ('owner','admin'));
 ent:=public.no_mm_entitlement(p_team);
 if asset.id is null or ent->>'enabled'<>'true' or not (ent->'features') ? asset.kind then raise exception 'Tiện ích cần quyền Pro còn hiệu lực của đội.' using errcode='42501';end if;
 when 'asset_save' then
 ent:=public.no_mm_entitlement(p_team);
 if ent->>'enabled'<>'true' or not (ent->'features') ? (p_payload->>'kind') then raise exception 'Tiện ích cần quyền Pro còn hiệu lực của đội. Dữ liệu đã lưu vẫn xem được.' using errcode='42501';end if;
 if p_payload->>'kind' not in ('templates','filters','opponents') or length(trim(coalesce(p_payload->>'name',''))) not between 1 and 80 then raise exception 'Tên tiện ích không hợp lệ.';end if;
 if p_payload->>'kind'='templates' then
 select * into o from public.no_pro_offers where id=oid and team_id=p_team;if o.id is null then raise exception 'Chỉ lưu mẫu từ tin của đội.';end if;
 terms:=o.conditions-array['kickoff','endsAt','expiresAt'];
 elsif p_payload->>'kind'='filters' then
 select coalesce(jsonb_object_agg(key,value),'{}') into terms from jsonb_each(coalesce(p_payload->'data','{}')) where key in ('district','day','from','to','format','venueStatus','level','maxCost');
 if exists(select 1 from jsonb_each(terms) where jsonb_typeof(value) not in ('string','number') or (key not in ('format','maxCost') and jsonb_typeof(value)<>'string') or length(value#>>'{}')>80) or (coalesce(terms->>'day','')<>'' and terms->>'day' !~ '^\d{4}-\d{2}-\d{2}$') or (coalesce(terms->>'from','')<>'' and terms->>'from' !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$') or (coalesce(terms->>'to','')<>'' and terms->>'to' !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$') or (coalesce(terms->>'format','')<>'' and terms->>'format' not in ('5','7','11')) then raise exception 'Bộ lọc đã lưu không hợp lệ.';end if;
 else
 if p_payload->>'opponentId'=p_team or not exists(select 1 from public.no_gov_teams where id=p_payload->>'opponentId' and dissolved_at is null) or length(coalesce(p_payload->>'note',''))>2000 then raise exception 'Đối thủ hoặc ghi chú không hợp lệ.';end if;
 terms:=jsonb_build_object('teamId',p_payload->>'opponentId','note',coalesce(p_payload->>'note',''));
 end if;
 mid:=p_payload->>'assetId';
 if mid is null and p_payload->>'kind'='opponents' then select id::text into mid from public.no_mm_assets where team_id=p_team and kind='opponents' and data->>'teamId'=p_payload->>'opponentId';end if;
 if mid is not null then
 select * into asset from public.no_mm_assets where id=mid::uuid and team_id=p_team and kind=p_payload->>'kind' and (kind<>'filters' or owner_id=auth.uid());
 if asset.id is null then raise exception 'Không có quyền sửa tiện ích này.' using errcode='42501';end if;
 update public.no_mm_assets set name=trim(p_payload->>'name'),data=terms,updated_at=clock_timestamp() where id=asset.id;
 else insert into public.no_mm_assets(team_id,kind,name,owner_id,data) values(p_team,p_payload->>'kind',trim(p_payload->>'name'),auth.uid(),terms);end if;
 else raise exception 'Thao tác Tìm đối không hỗ trợ.';
 end case;
 insert into public.no_mm_events(team_id,actor,action,offer_id,challenge_id,payload) values(p_team,auth.uid(),p_action,oid,cid,p_payload);
 insert into public.no_team_updates(team_id,version) values(p_team,1) on conflict(team_id) do update set version=no_team_updates.version+1;
 res:=jsonb_build_object('success',true,'offerId',oid,'proposalId',cid)||case when p_action='asset_use' then jsonb_build_object('asset',to_jsonb(asset)) else '{}'::jsonb end;
 insert into public.no_mm_receipts values(p_team,auth.uid(),p_key,p_action,p_payload,res);return res;
end$$;

-- Linked shared fields can only change after bilateral confirmation/cancellation.
create function public.no_mm_guard_match() returns trigger language plpgsql security definer set search_path='' as $$
declare l record;prior jsonb;next jsonb;begin
 if current_setting('no.mm_sync',true)='yes' then return new;end if;
 for l in select case when home_team=new.team_id then home_match else away_match end mid from public.no_mm_links where new.team_id in(home_team,away_team) loop
 select m into prior from jsonb_array_elements(old.data->'matches') m where m->>'id'=l.mid;
 select m into next from jsonb_array_elements(new.data->'matches') m where m->>'id'=l.mid;
 if next->>'status' is distinct from 'completed' and prior->'archivedAt' is distinct from next->'archivedAt' then raise exception 'Trận liên kết: kết thúc trận hoặc hủy qua đúng quy trình; không tự lưu trữ một phía.';end if;
 if next is null or (select jsonb_object_agg(key,value) from jsonb_each(prior) where key in ('datetime','endsAt','venue','address','mapUrl','format','opponent','sourceOffer','sharedConditionsVersion','cancelledAt','cancelReason')) is distinct from (select jsonb_object_agg(key,value) from jsonb_each(next) where key in ('datetime','endsAt','venue','address','mapUrl','format','opponent','sourceOffer','sharedConditionsVersion','cancelledAt','cancelReason')) then raise exception 'Trận liên kết: thay đổi điều kiện hoặc hủy trong Tìm đối để hai đội được cập nhật đúng.';end if;
 end loop;return new;
end$$;
create trigger no_mm_guard_match before update of data on public.no_app_workspaces for each row execute function public.no_mm_guard_match();
-- Retire the unilateral legacy write path; retain its read/other utility APIs.
alter function public.no_pro_action(text,text,jsonb,uuid) rename to no_pro_action_before_matchmaking;
revoke all on function public.no_pro_action_before_matchmaking(text,text,jsonb,uuid) from public,anon,authenticated;
create function public.no_pro_action(p_team text,p_action text,p_payload jsonb default '{}',p_key uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$begin
 if p_action in ('offer','challenge','close-offer','accept','decline') then raise exception 'Mở Tìm đối để sử dụng quy trình xác nhận hai đội.';end if;
 return public.no_pro_action_before_matchmaking(p_team,p_action,p_payload,p_key);end$$;

create function public.no_mm_admin_entitlement(p_team text,p_until timestamptz,p_source text) returns jsonb language plpgsql security definer set search_path='' as $$begin
 if p_until is null or p_source is null or p_until<=clock_timestamp() or p_until>clock_timestamp()+interval '366 days' or length(trim(p_source))<3 then raise exception 'Cần hạn thử nghiệm tương lai trong 366 ngày và nguồn cấp rõ ràng.';end if;
 insert into public.no_team_entitlements(team_id,plan,status,starts_at,ends_at,source) values(p_team,'pro','active',clock_timestamp(),p_until,p_source) on conflict(team_id) do update set plan='pro',status='active',starts_at=excluded.starts_at,ends_at=excluded.ends_at,source=excluded.source,updated_at=clock_timestamp();
 return jsonb_build_object('success',true,'teamId',p_team,'endsAt',p_until);end$$;
revoke all on function public.no_mm_entitlement(text),public.no_mm_conditions(jsonb),public.no_mm_conflict(text,jsonb,uuid,text),public.no_mm_notice(text,text,text,text,uuid,uuid),public.no_mm_link_matches(uuid,uuid,jsonb,integer),public.no_mm_guard_match(),public.no_mm_admin_entitlement(text,timestamptz,text),public.no_mm_state(text),public.no_mm_action(text,text,jsonb,uuid),public.no_pro_action(text,text,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.no_mm_admin_entitlement(text,timestamptz,text) to service_role;
grant execute on function public.no_mm_state(text) to anon,authenticated;
grant execute on function public.no_mm_action(text,text,jsonb,uuid),public.no_pro_action(text,text,jsonb,uuid) to authenticated;
-- Reuse existing push preferences, private previews, leases and deduplication.
-- Only route matchmaking notices to their authorized offer/proposal screen.
do $$declare definition text;previous text;begin
 definition:=pg_get_functiondef('public.no_push_claim(integer)'::regprocedure);previous:=definition;
 definition:=replace(definition,$old$case when j.notice_id is not null and n->>'kind'='late-request' then 'dashboard'$old$,$new$case when j.notice_id is not null and n->>'kind'='matchmaking' then 'pro' when j.notice_id is not null and n->>'kind'='late-request' then 'dashboard'$new$);
 if previous=definition then raise exception 'Unexpected push routing definition; review before migration.';end if;previous:=definition;
 definition:=replace(definition,$old$end||case when j.notice_id is not null and n->>'kind'='late-request' then '&match='$old$,$new$end||case when j.notice_id is not null and n->>'kind'='matchmaking' then '&offer='||(n->>'offerId')||coalesce('&proposal='||nullif(n->>'proposalId',''),'') when j.notice_id is not null and n->>'kind'='late-request' then '&match='$new$);
 if previous=definition then raise exception 'Unexpected push target definition; review before migration.';end if;
 execute definition;
end$$;
notify pgrst,'reload schema';
commit;
