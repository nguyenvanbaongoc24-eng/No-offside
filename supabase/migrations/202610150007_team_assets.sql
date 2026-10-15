-- Private team QR objects are accessed only through authenticated server-signed URLs.
begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('team_assets','team_assets',false,1048576,array['image/png','image/jpeg','image/webp']) on conflict(id) do update set public=false,file_size_limit=1048576,allowed_mime_types=excluded.allowed_mime_types;
create or replace function public.no_app_settings(p_team_id text,p_updates jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare m public.no_gov_members; entry record; w public.no_app_workspaces;
begin
 perform 1 from public.no_gov_teams where id=p_team_id for update;
 select * into m from public.no_gov_members where team_id=p_team_id and user_id=auth.uid() and (status='active' or (status='locked' and locked_until<=clock_timestamp()));
 if not found or m.role not in ('owner','admin') then raise exception 'Không có quyền sửa cài đặt đội.' using errcode='42501'; end if;
 select * into w from public.no_app_workspaces where team_id=p_team_id for update;
 for entry in select * from jsonb_each(p_updates) loop
  if entry.key not in ('teamName','venue','teamCategory','logo','treasurerQr','appearance','schedule') or (m.role<>'owner' and entry.key<>'treasurerQr') then raise exception 'Trường cài đặt không được phép.' using errcode='42501'; end if;
 end loop;
 if p_updates ? 'teamName' then
  if length(trim(p_updates->>'teamName'))<2 then raise exception 'Tên đội phải có ít nhất 2 ký tự.'; end if;
  update public.no_gov_teams set name=trim(p_updates->>'teamName') where id=p_team_id;
 end if;
 update public.no_gov_teams set logo=coalesce(p_updates->>'logo',logo),category=coalesce(p_updates->>'teamCategory',category),venue=coalesce(p_updates->>'venue',venue) where id=p_team_id;
 if p_updates ? 'treasurerQr' then
  if jsonb_typeof(p_updates->'treasurerQr')<>'object' or coalesce(p_updates->'treasurerQr'->>'bankCode','') !~ '^[0-9]{6}$' or coalesce(p_updates->'treasurerQr'->>'accountNumber','') !~ '^[0-9]{6,25}$' or length(trim(coalesce(p_updates->'treasurerQr'->>'accountHolder','')))<2 or coalesce(p_updates->'treasurerQr'->>'qrMode','generated') not in ('generated','uploaded') then raise exception 'Thông tin tài khoản nhận quỹ không hợp lệ.'; end if;
  if coalesce(p_updates->'treasurerQr'->>'uploadedQrPath','')<>'' and (p_updates->'treasurerQr'->>'uploadedQrPath' not like p_team_id || '/qr/%' or p_updates->'treasurerQr'->>'uploadedQrPath' like '%..%') then raise exception 'Ảnh QR không thuộc đội này.' using errcode='42501'; end if;
  if coalesce(p_updates->'treasurerQr'->>'uploadedQrPath','')<>'' and not exists(select 1 from storage.objects where bucket_id='team_assets' and name=p_updates->'treasurerQr'->>'uploadedQrPath') then raise exception 'QR upload has not been acknowledged by Storage.' using errcode='22023'; end if;
  if p_updates->'treasurerQr'->>'qrMode'='uploaded' and coalesce(p_updates->'treasurerQr'->>'uploadedQrPath','')='' then raise exception 'Tải ảnh QR lên trước khi lưu.'; end if;
  p_updates:=jsonb_set(p_updates,'{treasurerQr}',(select jsonb_object_agg(key,value) from jsonb_each(p_updates->'treasurerQr') where key in ('bankName','bankCode','accountNumber','accountHolder','qrMode','uploadedQrPath')),true);
 end if;
 update public.no_app_workspaces set settings=settings || p_updates,revision=revision+1,updated_at=clock_timestamp() where team_id=p_team_id;
 insert into public.no_app_receipts(team_id,actor,request_key,revision,before_value,after_value) values(p_team_id,auth.uid(),gen_random_uuid(),w.revision+1,w.settings,w.settings || p_updates);
 return public.no_app_snapshot(p_team_id);
end $$;
revoke all on function public.no_app_settings(text,jsonb) from public,anon;
grant execute on function public.no_app_settings(text,jsonb) to authenticated;
commit;
