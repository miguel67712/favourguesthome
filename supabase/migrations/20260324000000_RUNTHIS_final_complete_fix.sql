-- ================================================================
-- FINAL COMPLETE FIX — Run this in Supabase SQL Editor
-- Fixes ALL issues: RLS, anon booking, payment columns
-- ================================================================

-- 1. Drop all existing policies on the three tables
DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname, tablename FROM pg_policies
           WHERE schemaname = 'public'
           AND tablename IN ('rooms','reviews','reservations')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- 2. ROOMS — anyone (anon + authenticated) can read
CREATE POLICY "rooms_select" ON public.rooms FOR SELECT USING (true);
CREATE POLICY "rooms_insert" ON public.rooms FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "rooms_update" ON public.rooms FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "rooms_delete" ON public.rooms FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 3. REVIEWS — anyone can read; authenticated can insert
CREATE POLICY "reviews_select" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "reviews_insert" ON public.reviews FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "reviews_delete" ON public.reviews FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 4. RESERVATIONS
-- IMPORTANT: Allow anon (unauthenticated) to INSERT so guests can book without login
CREATE POLICY "reservations_anon_insert" ON public.reservations
  FOR INSERT WITH CHECK (true);  -- no role restriction = anon + authenticated

CREATE POLICY "reservations_anon_update" ON public.reservations
  FOR UPDATE USING (true) WITH CHECK (true);  -- allows saving transaction ID

CREATE POLICY "reservations_admin_select" ON public.reservations
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 5. Add payment columns (safe — skips if already exist)
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS transaction_id TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS amount_paid   INTEGER DEFAULT NULL;

-- 6. Realtime
DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;        EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;      EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.reservations; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- 7. Verify
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public' AND tablename IN ('rooms','reviews','reservations')
ORDER BY tablename, cmd;
