import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Primary values — hardcoded so the app ALWAYS works regardless of .env
const SUPABASE_URL  = "https://ruaetazbdirymbloghzn.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1YWV0YXpiZGlyeW1ibG9naHpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMTM0NzcsImV4cCI6MjA4ODc4OTQ3N30.slGezrKK6jIs4ZOEksDEy64qzPm-MN2ykG5yQLZkU9I";

// Main client — used for auth + admin writes (carries session token)
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Public client — always uses anon key, no auth headers
// Used for public reads (rooms, reviews) so RLS "USING (true)" always works
// even before the user's session is fully resolved
export const publicSupabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON, {
  auth: { persistSession: false, autoRefreshToken: false },
});
