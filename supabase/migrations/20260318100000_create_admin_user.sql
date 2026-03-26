-- ============================================================
-- Create admin user: favourguesthomes@gmail.com / F@4our237
-- Run this in Supabase SQL Editor if user doesn't exist yet
-- ============================================================

-- Step 1: Create the auth user with the exact password
-- Uses Supabase's built-in crypt for bcrypt password hashing
DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if user already exists
  SELECT id INTO v_uid FROM auth.users WHERE email = 'favourguesthomes@gmail.com';

  IF v_uid IS NULL THEN
    -- Create the user
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      created_at,
      updated_at,
      role,
      aud,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'favourguesthomes@gmail.com',
      crypt('F@4our237', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      false,
      now(),
      now(),
      'authenticated',
      'authenticated',
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO v_uid;

    RAISE NOTICE 'Admin user created with id: %', v_uid;
  ELSE
    -- User exists — update password to ensure it matches
    UPDATE auth.users
    SET
      encrypted_password = crypt('F@4our237', gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      updated_at = now()
    WHERE id = v_uid;

    RAISE NOTICE 'Admin user already exists (id: %), password updated.', v_uid;
  END IF;

  -- Step 2: Assign admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_uid, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  RAISE NOTICE 'Admin role assigned to user: %', v_uid;
END;
$$;

-- Step 3: Ensure ensure_admin_role function is up to date
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
