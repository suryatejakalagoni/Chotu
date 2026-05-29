-- ============================================================
-- Performance fix migration
-- 2026-05-28
--
-- Fixes three Supabase Performance Advisor issues:
--   1. auth_rls_initplan           — wrap every plain auth.uid() call
--                                    as (SELECT auth.uid()) so Postgres
--                                    evaluates it once per query, not
--                                    once per row
--   2. multiple_permissive_policies — drop the old open SELECT policy
--                                    on community_posts that was making
--                                    soft-deleted posts visible
--   3. duplicate_index             — drop one index from each duplicate
--                                    pair on split_group_members and
--                                    split_shares
--
-- SECURITY: zero behaviour change for Issues 1 and 3.
-- Issue 2 restores the intended Day 9 soft-delete behaviour (the old
-- policy was accidentally overriding deleted_at IS NULL).
--
-- Run in Supabase SQL Editor. No transaction wrapper needed.
-- ============================================================


-- ============================================================
-- ISSUE 1: auth_rls_initplan
-- Drop and recreate each policy with (SELECT auth.uid()).
-- Policies using only `true`, `false`, or `deleted_at IS NULL`
-- (no auth.uid() call) are left untouched.
-- ============================================================

-- ── assignment_attachments ───────────────────────────────────
-- 3 changes: select, insert, delete

DROP POLICY IF EXISTS "asgn_attachments: select own" ON assignment_attachments;
CREATE POLICY "asgn_attachments: select own" ON assignment_attachments
  FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "asgn_attachments: insert own" ON assignment_attachments;
CREATE POLICY "asgn_attachments: insert own" ON assignment_attachments
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "asgn_attachments: delete own" ON assignment_attachments;
CREATE POLICY "asgn_attachments: delete own" ON assignment_attachments
  FOR DELETE
  USING ((SELECT auth.uid()) = user_id);


-- ── assignment_reminders ─────────────────────────────────────
-- 4 changes: select, insert, update, delete

DROP POLICY IF EXISTS "asgn_reminders: select own" ON assignment_reminders;
CREATE POLICY "asgn_reminders: select own" ON assignment_reminders
  FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "asgn_reminders: insert own" ON assignment_reminders;
CREATE POLICY "asgn_reminders: insert own" ON assignment_reminders
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "asgn_reminders: update own" ON assignment_reminders;
CREATE POLICY "asgn_reminders: update own" ON assignment_reminders
  FOR UPDATE
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "asgn_reminders: delete own" ON assignment_reminders;
CREATE POLICY "asgn_reminders: delete own" ON assignment_reminders
  FOR DELETE
  USING ((SELECT auth.uid()) = user_id);


-- ── assignments ──────────────────────────────────────────────
-- 4 changes: select, insert, update, delete

DROP POLICY IF EXISTS "assignments: select own" ON assignments;
CREATE POLICY "assignments: select own" ON assignments
  FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "assignments: insert own" ON assignments;
CREATE POLICY "assignments: insert own" ON assignments
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "assignments: update own" ON assignments;
CREATE POLICY "assignments: update own" ON assignments
  FOR UPDATE
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "assignments: delete own" ON assignments;
CREATE POLICY "assignments: delete own" ON assignments
  FOR DELETE
  USING ((SELECT auth.uid()) = user_id);


-- ── budget_alerts ────────────────────────────────────────────
-- 4 changes: select, insert, update, delete

DROP POLICY IF EXISTS "budget_alerts: select own" ON budget_alerts;
CREATE POLICY "budget_alerts: select own" ON budget_alerts
  FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "budget_alerts: insert own" ON budget_alerts;
CREATE POLICY "budget_alerts: insert own" ON budget_alerts
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "budget_alerts: update own" ON budget_alerts;
CREATE POLICY "budget_alerts: update own" ON budget_alerts
  FOR UPDATE
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "budget_alerts: delete own" ON budget_alerts;
CREATE POLICY "budget_alerts: delete own" ON budget_alerts
  FOR DELETE
  USING ((SELECT auth.uid()) = user_id);


-- ── budgets ──────────────────────────────────────────────────
-- 4 changes: select, insert, update, delete

DROP POLICY IF EXISTS "budgets: select own" ON budgets;
CREATE POLICY "budgets: select own" ON budgets
  FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "budgets: insert own" ON budgets;
CREATE POLICY "budgets: insert own" ON budgets
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "budgets: update own" ON budgets;
CREATE POLICY "budgets: update own" ON budgets
  FOR UPDATE
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "budgets: delete own" ON budgets;
CREATE POLICY "budgets: delete own" ON budgets
  FOR DELETE
  USING ((SELECT auth.uid()) = user_id);


