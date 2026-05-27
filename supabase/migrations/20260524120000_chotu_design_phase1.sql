-- ============================================================
-- Chotu Design Port — Phase 1 schema delta
-- 2026-05-24
--
-- Both `expenses` and `assignments` already exist (Days 3-6).
-- This migration adds the one missing column and seeds the
-- missing expense categories used by the Chotu prototype UI.
-- ============================================================

-- ── 1. Add `progress` to assignments ─────────────────────────
-- The prototype tracks 0-100% completion separately from
-- status (e.g. "in_progress" at 60%). No existing code sets
-- this column, so DEFAULT 0, nullable is safe.

ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS progress INTEGER
    NOT NULL
    DEFAULT 0
    CHECK (progress >= 0 AND progress <= 100);


-- ── 2. Seed missing prototype expense categories ──────────────
-- Global defaults have user_id IS NULL. The prototype uses
-- Coffee, Stationery, Tea (Movie maps to existing "Entertainment").
-- Insert only when the name doesn't already exist as a global row.

INSERT INTO categories (name, type, color)
SELECT name, 'expense', color
FROM (VALUES
  ('Coffee',     '#a0522d'),
  ('Stationery', '#708090'),
  ('Tea',        '#8b4513')
) AS t(name, color)
WHERE NOT EXISTS (
  SELECT 1 FROM categories
  WHERE categories.name = t.name
    AND categories.user_id IS NULL
);


-- ── Column name reference (for Phases 2-5) ───────────────────
-- Prototype name    → Real column              Table
-- category TEXT     → category_id UUID FK      expenses  (JOIN categories ON id)
-- payment TEXT      → payment_method TEXT       expenses  (values: cash/upi/card/wallet*)
-- date              → spent_at                  expenses
-- due               → due_at                    assignments
-- est INT           → estimated_minutes INT      assignments
-- "desc" TEXT       → description TEXT           assignments
-- progress INT      → progress INT (added above) assignments
--
-- * NOTE: prototype uses `wallet`; real app zod enum has
--   `netbanking/other` instead. Update PAYMENT_METHODS in
--   src/lib/validations/expenses.ts before Phase 3.


-- ── Reload PostgREST schema cache ────────────────────────────
NOTIFY pgrst, 'reload schema';
