-- ============================================================
-- RLS Hardening
-- 2026-05-23  — run in Supabase SQL Editor
-- ============================================================
-- Covers three gaps:
--   1. rate_limits    — should be service-role-only; no client policies
--   2. login_attempts — same
--   3. profiles       — block is_admin self-escalation via trigger
-- ============================================================

-- ── 1. rate_limits ───────────────────────────────────────────
-- All reads/writes go through createAdminClient() (service role),
-- which bypasses RLS entirely.  Having ANY permissive policy for
-- authenticated/anon would give clients a direct window into IP-keyed
-- rate-limit data.  Ensure RLS is ON and wipe every client-facing policy.

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Drop every policy that could exist (idempotent)
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'rate_limits'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON rate_limits', pol.policyname);
  END LOOP;
END $$;

-- Explicitly deny authenticated + anon (belt-and-suspenders; service role
-- bypasses these anyway, so legitimate code is unaffected).
CREATE POLICY "rate_limits_deny_authenticated" ON rate_limits
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "rate_limits_deny_anon" ON rate_limits
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);


-- ── 2. login_attempts ────────────────────────────────────────
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'login_attempts'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON login_attempts', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "login_attempts_deny_authenticated" ON login_attempts
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "login_attempts_deny_anon" ON login_attempts
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);


-- ── 3. profiles — block is_admin self-escalation ─────────────
-- Context: community_posts admin-delete policy reads
--   EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
-- If an authenticated user could UPDATE their own is_admin to true, that
-- policy becomes a full-table write compromise.
--
-- Strategy: BEFORE UPDATE trigger.
--   • auth.uid() IS NOT NULL  → request came from a JWT (authenticated role)
--     → block any change to is_admin
--   • auth.uid() IS NULL      → service role (createAdminClient) or postgres
--     → allow (admin tooling can still promote users)
--
-- This is the ONLY safe pattern in Supabase; column-level UPDATE privileges
-- on the `authenticated` Postgres role would also work but require granting
-- individual columns, which breaks PostgREST's permission model.

CREATE OR REPLACE FUNCTION block_is_admin_self_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- auth.uid() is NULL when called by service_role / postgres superuser.
  -- It is set to the JWT sub when called by an authenticated client.
  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin
     AND auth.uid() IS NOT NULL
  THEN
    RAISE EXCEPTION
      'is_admin may not be changed by authenticated users (uid=%)', auth.uid()
      USING ERRCODE = '42501';  -- insufficient_privilege
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_is_admin_escalation ON profiles;
CREATE TRIGGER trg_block_is_admin_escalation
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION block_is_admin_self_escalation();


-- ── Reload PostgREST schema cache ─────────────────────────────
NOTIFY pgrst, 'reload schema';


-- ============================================================
-- VERIFICATION QUERIES
-- Run these after applying the migration to confirm correctness.
-- ============================================================

-- ── V1: Full RLS audit — all tables ──────────────────────────
/*
SELECT
  c.relname                          AS table_name,
  c.relrowsecurity                   AS rls_enabled,
  p.policyname,
  p.cmd,
  p.roles,
  p.qual                             AS using_expr,
  p.with_check
FROM pg_class c
LEFT JOIN pg_policies p
  ON p.schemaname = 'public' AND p.tablename = c.relname
WHERE c.relnamespace = 'public'::regnamespace
  AND c.relkind = 'r'
ORDER BY c.relname, p.policyname;
*/

-- ── V2: rate_limits + login_attempts — confirm zero permissive policies ──
/*
SELECT tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('rate_limits', 'login_attempts')
  AND permissive = 'PERMISSIVE'
ORDER BY tablename, policyname;
-- Expected: 0 rows
*/

-- ── V3: profiles UPDATE policies ─────────────────────────────
/*
SELECT policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'profiles'
  AND cmd IN ('UPDATE', 'ALL')
ORDER BY policyname;
*/

-- ── V4: confirm trigger exists on profiles ────────────────────
/*
SELECT tgname, tgenabled, proname
FROM pg_trigger t
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE tgrelid = 'profiles'::regclass;
-- Must show: trg_block_is_admin_escalation → block_is_admin_self_escalation
*/