-- ── categories ───────────────────────────────────────────────
-- 4 changes: select (preserves OR user_id IS NULL), insert, update, delete

DROP POLICY IF EXISTS "categories: select own + system" ON categories;
CREATE POLICY "categories: select own + system" ON categories
  FOR SELECT
  USING ((user_id = (SELECT auth.uid())) OR (user_id IS NULL));

DROP POLICY IF EXISTS "categories: insert own" ON categories;
CREATE POLICY "categories: insert own" ON categories
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "categories: update own" ON categories;
CREATE POLICY "categories: update own" ON categories
  FOR UPDATE
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "categories: delete own" ON categories;
CREATE POLICY "categories: delete own" ON categories
  FOR DELETE
  USING ((SELECT auth.uid()) = user_id);


-- ── community_comments ───────────────────────────────────────
-- 4 changes: select, insert, update (own or admin), delete (own or admin)
-- Admin subquery: auth.uid() wrapped at both call sites

DROP POLICY IF EXISTS "community_comments: select authenticated" ON community_comments;
CREATE POLICY "community_comments: select authenticated" ON community_comments
  FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "community_comments: insert own" ON community_comments;
CREATE POLICY "community_comments: insert own" ON community_comments
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "community_comments: update own or admin" ON community_comments;
CREATE POLICY "community_comments: update own or admin" ON community_comments
  FOR UPDATE
  USING (
    ((SELECT auth.uid()) = user_id)
    OR (
      (SELECT profiles.is_admin FROM profiles
       WHERE profiles.id = (SELECT auth.uid())) = true
    )
  )
  WITH CHECK (
    ((SELECT auth.uid()) = user_id)
    OR (
      (SELECT profiles.is_admin FROM profiles
       WHERE profiles.id = (SELECT auth.uid())) = true
    )
  );

DROP POLICY IF EXISTS "community_comments: delete own or admin" ON community_comments;
CREATE POLICY "community_comments: delete own or admin" ON community_comments
  FOR DELETE
  USING (
    ((SELECT auth.uid()) = user_id)
    OR (
      (SELECT profiles.is_admin FROM profiles
       WHERE profiles.id = (SELECT auth.uid())) = true
    )
  );


-- ── community_posts ──────────────────────────────────────────
-- 3 changes here (Issue 1): insert, update, delete.
-- SELECT policies are handled separately in Issue 2 below.
-- community_posts_select (deleted_at IS NULL) has no auth.uid() — skip.

DROP POLICY IF EXISTS "community_posts: insert own" ON community_posts;
CREATE POLICY "community_posts: insert own" ON community_posts
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "community_posts: update own or admin" ON community_posts;
CREATE POLICY "community_posts: update own or admin" ON community_posts
  FOR UPDATE
  USING (
    ((SELECT auth.uid()) = user_id)
    OR (
      (SELECT profiles.is_admin FROM profiles
       WHERE profiles.id = (SELECT auth.uid())) = true
    )
  )
  WITH CHECK (
    ((SELECT auth.uid()) = user_id)
    OR (
      (SELECT profiles.is_admin FROM profiles
       WHERE profiles.id = (SELECT auth.uid())) = true
    )
  );

DROP POLICY IF EXISTS "community_posts: delete own or admin" ON community_posts;
CREATE POLICY "community_posts: delete own or admin" ON community_posts
  FOR DELETE
  USING (
    ((SELECT auth.uid()) = user_id)
    OR (
      (SELECT profiles.is_admin FROM profiles
       WHERE profiles.id = (SELECT auth.uid())) = true
    )
  );


-- ── community_reports ────────────────────────────────────────
-- 4 changes: select, insert, update (admin only), delete (admin only)
-- reporter_id column (not user_id) — preserved exactly

DROP POLICY IF EXISTS "community_reports: select own or admin" ON community_reports;
CREATE POLICY "community_reports: select own or admin" ON community_reports
  FOR SELECT
  USING (
    (reporter_id = (SELECT auth.uid()))
    OR (
      (SELECT profiles.is_admin FROM profiles
       WHERE profiles.id = (SELECT auth.uid())) = true
    )
  );

