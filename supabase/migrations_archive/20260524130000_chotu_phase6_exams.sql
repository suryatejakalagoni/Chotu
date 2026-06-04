-- ============================================================
-- Chotu Design Port — Phase 6 schema delta (Exams)
-- 2026-05-24
--
-- The `exams` table was fully built on Day 7 (schema, RLS,
-- 4 policies, exam_reminders table). This migration only adds
-- the new exam_status enum values the Chotu prototype uses.
-- No new table is created; no existing policy is touched.
-- ============================================================

-- ── 1. Extend exam_status enum ────────────────────────────────
-- Day 7 values:    upcoming | completed | cancelled
-- Prototype needs: upcoming | ongoing   | done | missed
--
-- Strategy: add the four new values. Keep completed/cancelled
-- so Day 7 exams code compiles unchanged. Consolidate later
-- when both UIs are merged.
--
-- ALTER TYPE … ADD VALUE is non-transactional in Postgres — it
-- cannot be inside a BEGIN/COMMIT block. Run this file without
-- a wrapping transaction in the Supabase SQL editor.

ALTER TYPE exam_status ADD VALUE IF NOT EXISTS 'ongoing';
ALTER TYPE exam_status ADD VALUE IF NOT EXISTS 'done';
ALTER TYPE exam_status ADD VALUE IF NOT EXISTS 'missed';


-- ── 2. No remind JSONB column ─────────────────────────────────
-- The five prototype reminder toggles (w1/d3/d1/morn/h1) map
-- exactly to existing reminder_type enum values in exam_reminders:
--   w1   → 1_week
--   d3   → 3_days
--   d1   → 1_day
--   morn → morning_of
--   h1   → 1_hour
-- The Phase 6 UI will read/write exam_reminders rows rather than
-- a denormalised JSONB blob. When push notifications land, the
-- rows are already there — nothing to migrate.


-- ── Column name reference (for Phase 6 build) ─────────────────
-- Prototype name  → Real column        Table
-- type TEXT       → exam_type TEXT      exams
-- syllabus TEXT   → syllabus_text TEXT  exams
-- (all other prototype column names match real column names)
--
-- status mapping (prototype → DB value):
--   upcoming → 'upcoming'
--   ongoing  → 'ongoing'   (new)
--   done     → 'done'      (new; old Day 7 value was 'completed')
--   missed   → 'missed'    (new)


-- ── 3. Update database.types.ts enum comment ─────────────────
-- After running this migration, regenerate types OR manually add
-- 'ongoing' | 'done' | 'missed' to the exam_status union:
--
--   exam_status: "upcoming" | "completed" | "cancelled"
--                | "ongoing" | "done" | "missed"


-- ── Reload PostgREST schema cache ─────────────────────────────
NOTIFY pgrst, 'reload schema';
