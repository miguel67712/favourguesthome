-- ================================================================
-- ⚠️  RUN THIS IN SUPABASE SQL EDITOR  ⚠️
-- Dashboard → SQL Editor → New query → paste all → Run
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

-- 2. ROOMS — anyone can read (anon + authenticated)
CREATE POLICY "read_rooms" ON public.rooms
  FOR SELECT USING (true);

CREATE POLICY "admin_insert_rooms" ON public.rooms
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin_update_rooms" ON public.rooms
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin_delete_rooms" ON public.rooms
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. REVIEWS — anyone can read; authenticated can write
CREATE POLICY "read_reviews" ON public.reviews
  FOR SELECT USING (true);

CREATE POLICY "insert_reviews" ON public.reviews
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "admin_delete_reviews" ON public.reviews
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 4. RESERVATIONS — authenticated can insert; admin can read/update
CREATE POLICY "insert_reservations" ON public.reservations
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "admin_read_reservations" ON public.reservations
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin_update_reservations" ON public.reservations
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 5. Realtime — ensure all tables are published
DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;       EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;     EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.reservations;EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- 6. Confirm — you should see policies listed here
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname='public' AND tablename IN ('rooms','reviews','reservations')
ORDER BY tablename, cmd;
