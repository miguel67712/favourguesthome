-- ================================================================
-- COMPLETE FIX — Run this ONE file in Supabase SQL Editor
-- This fixes EVERYTHING: RLS policies + payment columns
-- Dashboard → SQL Editor → New query → paste → Run
-- ================================================================

-- 1. Drop ALL existing policies on rooms, reviews, reservations
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
CREATE POLICY "read_rooms"         ON public.rooms FOR SELECT USING (true);
CREATE POLICY "admin_insert_rooms" ON public.rooms FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_update_rooms" ON public.rooms FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_delete_rooms" ON public.rooms FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 3. REVIEWS
CREATE POLICY "read_reviews"   ON public.reviews FOR SELECT USING (true);
CREATE POLICY "insert_reviews" ON public.reviews FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "admin_delete_reviews" ON public.reviews FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 4. RESERVATIONS — authenticated users can insert AND update
CREATE POLICY "insert_reservations" ON public.reservations
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "update_reservations" ON public.reservations
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "admin_read_reservations" ON public.reservations
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 5. Add payment columns (safe — skips if already exist)
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS payment_method  TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS payment_status  TEXT    NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS transaction_id  TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS amount_paid     INTEGER DEFAULT NULL;

-- 6. Realtime publication
DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;        EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;      EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.reservations; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- 7. Verify
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname='public' AND tablename IN ('rooms','reviews','reservations')
ORDER BY tablename, cmd;
