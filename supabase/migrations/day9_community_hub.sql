-- ============================================================
-- Day 9: Community Hub migration
-- Run in Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================

-- ── 1. community_posts: rename + add columns ─────────────────
ALTER TABLE community_posts RENAME COLUMN content  TO description;
ALTER TABLE community_posts RENAME COLUMN category TO subject_tag;

ALTER TABLE community_posts
  ADD COLUMN content_type   TEXT        NOT NULL DEFAULT 'notes',
  ADD COLUMN storage_key    TEXT,
  ADD COLUMN external_url   TEXT,
  ADD COLUMN is_anonymous   BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN expires_at     TIMESTAMPTZ,
  ADD COLUMN deleted_at     TIMESTAMPTZ,
  ADD COLUMN download_count INT         NOT NULL DEFAULT 0;

ALTER TABLE community_posts
  ADD CONSTRAINT community_posts_content_type_check
  CHECK (content_type IN ('assignment','solution','paper','notes','syllabus','link'));

-- Indexes for feed queries
CREATE INDEX IF NOT EXISTS idx_community_posts_feed
  ON community_posts(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_community_posts_expires
  ON community_posts(expires_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_community_posts_subject_tag
  ON community_posts(subject_tag) WHERE deleted_at IS NULL;

-- Drop legacy check constraint on category (now subject_tag) from Day 3
ALTER TABLE community_posts DROP CONSTRAINT IF EXISTS community_posts_category_check;

-- Drop NOT NULL on renamed columns (were NOT NULL in original schema)
ALTER TABLE community_posts ALTER COLUMN description DROP NOT NULL;
ALTER TABLE community_posts ALTER COLUMN subject_tag  DROP NOT NULL;

-- ── 2. community_comments: add soft-delete column ────────────
ALTER TABLE community_comments
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ── 3. community_votes: ensure composite PK ──────────────────
-- Safe: only adds if not already there
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'community_votes'::regclass
      AND contype = 'p'
  ) THEN
    ALTER TABLE community_votes
      ADD PRIMARY KEY (post_id, user_id);
  END IF;
END $$;

-- ── 4. Trigger: enforce max 1 level of comment nesting ───────
CREATE OR REPLACE FUNCTION check_comment_nesting_depth()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM community_comments
      WHERE id = NEW.parent_id AND parent_id IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'Comment nesting is limited to 1 level';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_comment_nesting ON community_comments;
CREATE TRIGGER enforce_comment_nesting
  BEFORE INSERT OR UPDATE ON community_comments
  FOR EACH ROW EXECUTE FUNCTION check_comment_nesting_depth();

-- ── 5. RLS: refresh community_posts SELECT to exclude deleted ─
DROP POLICY IF EXISTS "Authenticated users can view posts"  ON community_posts;
DROP POLICY IF EXISTS "community_posts_select"              ON community_posts;
-- recreate with deleted_at filter (admin sees all via service role if needed)
CREATE POLICY "community_posts_select" ON community_posts
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL);

-- ── 6. community-files Storage bucket ────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'community-files',
  'community-files',
  false,
  10485760,  -- 10 MB
  ARRAY[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS for community-files
DROP POLICY IF EXISTS "community_files_select" ON storage.objects;
DROP POLICY IF EXISTS "community_files_insert" ON storage.objects;
DROP POLICY IF EXISTS "community_files_delete" ON storage.objects;

CREATE POLICY "community_files_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'community-files');

CREATE POLICY "community_files_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'community-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "community_files_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'community-files'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
      )
    )
  );

-- ── 7. pg_cron: daily soft-delete of expired posts ───────────
-- Enable extension first (run once, may already be enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove old job if exists, then re-schedule
SELECT cron.unschedule('community-post-expiry') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'community-post-expiry'
);

SELECT cron.schedule(
  'community-post-expiry',
  '30 20 * * *',   -- 8:30 PM UTC = 2:00 AM IST
  $$
    UPDATE community_posts
    SET deleted_at = NOW()
    WHERE expires_at < NOW()
      AND deleted_at IS NULL;
  $$
);

-- ── 8. RPC: atomic download count increment ──────────────────
CREATE OR REPLACE FUNCTION increment_community_download(post_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE community_posts
  SET download_count = download_count + 1
  WHERE id = post_id AND deleted_at IS NULL;
$$;

-- ── 9. Reload PostgREST schema cache ─────────────────────────
NOTIFY pgrst, 'reload schema';