DROP POLICY IF EXISTS "community_reports: insert own" ON community_reports;
CREATE POLICY "community_reports: insert own" ON community_reports
  FOR INSERT
  WITH CHECK (reporter_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "community_reports: update admin only" ON community_reports;
CREATE POLICY "community_reports: update admin only" ON community_reports
  FOR UPDATE
  USING (
    (SELECT profiles.is_admin FROM profiles
     WHERE profiles.id = (SELECT auth.uid())) = true
  )
  WITH CHECK (
    (SELECT profiles.is_admin FROM profiles
     WHERE profiles.id = (SELECT auth.uid())) = true
  );

DROP POLICY IF EXISTS "community_reports: delete admin only" ON community_reports;
CREATE POLICY "community_reports: delete admin only" ON community_reports
  FOR DELETE
  USING (
    (SELECT profiles.is_admin FROM profiles
     WHERE profiles.id = (SELECT auth.uid())) = true
  );


-- ── community_votes ──────────────────────────────────────────
-- 4 changes: select, insert, update, delete

DROP POLICY IF EXISTS "community_votes: select authenticated" ON community_votes;
CREATE POLICY "community_votes: select authenticated" ON community_votes
  FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "community_votes: insert own" ON community_votes;
CREATE POLICY "community_votes: insert own" ON community_votes
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "community_votes: update own" ON community_votes;
CREATE POLICY "community_votes: update own" ON community_votes
  FOR UPDATE
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "community_votes: delete own" ON community_votes;
CREATE POLICY "community_votes: delete own" ON community_votes
  FOR DELETE
  USING ((SELECT auth.uid()) = user_id);


-- ── exam_attachments ─────────────────────────────────────────
-- 3 changes: select, insert, delete

DROP POLICY IF EXISTS "exam_attachments: select own" ON exam_attachments;
CREATE POLICY "exam_attachments: select own" ON exam_attachments
  FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "exam_attachments: insert own" ON exam_attachments;
CREATE POLICY "exam_attachments: insert own" ON exam_attachments
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "exam_attachments: delete own" ON exam_attachments;
CREATE POLICY "exam_attachments: delete own" ON exam_attachments
  FOR DELETE
  USING ((SELECT auth.uid()) = user_id);


-- ── exam_reminders ───────────────────────────────────────────
-- 4 changes: select, insert, update, delete

DROP POLICY IF EXISTS "exam_reminders: select own" ON exam_reminders;
CREATE POLICY "exam_reminders: select own" ON exam_reminders
  FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "exam_reminders: insert own" ON exam_reminders;
CREATE POLICY "exam_reminders: insert own" ON exam_reminders
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "exam_reminders: update own" ON exam_reminders;
CREATE POLICY "exam_reminders: update own" ON exam_reminders
  FOR UPDATE
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "exam_reminders: delete own" ON exam_reminders;
CREATE POLICY "exam_reminders: delete own" ON exam_reminders
  FOR DELETE
  USING ((SELECT auth.uid()) = user_id);


-- ── exam_topics ──────────────────────────────────────────────
-- 4 changes: select, insert, update, delete

DROP POLICY IF EXISTS "exam_topics: select own" ON exam_topics;
CREATE POLICY "exam_topics: select own" ON exam_topics
  FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "exam_topics: insert own" ON exam_topics;
CREATE POLICY "exam_topics: insert own" ON exam_topics
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "exam_topics: update own" ON exam_topics;
CREATE POLICY "exam_topics: update own" ON exam_topics
  FOR UPDATE
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "exam_topics: delete own" ON exam_topics;
CREATE POLICY "exam_topics: delete own" ON exam_topics
  FOR DELETE
  USING ((SELECT auth.uid()) = user_id);


-- ── exams ────────────────────────────────────────────────────
-- 4 changes: select, insert, update, delete

DROP POLICY IF EXISTS "exams: select own" ON exams;
CREATE POLICY "exams: select own" ON exams
  FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "exams: insert own" ON exams;
CREATE POLICY "exams: insert own" ON exams
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "exams: update own" ON exams;
CREATE POLICY "exams: update own" ON exams
  FOR UPDATE
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "exams: delete own" ON exams;
CREATE POLICY "exams: delete own" ON exams
  FOR DELETE
  USING ((SELECT auth.uid()) = user_id);


-- ── expenses ─────────────────────────────────────────────────
-- 4 changes: select, insert, update, delete

DROP POLICY IF EXISTS "expenses: select own" ON expenses;
CREATE POLICY "expenses: select own" ON expenses
  FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "expenses: insert own" ON expenses;
CREATE POLICY "expenses: insert own" ON expenses
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "expenses: update own" ON expenses;
CREATE POLICY "expenses: update own" ON expenses
  FOR UPDATE
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "expenses: delete own" ON expenses;
CREATE POLICY "expenses: delete own" ON expenses
  FOR DELETE
  USING ((SELECT auth.uid()) = user_id);


-- ── friends ──────────────────────────────────────────────────
-- 4 changes: select, insert, update, delete
-- update has no WITH CHECK (matches original)

DROP POLICY IF EXISTS "friends_select" ON friends;
CREATE POLICY "friends_select" ON friends
  FOR SELECT
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "friends_insert" ON friends;
CREATE POLICY "friends_insert" ON friends
  FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "friends_update" ON friends;
CREATE POLICY "friends_update" ON friends
  FOR UPDATE
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "friends_delete" ON friends;
CREATE POLICY "friends_delete" ON friends
  FOR DELETE
  USING (user_id = (SELECT auth.uid()));


-- ── google_integrations ──────────────────────────────────────
-- 4 changes: select, insert, update, delete
-- update has no WITH CHECK (matches original)

DROP POLICY IF EXISTS "select own integration" ON google_integrations;
CREATE POLICY "select own integration" ON google_integrations
  FOR SELECT
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "insert own integration" ON google_integrations;
CREATE POLICY "insert own integration" ON google_integrations
  FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "update own integration" ON google_integrations;
CREATE POLICY "update own integration" ON google_integrations
  FOR UPDATE
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "delete own integration" ON google_integrations;
CREATE POLICY "delete own integration" ON google_integrations
  FOR DELETE
  USING (user_id = (SELECT auth.uid()));


-- ── income ───────────────────────────────────────────────────
-- 3 changes: select, insert, delete (no update policy — matches original)

DROP POLICY IF EXISTS "income: select own" ON income;
CREATE POLICY "income: select own" ON income
  FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "income: insert own" ON income;
CREATE POLICY "income: insert own" ON income
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "income: delete own" ON income;
CREATE POLICY "income: delete own" ON income
  FOR DELETE
  USING ((SELECT auth.uid()) = user_id);


-- ── notifications ────────────────────────────────────────────
-- 3 changes: select, update, delete (no insert — insert is service-role only)

DROP POLICY IF EXISTS "notifications: select own" ON notifications;
CREATE POLICY "notifications: select own" ON notifications
  FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "notifications: update own" ON notifications;
CREATE POLICY "notifications: update own" ON notifications
  FOR UPDATE
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "notifications: delete own" ON notifications;
CREATE POLICY "notifications: delete own" ON notifications
  FOR DELETE
  USING ((SELECT auth.uid()) = user_id);


-- ── profiles ─────────────────────────────────────────────────
-- 1 change: update own (TO authenticated, matches original)
-- "Authenticated users can view profiles" uses USING (true) — no auth.uid(), skip.

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);


