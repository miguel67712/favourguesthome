-- ============================================================
-- FINAL ADMIN SETUP
-- Run this in Supabase SQL Editor → New query → Run
-- ============================================================

-- 1. Recreate ensure_admin_role (called on every login)
CREATE OR REPLACE FUNCTION public.ensure_admin_role()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RETURN; END IF;
  v_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  IF v_email = 'favourguesthomes@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.ensure_admin_role() TO authenticated;

-- 2. Trigger: auto-assign admin role on signup for the admin email
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF lower(NEW.email) = 'favourguesthomes@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;
CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- 3. Create the admin user with the correct password
--    Safe to run multiple times (uses ON CONFLICT)
DO $$
DECLARE
  v_uid uuid;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE lower(email) = 'favourguesthomes@gmail.com';

  IF v_uid IS NULL THEN
    -- Create new admin user
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, created_at, updated_at, role, aud,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'favourguesthomes@gmail.com',
      crypt('F@4our237', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      false, now(), now(),
      'authenticated', 'authenticated',
      '', '', '', ''
    )
    RETURNING id INTO v_uid;
    RAISE NOTICE 'Admin user created: %', v_uid;
  ELSE
    -- Update password to ensure it's correct
    UPDATE auth.users
    SET encrypted_password = crypt('F@4our237', gen_salt('bf')),
        email_confirmed_at = COALESCE(email_confirmed_at, now()),
        updated_at = now()
    WHERE id = v_uid;
    RAISE NOTICE 'Admin user updated: %', v_uid;
  END IF;

  -- Assign admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_uid, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  RAISE NOTICE 'Admin role assigned to: %', v_uid;
END;
$$;
