-- ============================================================
-- FIX RLS POLICIES FOR AUTHENTICATED CLIENTS
-- The previous policies allowed anon reads on rooms/reviews,
-- but realtime postgres_changes requires an authenticated
-- session. This migration ensures authenticated users can
-- read rooms and reviews, and insert reservations.
-- Run this in Supabase SQL Editor.
-- ============================================================

-- ── ROOMS ──────────────────────────────────────────────────
-- Drop existing read policy and re-create to be explicit
DROP POLICY IF EXISTS "Anyone can read rooms" ON public.rooms;

-- Allow both anon and authenticated to read rooms
CREATE POLICY "Public can read rooms"
  ON public.rooms FOR SELECT
  USING (true);

-- ── REVIEWS ────────────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can read reviews" ON public.reviews;
DROP POLICY IF EXISTS "Anyone can insert reviews" ON public.reviews;

-- Allow both anon and authenticated to read reviews
CREATE POLICY "Public can read reviews"
  ON public.reviews FOR SELECT
  USING (true);

-- Allow authenticated users to insert reviews
CREATE POLICY "Authenticated can insert reviews"
  ON public.reviews FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ── RESERVATIONS ───────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can create reservations" ON public.reservations;

-- Allow authenticated users to insert reservations
CREATE POLICY "Authenticated can create reservations"
  ON public.reservations FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ── REALTIME ───────────────────────────────────────────────
-- Ensure all three tables are in the realtime publication
-- (safe to run even if already added)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reservations;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END;
$$;
