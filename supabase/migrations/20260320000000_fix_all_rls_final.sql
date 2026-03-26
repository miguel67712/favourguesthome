-- ============================================================
-- DEFINITIVE RLS FIX — Run this in Supabase SQL Editor
-- Fixes all policy issues for authenticated client users
-- ============================================================

-- ── ROOMS: allow everyone (anon + authenticated) to read ───
DROP POLICY IF EXISTS "Anyone can read rooms"   ON public.rooms;
DROP POLICY IF EXISTS "Public can read rooms"   ON public.rooms;

CREATE POLICY "Anyone can read rooms"
  ON public.rooms FOR SELECT
  USING (true);

-- ── REVIEWS: allow everyone to read, authenticated to insert
DROP POLICY IF EXISTS "Anyone can read reviews"          ON public.reviews;
DROP POLICY IF EXISTS "Anyone can insert reviews"        ON public.reviews;
DROP POLICY IF EXISTS "Public can read reviews"          ON public.reviews;
DROP POLICY IF EXISTS "Authenticated can insert reviews" ON public.reviews;

CREATE POLICY "Anyone can read reviews"
  ON public.reviews FOR SELECT
  USING (true);

CREATE POLICY "Authenticated can insert reviews"
  ON public.reviews FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ── RESERVATIONS: authenticated users can insert ───────────
DROP POLICY IF EXISTS "Anyone can create reservations"        ON public.reservations;
DROP POLICY IF EXISTS "Authenticated can create reservations" ON public.reservations;

CREATE POLICY "Authenticated can create reservations"
  ON public.reservations FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ── REALTIME publication (idempotent) ──────────────────────
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.reservations;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- ── Verify ─────────────────────────────────────────────────
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('rooms', 'reviews', 'reservations')
ORDER BY tablename, cmd;
