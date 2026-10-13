import { createClient } from '@supabase/supabase-js';
const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {};
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY;
export const supabase = url && key && !key.includes('your-') ? createClient(url, key) : null;