-- ── recurring_completions ────────────────────────────────────
-- 1 change: FOR ALL policy (both USING and WITH CHECK)

DROP POLICY IF EXISTS "own recurring completions" ON recurring_completions;
CREATE POLICY "own recurring completions" ON recurring_completions
  FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));


-- ── savings_goals ────────────────────────────────────────────
-- 4 changes: select, insert, update, delete

DROP POLICY IF EXISTS "savings_goals: select own" ON savings_goals;
CREATE POLICY "savings_goals: select own" ON savings_goals
  FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "savings_goals: insert own" ON savings_goals;
CREATE POLICY "savings_goals: insert own" ON savings_goals
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "savings_goals: update own" ON savings_goals;
CREATE POLICY "savings_goals: update own" ON savings_goals
  FOR UPDATE
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "savings_goals: delete own" ON savings_goals;
CREATE POLICY "savings_goals: delete own" ON savings_goals
  FOR DELETE
  USING ((SELECT auth.uid()) = user_id);


-- ── split_group_members ──────────────────────────────────────
-- 3 changes: select, insert, delete
-- auth.uid() is inside the EXISTS subquery — wrap it there

DROP POLICY IF EXISTS "split_group_members_select" ON split_group_members;
CREATE POLICY "split_group_members_select" ON split_group_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM split_groups g
      WHERE g.id = split_group_members.group_id
        AND g.owner_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "split_group_members_insert" ON split_group_members;
CREATE POLICY "split_group_members_insert" ON split_group_members
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM split_groups g
      WHERE g.id = split_group_members.group_id
        AND g.owner_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "split_group_members_delete" ON split_group_members;
CREATE POLICY "split_group_members_delete" ON split_group_members
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM split_groups g
      WHERE g.id = split_group_members.group_id
        AND g.owner_id = (SELECT auth.uid())
    )
  );


-- ── split_groups ─────────────────────────────────────────────
-- 4 changes: select, insert, update, delete
-- update has no WITH CHECK (matches original)

