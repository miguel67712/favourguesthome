-- ================================================================
-- FINAL COMPLETE FIX — Run this in Supabase SQL Editor
-- Handles ALL roles: anon (public), authenticated, admin
-- ================================================================

-- 1. Drop ALL existing policies
DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname, tablename FROM pg_policies
           WHERE schemaname = 'public'
           AND tablename IN ('rooms','reviews','reservations')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- 2. ROOMS
CREATE POLICY "rooms_select_all"   ON public.rooms FOR SELECT USING (true);
CREATE POLICY "rooms_insert_admin" ON public.rooms FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "rooms_update_admin" ON public.rooms FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "rooms_delete_admin" ON public.rooms FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- 3. REVIEWS — anon can read; anon can insert (public guest house)
CREATE POLICY "reviews_select_all" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "reviews_insert_all" ON public.reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "reviews_delete_admin" ON public.reviews FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- 4. RESERVATIONS — anon can insert (guests without account); admin reads/updates
CREATE POLICY "reservations_insert_all"   ON public.reservations FOR INSERT WITH CHECK (true);
CREATE POLICY "reservations_update_all"   ON public.reservations FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "reservations_select_admin" ON public.reservations FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- 5. Add payment columns (safe — skips if exist)
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS payment_method TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS payment_status TEXT    NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS transaction_id TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS amount_paid    INTEGER DEFAULT NULL;

-- 6. Realtime
DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;         EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;       EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.reservations;  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- 7. Verify — check you see these policies listed
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname='public' AND tablename IN ('rooms','reviews','reservations')
ORDER BY tablename, cmd;
