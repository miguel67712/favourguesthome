-- ================================================================
-- PAYMENT TABLES & POLICIES — Run in Supabase SQL Editor
-- ================================================================

-- Add payment columns to reservations (safe if already exist)
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS payment_method  TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS payment_status  TEXT    NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS transaction_id  TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS amount_paid     INTEGER DEFAULT NULL;

-- Drop & recreate policies cleanly
DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname, tablename FROM pg_policies
    WHERE schemaname='public' AND tablename IN ('rooms','reviews','reservations')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- ROOMS
CREATE POLICY "rooms_read"         ON public.rooms FOR SELECT USING (true);
CREATE POLICY "rooms_insert_admin" ON public.rooms FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "rooms_update_admin" ON public.rooms FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "rooms_delete_admin" ON public.rooms FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- REVIEWS — public read + write (guest house)
CREATE POLICY "reviews_read"         ON public.reviews FOR SELECT USING (true);
CREATE POLICY "reviews_insert_all"   ON public.reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "reviews_delete_admin" ON public.reviews FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- RESERVATIONS — anon can insert; anyone can update (for payment status);
--                only admin can read (bookings are private)
CREATE POLICY "reservations_insert_all"   ON public.reservations FOR INSERT WITH CHECK (true);
CREATE POLICY "reservations_update_all"   ON public.reservations FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "reservations_select_admin" ON public.reservations FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- Realtime
DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;        EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;      EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.reservations; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- Verify
SELECT tablename, policyname, cmd FROM pg_policies
WHERE schemaname='public' AND tablename IN ('rooms','reviews','reservations')
ORDER BY tablename;
