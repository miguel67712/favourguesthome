-- ==============================================================
-- DEFINITIVE FIX — paste ALL of this in Supabase SQL Editor
-- ==============================================================

-- 1. Drop every policy that accumulated from all previous migrations
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

-- 2. ROOMS
CREATE POLICY "rooms_select" ON public.rooms FOR SELECT USING (true);
CREATE POLICY "rooms_insert" ON public.rooms FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "rooms_update" ON public.rooms FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "rooms_delete" ON public.rooms FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- 3. REVIEWS
CREATE POLICY "reviews_select" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "reviews_insert" ON public.reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "reviews_delete" ON public.reviews FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- 4. RESERVATIONS — anon INSERT is critical (guests have no account)
CREATE POLICY "reservations_insert" ON public.reservations FOR INSERT WITH CHECK (true);
CREATE POLICY "reservations_update" ON public.reservations FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "reservations_select" ON public.reservations FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- 5. Add payment columns safely (each in its own block so one failure doesn't stop the rest)
DO $$ BEGIN ALTER TABLE public.reservations ADD COLUMN payment_method TEXT DEFAULT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.reservations ADD COLUMN payment_status TEXT DEFAULT 'unpaid'; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.reservations ADD COLUMN transaction_id TEXT DEFAULT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.reservations ADD COLUMN amount_paid INTEGER DEFAULT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- 6. Make sure payment_status always has a default (fixes NOT NULL errors)
ALTER TABLE public.reservations ALTER COLUMN payment_status SET DEFAULT 'unpaid';

-- 7. Realtime
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.reservations; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 8. Confirm — you should see exactly 9 rows
SELECT tablename, policyname, cmd FROM pg_policies
WHERE schemaname='public' AND tablename IN ('rooms','reviews','reservations')
ORDER BY tablename, cmd;
