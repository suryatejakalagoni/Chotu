-- ============================================================
-- Fix signup: create handle_new_user trigger + profiles INSERT policy
-- 2026-05-28
--
-- Root cause (two-layer):
--   1. The original handle_new_user trigger (created via Supabase dashboard,
--      never in a migration file) only inserted (id, email). profiles.username
--      and profiles.display_name are NOT NULL with no defaults, so the trigger
--      threw "null value in column username violates not-null constraint" on
--      every signup, rolling back auth.users and returning HTTP 500.
--   2. profiles also has a UNIQUE constraint on username
--      (profiles_username_key). Even after fixing the null issue, if the
--      email-prefix-derived username already existed in profiles, the INSERT
--      threw a unique violation — also a 500.
--
-- Fix:
--   1. Replace handle_new_user to read username/display_name from
--      raw_user_meta_data (passed via options.data in the signUp call).
--      Falls back to email prefix so Google OAuth users also get a row.
--   2. Append a 4-char UUID suffix to username if it is already taken,
--      ensuring the UNIQUE constraint is never violated.
--   3. Wrap in EXCEPTION WHEN OTHERS so the trigger can NEVER roll back
--      auth.users regardless of future schema changes.
--   4. Drop/recreate the trigger cleanly.
--   5. Add the missing INSERT RLS policy on profiles.
-- ============================================================

-- 1. Trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_username     TEXT;
  v_display_name TEXT;
  v_suffix       TEXT;
BEGIN
  v_display_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'display_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'name',         ''),
    split_part(NEW.email, '@', 1)
  );

  v_username := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'username', ''),
    NULLIF(NEW.raw_user_meta_data->>'name',     ''),
    split_part(NEW.email, '@', 1)
  );

  -- If username is already taken, append first 4 chars of the UUID.
  -- e.g. "surya" → "surya_a3f9"
  IF EXISTS (SELECT 1 FROM public.profiles WHERE username = v_username) THEN
    v_suffix   := substr(replace(NEW.id::text, '-', ''), 1, 4);
    v_username := v_username || '_' || v_suffix;
  END IF;

  INSERT INTO public.profiles (id, username, display_name)
  VALUES (NEW.id, v_username, v_display_name)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user failed for %: % (%)', NEW.id, SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$;

-- 2. Trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user       ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 3. INSERT RLS policy for profiles
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = id);
