import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
export const owner='00000000-0000-4000-8000-000000000001',member='00000000-0000-4000-8000-000000000002',outsider='00000000-0000-4000-8000-000000000003';
export async function createMasterDb(){
 const db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb,phone text);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(bucket_id text,name text);
 insert into auth.users(id,email) values('${owner}','owner@example.test'),('${member}','member@example.test'),('${outsider}','other@example.test');`);
 for(const file of ['202610130001_governance.sql','202610130002_profiles_and_teams.sql','202610130003_team_invites.sql','202610150001_team_chat.sql','202610150002_durable_workspace.sql','202610150003_invite_security.sql','202610150004_members.sql','202610150005_chat_legacy.sql','202610150006_funds_notifications.sql','202610150007_team_assets.sql','202610150008_legacy_and_membership.sql','202610150009_manual_profile_privacy.sql','202610150010_restore_missing_own_profile.sql'])await db.exec(await readFile(new URL('../../supabase/migrations/'+file,import.meta.url),'utf8'));
 await db.exec(`insert into public.profiles(id,full_name,email) select id,split_part(email,'@',1),email from auth.users on conflict do nothing;`);
 return db;
}
export async function asUser(db,id){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id || '']);await db.exec('set role '+(id ? 'authenticated' : 'anon'));}
export async function rpc(db,name,args){const values=args.map((_,i)=>'$'+(i+1)).join(',');return (await db.query('select public.'+name+'('+values+') as result',args)).rows[0].result;}
