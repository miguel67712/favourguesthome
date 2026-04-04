-- ============================================================
-- FAVOUR GUEST HOMES — COMPLETE DATABASE SETUP
-- Paste ALL of this into Supabase SQL Editor and click Run
-- This creates everything from scratch with NO conflicts
-- ============================================================

-- ── 1. ENUMS ─────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 2. USER ROLES TABLE ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_roles (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role    app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
CREATE POLICY "Users can read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ── 3. HELPER FUNCTION ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- ── 4. ROOMS TABLE ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rooms (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT    NOT NULL,
  type        TEXT    NOT NULL CHECK (type IN ('single', 'studio', 'apartment')),
  price       INTEGER NOT NULL,
  occupied    BOOLEAN NOT NULL DEFAULT false,
  images      TEXT[]  NOT NULL DEFAULT '{}',
  description TEXT    NOT NULL DEFAULT '',
  amenities   TEXT[]  NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rooms_read"   ON public.rooms;
DROP POLICY IF EXISTS "rooms_insert" ON public.rooms;
DROP POLICY IF EXISTS "rooms_update" ON public.rooms;
DROP POLICY IF EXISTS "rooms_delete" ON public.rooms;

CREATE POLICY "rooms_read"   ON public.rooms FOR SELECT USING (true);
CREATE POLICY "rooms_insert" ON public.rooms FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "rooms_update" ON public.rooms FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "rooms_delete" ON public.rooms FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- ── 5. REVIEWS TABLE ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reviews (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT    NOT NULL,
  rating     INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment    TEXT    NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reviews_read"   ON public.reviews;
DROP POLICY IF EXISTS "reviews_insert" ON public.reviews;
DROP POLICY IF EXISTS "reviews_delete" ON public.reviews;

CREATE POLICY "reviews_read"   ON public.reviews FOR SELECT USING (true);
CREATE POLICY "reviews_insert" ON public.reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "reviews_delete" ON public.reviews FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- ── 6. RESERVATIONS TABLE ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reservations (
  id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_name     TEXT    NOT NULL,
  phone          TEXT    NOT NULL,
  room_type      TEXT    NOT NULL,
  check_in       DATE    NOT NULL,
  check_out      DATE    NOT NULL,
  message        TEXT,
  status         TEXT    NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','confirmed','cancelled')),
  payment_method TEXT    DEFAULT NULL,
  payment_status TEXT    NOT NULL DEFAULT 'unpaid',
  transaction_id TEXT    DEFAULT NULL,
  amount_paid    INTEGER DEFAULT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reservations_insert" ON public.reservations;
DROP POLICY IF EXISTS "reservations_update" ON public.reservations;
DROP POLICY IF EXISTS "reservations_select" ON public.reservations;

-- Anyone (anon guests) can create a reservation — no login needed
CREATE POLICY "reservations_insert" ON public.reservations
  FOR INSERT WITH CHECK (true);

-- Anyone can update (for payment status after Flutterwave callback)
CREATE POLICY "reservations_update" ON public.reservations
  FOR UPDATE USING (true) WITH CHECK (true);

-- Only admin can read bookings
CREATE POLICY "reservations_select" ON public.reservations
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- ── 7. UPDATED-AT TRIGGER ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS update_rooms_updated_at ON public.rooms;
CREATE TRIGGER update_rooms_updated_at
  BEFORE UPDATE ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── 8. ADMIN ROLE AUTO-ASSIGN ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.email = 'favourguesthomes@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;
CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- ── 9. ENSURE ADMIN ROLE RPC (call this after signing in) ────────────────────
CREATE OR REPLACE FUNCTION public.ensure_admin_role()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.email() = 'favourguesthomes@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'admin')
    ON CONFLICT DO NOTHING;
  END IF;
END; $$;

-- ── 10. REALTIME ─────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.reservations;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 11. SEED ROOMS ───────────────────────────────────────────────────────────
-- Only insert if rooms table is empty
INSERT INTO public.rooms (name, type, price, occupied, description, amenities)
SELECT * FROM (VALUES
  ('Room 1',    'single',    10000, false, 'Cozy single room with AC, TV, fridge, private bathroom, hot water, gas and 24/7 security.',             ARRAY['AC','WiFi','Private Bathroom','TV','Fridge','Hot Water','Gas','Security']),
  ('Room 2',    'single',    10000, true,  'Comfortable single room with natural light, AC, TV, fridge and private bathroom.',                      ARRAY['AC','WiFi','Private Bathroom','TV','Fridge','Hot Water','Gas','Security']),
  ('Room 3',    'single',    10000, false, 'Stylish single room with wooden ceiling, chandelier, AC, TV, fridge and hot water bathroom.',           ARRAY['AC','WiFi','Private Bathroom','TV','Fridge','Hot Water','Gas','Security']),
  ('Room 4',    'single',    10000, true,  'Well-furnished single room with kitchen access, AC, TV and fridge.',                                    ARRAY['AC','WiFi','Kitchen Access','TV','Fridge','Hot Water','Gas','Security']),
  ('Room 5',    'single',    10000, false, 'Peaceful single room with all amenities — AC, TV, fridge and private bathroom.',                        ARRAY['AC','WiFi','Private Bathroom','TV','Fridge','Hot Water','Gas','Security']),
  ('Room 6',    'single',    10000, false, 'Bright single room with city view, AC, TV, fridge and hot water bathroom.',                            ARRAY['AC','WiFi','City View','TV','Fridge','Hot Water','Gas','Security']),
  ('Room 7',    'single',    10000, true,  'Elegant single room with premium furnishing and full amenities.',                                       ARRAY['AC','WiFi','Private Bathroom','TV','Fridge','Hot Water','Gas','Security']),
  ('Room 8',    'single',    10000, false, 'Modern single room with workspace, AC, TV, fridge and hot water.',                                     ARRAY['AC','WiFi','Workspace','Private Bathroom','TV','Fridge','Hot Water','Gas','Security']),
  ('Room 9',    'single',    10000, false, 'Quiet single room with garden view and full amenities.',                                               ARRAY['AC','WiFi','Garden View','TV','Fridge','Hot Water','Gas','Security']),
  ('Studio 1',  'studio',   15000, false, 'Spacious studio with living area, kitchenette, AC, TV, fridge, hot water, gas and 24/7 security.',      ARRAY['AC','WiFi','Kitchenette','Living Area','TV','Fridge','Hot Water','Gas','Security']),
  ('Studio 2',  'studio',   15000, true,  'Premium studio with full kitchen, lounge, washing machine and all amenities.',                          ARRAY['AC','WiFi','Full Kitchen','Lounge','TV','Washing Machine','Fridge','Hot Water','Gas','Security']),
  ('Apartment', 'apartment',25000, false, 'Luxury apartment with full kitchen, living room, bedroom, balcony, parking and all amenities.',          ARRAY['AC','WiFi','Full Kitchen','Living Room','TV','Washing Machine','Parking','Balcony','Fridge','Hot Water','Gas','Security'])
) AS v(name, type, price, occupied, description, amenities)
WHERE NOT EXISTS (SELECT 1 FROM public.rooms LIMIT 1);

-- ── 12. SEED REVIEWS ─────────────────────────────────────────────────────────
INSERT INTO public.reviews (name, rating, comment, created_at)
SELECT * FROM (VALUES
  ('Jean Pierre',     5, 'Excellent guest house! Very clean rooms and incredibly welcoming staff. Will definitely come back.',            '2026-02-15'::timestamptz),
  ('Marie Claire',    4, 'Great location near Carrefour Etougébé. Spacious, well-maintained rooms. Good value for money.',               '2026-01-28'::timestamptz),
  ('Paul Biya Jr.',   5, 'Best guest house in the area. Modern amenities, free WiFi and the apartment is perfect for families.',         '2026-03-01'::timestamptz),
  ('Aminata Diallo',  5, 'Stayed for a week and felt right at home. Staff treated me like family. Highly recommended!',                  '2026-02-20'::timestamptz),
  ('Emmanuel Nkeng',  4, 'Good rooms, peaceful neighbourhood. The studio was perfect for my business trip. Will return!',               '2026-03-05'::timestamptz)
) AS v(name, rating, comment, created_at)
WHERE NOT EXISTS (SELECT 1 FROM public.reviews LIMIT 1);

-- ── VERIFY ───────────────────────────────────────────────────────────────────
SELECT '✅ Tables created:' AS info, string_agg(tablename, ', ') AS tables
FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('rooms','reviews','reservations','user_roles');

SELECT '✅ Policies set:' AS info, COUNT(*)::text AS count
FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('rooms','reviews','reservations');

SELECT '✅ Rooms seeded:' AS info, COUNT(*)::text AS count FROM public.rooms;
SELECT '✅ Reviews seeded:' AS info, COUNT(*)::text AS count FROM public.reviews;