DROP POLICY IF EXISTS "split_groups_select" ON split_groups;
CREATE POLICY "split_groups_select" ON split_groups
  FOR SELECT
  USING (owner_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "split_groups_insert" ON split_groups;
CREATE POLICY "split_groups_insert" ON split_groups
  FOR INSERT
  WITH CHECK (owner_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "split_groups_update" ON split_groups;
CREATE POLICY "split_groups_update" ON split_groups
  FOR UPDATE
  USING (owner_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "split_groups_delete" ON split_groups;
CREATE POLICY "split_groups_delete" ON split_groups
  FOR DELETE
  USING (owner_id = (SELECT auth.uid()));


-- ── split_shares ─────────────────────────────────────────────
-- 4 changes: select, insert, update, delete
-- auth.uid() is inside the EXISTS subquery — wrap it there
-- update has no WITH CHECK (matches original)

DROP POLICY IF EXISTS "split_shares_select" ON split_shares;
CREATE POLICY "split_shares_select" ON split_shares
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM splits s
      WHERE s.id = split_shares.split_id
        AND s.created_by = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "split_shares_insert" ON split_shares;
CREATE POLICY "split_shares_insert" ON split_shares
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM splits s
      WHERE s.id = split_shares.split_id
        AND s.created_by = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "split_shares_update" ON split_shares;
CREATE POLICY "split_shares_update" ON split_shares
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM splits s
      WHERE s.id = split_shares.split_id
        AND s.created_by = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "split_shares_delete" ON split_shares;
CREATE POLICY "split_shares_delete" ON split_shares
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM splits s
      WHERE s.id = split_shares.split_id
        AND s.created_by = (SELECT auth.uid())
    )
  );


-- ── splits ───────────────────────────────────────────────────
-- 4 changes: select, insert, update, delete
-- update has no WITH CHECK (matches original)

DROP POLICY IF EXISTS "splits_select" ON splits;
CREATE POLICY "splits_select" ON splits
  FOR SELECT
  USING (created_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "splits_insert" ON splits;
CREATE POLICY "splits_insert" ON splits
  FOR INSERT
  WITH CHECK (created_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "splits_update" ON splits;
CREATE POLICY "splits_update" ON splits
  FOR UPDATE
  USING (created_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "splits_delete" ON splits;
CREATE POLICY "splits_delete" ON splits
  FOR DELETE
  USING (created_by = (SELECT auth.uid()));


-- ── voice_entries ────────────────────────────────────────────
-- The pg_policies output showed only delete own (paste likely truncated).
-- select and insert use the same user_id pattern per CONTEXT.md Day 3.
-- DROP IF EXISTS is safe if a policy doesn't exist.

DROP POLICY IF EXISTS "voice_entries: select own" ON voice_entries;
CREATE POLICY "voice_entries: select own" ON voice_entries
  FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "voice_entries: insert own" ON voice_entries;
CREATE POLICY "voice_entries: insert own" ON voice_entries
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "voice_entries: delete own" ON voice_entries;
CREATE POLICY "voice_entries: delete own" ON voice_entries
  FOR DELETE
  USING ((SELECT auth.uid()) = user_id);


-- ============================================================
-- ISSUE 2: community_posts — drop the redundant SELECT policy
-- ============================================================
-- "community_posts: select authenticated"  USING (auth.uid() IS NOT NULL)
-- "community_posts_select"                 USING (deleted_at IS NULL)
--
-- Both are PERMISSIVE → Postgres ORs them:
--   (auth.uid() IS NOT NULL) OR (deleted_at IS NULL)
-- For any logged-in user the first condition is always true, making
-- the deleted_at filter a dead letter. Soft-deleted posts are currently
-- visible to all authenticated users — this is a bug, not just a perf flag.
--
-- Fix: drop the old open policy. community_posts_select (TO authenticated,
-- deleted_at IS NULL) then becomes the sole SELECT policy and correctly
-- hides soft-deleted posts from all clients.

DROP POLICY IF EXISTS "community_posts: select authenticated" ON community_posts;


-- ============================================================
-- ISSUE 3: duplicate indexes
-- ============================================================
-- split_group_members: idx_sgm_group and sgm_group_id_idx are identical.
--   Keep: idx_sgm_group  (explicit, matches project naming convention)
--   Drop: sgm_group_id_idx
DROP INDEX IF EXISTS sgm_group_id_idx;

-- split_shares: idx_split_shares_split and ss_split_id_idx are identical.
--   Keep: idx_split_shares_split  (explicit, matches project naming convention)
--   Drop: ss_split_id_idx
DROP INDEX IF EXISTS ss_split_id_idx;


-- ── Reload PostgREST schema cache ────────────────────────────
NOTIFY pgrst, 'reload schema';
