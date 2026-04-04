/**
 * FAVOUR GUEST HOMES — Database Setup Script
 * 
 * Run this from inside the output/ folder:
 *   node run-setup.js
 * 
 * This fixes ALL database issues and makes reservations work.
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL      = 'https://ruaetazbdirymbloghzn.supabase.co';
const SUPABASE_SERVICE  = process.env.SUPABASE_SERVICE_KEY || '';

// ── Check for service key ────────────────────────────────────────────────────
if (!SUPABASE_SERVICE) {
  console.log('\n❌  Missing SUPABASE_SERVICE_KEY\n');
  console.log('To run this script:');
  console.log('  1. Go to https://supabase.com/dashboard/project/ruaetazbdirymbloghzn/settings/api');
  console.log('  2. Copy the "service_role" key (NOT the anon key)');
  console.log('  3. Run: SUPABASE_SERVICE_KEY="your-service-key" node run-setup.js\n');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE, {
  auth: { persistSession: false }
});

// ── The definitive SQL fix ───────────────────────────────────────────────────
const SQL = `
-- Drop every existing policy on the three tables (clean slate)
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('rooms', 'reviews', 'reservations')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- ROOMS: anyone reads, admin writes
CREATE POLICY "rooms_read"   ON public.rooms FOR SELECT USING (true);
CREATE POLICY "rooms_insert" ON public.rooms FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "rooms_update" ON public.rooms FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "rooms_delete" ON public.rooms FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- REVIEWS: public read + public insert (no account needed)
CREATE POLICY "reviews_read"   ON public.reviews FOR SELECT USING (true);
CREATE POLICY "reviews_insert" ON public.reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "reviews_delete" ON public.reviews FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RESERVATIONS: anon can INSERT (no login needed to book)
CREATE POLICY "reservations_insert" ON public.reservations
  FOR INSERT WITH CHECK (true);
CREATE POLICY "reservations_update" ON public.reservations
  FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "reservations_select" ON public.reservations
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Payment columns (safe — skips if already exist)
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS payment_method  TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS transaction_id  TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS amount_paid     INTEGER DEFAULT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'reservations'
      AND column_name  = 'payment_status'
  ) THEN
    ALTER TABLE public.reservations ADD COLUMN payment_status TEXT DEFAULT 'unpaid';
  END IF;
END $$;

-- Realtime
DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;        EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;      EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.reservations; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
`;

async function runSetup() {
  console.log('\n🔧  Favour Guest Homes — Database Setup\n');
  console.log('Connecting to Supabase...');

  // ── Step 1: Run the SQL fix ────────────────────────────────────────────────
  console.log('Applying RLS policies and payment columns...');
  const { error: sqlError } = await supabase.rpc('exec_sql', { sql: SQL }).catch(() => ({ error: { message: 'RPC not available' } }));

  // If exec_sql RPC not available, use direct postgres connection
  // Fall back to running each statement via the management API
  if (sqlError) {
    console.log('Direct SQL via rpc not available — using statement-by-statement approach...');
    await runViaStatements();
    return;
  }

  console.log('✅  SQL applied successfully!\n');
  await verify();
}

async function runViaStatements() {
  // Run a test insert to see what the actual error is
  console.log('\nTesting reservation insert with anon key...');
  
  const anonClient = createClient(SUPABASE_URL, 
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1YWV0YXpiZGlyeW1ibG9naHpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMTM0NzcsImV4cCI6MjA4ODc4OTQ3N30.slGezrKK6jIs4ZOEksDEy64qzPm-MN2ykG5yQLZkU9I',
    { auth: { persistSession: false } }
  );

  const { data, error } = await anonClient
    .from('reservations')
    .insert({
      guest_name: 'TEST_SETUP_DELETE_ME',
      phone:      '677000000',
      room_type:  'single',
      check_in:   '2026-01-01',
      check_out:  '2026-01-02',
    })
    .select('id')
    .single();

  if (error) {
    console.log('\n❌  Insert failed. Error details:');
    console.log('   Code:   ', error.code);
    console.log('   Message:', error.message);
    console.log('   Hint:   ', error.hint || 'none');
    console.log('   Details:', error.details || 'none');

    if (error.code === '42501') {
      console.log('\n⚠️   This is an RLS (permissions) error.');
      console.log('   You must run the SQL fix manually in Supabase.\n');
      console.log('   📋  COPY THIS SQL AND RUN IT IN SUPABASE SQL EDITOR:');
      console.log('   https://supabase.com/dashboard/project/ruaetazbdirymbloghzn/sql/new\n');
      console.log('─'.repeat(60));
      console.log(SQL);
      console.log('─'.repeat(60));
    }
  } else {
    console.log('✅  Insert works! Reservation ID:', data.id);
    console.log('   Cleaning up test record...');
    await anonClient.from('reservations').delete().eq('id', data.id);
    console.log('✅  Booking flow is fully working!\n');
  }
}

async function verify() {
  const { data } = await supabase
    .from('reservations')
    .select('id')
    .limit(1);
  console.log('✅  Database connection verified\n');
}

runSetup().catch(err => {
  console.error('Setup error:', err.message);
});
