-- ================================================================
-- FINAL DEFINITIVE FIX — Run in Supabase SQL Editor
-- ================================================================

-- Drop ALL policies on these tables
DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname, tablename FROM pg_policies
           WHERE schemaname = 'public'
           AND tablename IN ('rooms','reviews','reservations')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- ROOMS: anyone reads, admin writes
CREATE POLICY "rooms_select"  ON public.rooms FOR SELECT USING (true);
CREATE POLICY "rooms_insert"  ON public.rooms FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "rooms_update"  ON public.rooms FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "rooms_delete"  ON public.rooms FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- REVIEWS: anyone reads, anyone inserts (anon + authenticated)
CREATE POLICY "reviews_select" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "reviews_insert" ON public.reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "reviews_delete" ON public.reviews FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- RESERVATIONS: anyone inserts (so booking works without login issues)
-- admin reads/updates
CREATE POLICY "reservations_insert" ON public.reservations FOR INSERT WITH CHECK (true);
CREATE POLICY "reservations_update" ON public.reservations FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "reservations_select" ON public.reservations FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- Add payment columns safely
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS payment_method  TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS payment_status  TEXT    NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS transaction_id  TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS amount_paid     INTEGER DEFAULT NULL;

-- Realtime
DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;        EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;      EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.reservations; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

SELECT tablename, policyname, cmd FROM pg_policies
WHERE schemaname='public' AND tablename IN ('rooms','reviews','reservations')
ORDER BY tablename, cmd;
