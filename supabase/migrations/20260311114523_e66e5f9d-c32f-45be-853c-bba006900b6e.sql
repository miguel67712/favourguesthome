
-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS for user_roles
CREATE POLICY "Users can read own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Rooms table
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('single', 'studio', 'apartment')),
  price INTEGER NOT NULL,
  occupied BOOLEAN NOT NULL DEFAULT false,
  images TEXT[] NOT NULL DEFAULT '{}',
  description TEXT NOT NULL DEFAULT '',
  amenities TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read rooms" ON public.rooms FOR SELECT USING (true);
CREATE POLICY "Admin can insert rooms" ON public.rooms FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can update rooms" ON public.rooms FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can delete rooms" ON public.rooms FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Reviews table
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Anyone can insert reviews" ON public.reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin can delete reviews" ON public.reviews FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Reservations table
CREATE TABLE public.reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  room_type TEXT NOT NULL,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create reservations" ON public.reservations FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin can read reservations" ON public.reservations FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can update reservations" ON public.reservations FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_rooms_updated_at
  BEFORE UPDATE ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed rooms
INSERT INTO public.rooms (name, type, price, occupied, description, amenities) VALUES
  ('Room 1', 'single', 10000, false, 'Cozy single room with modern amenities, AC, TV, fridge, and private bathroom with hot and cold water. Gas and 24/7 security included.', ARRAY['AC', 'WiFi', 'Private Bathroom', 'TV', 'Fridge', 'Hot Water', 'Gas', 'Security']),
  ('Room 2', 'single', 10000, true, 'Comfortable single room with natural light and elegant decor. AC, TV, fridge, and private bathroom with hot and cold water.', ARRAY['AC', 'WiFi', 'Private Bathroom', 'TV', 'Fridge', 'Hot Water', 'Gas', 'Security']),
  ('Room 3', 'single', 10000, false, 'Stylish single room with wooden ceiling and chandelier. AC, TV, fridge, and hot water bathroom.', ARRAY['AC', 'WiFi', 'Private Bathroom', 'TV', 'Fridge', 'Hot Water', 'Gas', 'Security']),
  ('Room 4', 'single', 10000, true, 'Well-furnished single room with modern kitchen access. AC, TV, fridge included.', ARRAY['AC', 'WiFi', 'Kitchen Access', 'TV', 'Fridge', 'Hot Water', 'Gas', 'Security']),
  ('Room 5', 'single', 10000, false, 'Peaceful single room perfect for relaxation. Fully equipped with AC, TV, and fridge.', ARRAY['AC', 'WiFi', 'Private Bathroom', 'TV', 'Fridge', 'Hot Water', 'Gas', 'Security']),
  ('Room 6', 'single', 10000, false, 'Bright single room with city view. AC, TV, fridge, and hot water bathroom.', ARRAY['AC', 'WiFi', 'City View', 'TV', 'Fridge', 'Hot Water', 'Gas', 'Security']),
  ('Room 7', 'single', 10000, true, 'Elegant single room with premium furnishing. Full amenities included.', ARRAY['AC', 'WiFi', 'Private Bathroom', 'TV', 'Fridge', 'Hot Water', 'Gas', 'Security']),
  ('Room 8', 'single', 10000, false, 'Modern single room with workspace. AC, TV, fridge, and hot water.', ARRAY['AC', 'WiFi', 'Workspace', 'Private Bathroom', 'TV', 'Fridge', 'Hot Water', 'Gas', 'Security']),
  ('Room 9', 'single', 10000, false, 'Quiet single room with garden view. All amenities included.', ARRAY['AC', 'WiFi', 'Garden View', 'TV', 'Fridge', 'Hot Water', 'Gas', 'Security']),
  ('Studio 1', 'studio', 15000, false, 'Spacious studio with living area and kitchenette. AC, TV, fridge, hot water, gas, and 24/7 security.', ARRAY['AC', 'WiFi', 'Kitchenette', 'Living Area', 'TV', 'Fridge', 'Hot Water', 'Gas', 'Security']),
  ('Studio 2', 'studio', 15000, true, 'Premium studio with modern appliances and separate lounge. Full kitchen, washing machine, and all amenities.', ARRAY['AC', 'WiFi', 'Full Kitchen', 'Lounge', 'TV', 'Washing Machine', 'Fridge', 'Hot Water', 'Gas', 'Security']),
  ('Apartment', 'apartment', 25000, false, 'Luxury apartment with full kitchen, living room, and bedroom. AC, TV, fridge, hot water, balcony, parking, gas, and 24/7 security.', ARRAY['AC', 'WiFi', 'Full Kitchen', 'Living Room', 'TV', 'Washing Machine', 'Parking', 'Balcony', 'Fridge', 'Hot Water', 'Gas', 'Security']);

-- Seed reviews
INSERT INTO public.reviews (name, rating, comment, created_at) VALUES
  ('Jean Pierre', 5, 'Excellent guest house! Very clean rooms and the staff is incredibly welcoming. Will definitely come back.', '2026-02-15'),
  ('Marie Claire', 4, 'Great location near Carrefour Etougébé. The rooms are spacious and well-maintained. Good value for money.', '2026-01-28'),
  ('Paul Biya Jr.', 5, 'The best guest house in the area. Modern amenities, free WiFi, and the apartment is perfect for families.', '2026-03-01'),
  ('Aminata Diallo', 5, 'I stayed for a week and felt right at home. The staff treated me like family. Highly recommended!', '2026-02-20'),
  ('Emmanuel Nkeng', 4, 'Good rooms, peaceful neighborhood. The studio was perfect for my business trip. Will return!', '2026-03-05');

-- Function to assign admin role on signup for specific email
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email = 'favourguesthomes@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();
