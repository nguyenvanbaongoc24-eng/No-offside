// Protected operator CLI. Never bundle into the frontend or expose an HTTP route.
// Environment: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY).
import {createClient} from '@supabase/supabase-js';
const [team,until,source]=process.argv.slice(2);
if(!team||!until||!source||!Number.isFinite(Date.parse(until)))throw Error('Usage: node scripts/grant-team-pro.mjs TEAM_ID ISO_EXPIRY SOURCE');
if(!process.env.SUPABASE_URL||!(process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY))throw Error('Cần môi trường quản trị có khóa server. Không dùng khóa frontend.');
const client=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const {data,error}=await client.rpc('no_mm_admin_entitlement',{p_team:team,p_until:until,p_source:source});
if(error)throw Error(error.message);console.log(JSON.stringify(data));
