-- ============================================================
-- CHOTU remote baseline
-- Machine-reconstructed from pg_catalog via Supabase MCP
-- Project: huhgsomogdujlsqnvqnu (chotu, ap-southeast-1)
-- Captured: 2026-06-03  Method: Option B (Docker unavailable)
--
-- NOTES:
-- * Two orphaned functions (is_split_group_member,
--   is_split_share_owner) reference dropped columns
--   (split_group_members.user_id, split_shares.user_id).
--   They are commented out here; they are not used by any RLS
--   policy and have no functional impact.
-- * exams table has column `location` (not `venue`). The app
--   TypeScript types reference `venue`/`exam_type` — the
--   database.types.ts file is stale and should be regenerated.
-- ============================================================

-- ── Extensions ────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- ── Enums ─────────────────────────────────────────────────────
CREATE TYPE public.assignment_status AS ENUM (
  'not_started', 'in_progress', 'done'
);
CREATE TYPE public.exam_status AS ENUM (
  'upcoming', 'completed', 'cancelled', 'ongoing', 'done', 'missed'
);
CREATE TYPE public.priority_level AS ENUM ('low', 'medium', 'high');
CREATE TYPE public.reminder_type AS ENUM (
  '1_day', '3_hours', 'morning_of', 'custom'
);
CREATE TYPE public.split_status AS ENUM ('pending', 'settled');
CREATE TYPE public.voice_status AS ENUM (
  'pending', 'processed', 'failed'
);

-- ── Functions ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
  RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.block_is_admin_self_escalation()
  RETURNS trigger LANGUAGE plpgsql
  SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin
     AND auth.uid() IS NOT NULL
  THEN
    RAISE EXCEPTION
      'is_admin may not be changed by authenticated users (uid=%)', auth.uid()
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_comment_nesting_depth()
  RETURNS trigger LANGUAGE plpgsql AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger LANGUAGE plpgsql
  SECURITY DEFINER SET search_path TO 'public' AS $$
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

CREATE OR REPLACE FUNCTION public.is_split_creator_or_payer(
  p_split_id uuid, p_user_id uuid
) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM splits
    WHERE id = p_split_id
      AND (created_by = p_user_id OR paid_by = p_user_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_split_group_owner(
  p_group_id uuid, p_user_id uuid
) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM split_groups
    WHERE id = p_group_id AND owner_id = p_user_id
  );
$$;

-- NOTE: is_split_group_member and is_split_share_owner reference
-- dropped columns (user_id on their respective tables) and are
-- therefore omitted. They are not referenced by any RLS policy.

-- ── Tables ────────────────────────────────────────────────────
-- Order respects FK dependencies.

-- profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id            uuid         NOT NULL,
  username      text         NOT NULL,
  display_name  text         NOT NULL,
  college       text,
  branch        text,
  year          smallint,
  is_admin      boolean      NOT NULL DEFAULT false,
  created_at    timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT profiles_username_key UNIQUE (username),
  CONSTRAINT profiles_year_check CHECK ((year >= 1) AND (year <= 4))
);

-- login_attempts
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id            bigserial    NOT NULL,
  email         text         NOT NULL,
  ip            text         NOT NULL,
  attempted_at  timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT login_attempts_pkey PRIMARY KEY (id)
);

-- rate_limits
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id            bigserial    NOT NULL,
  key           text         NOT NULL,
  attempted_at  timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT rate_limits_pkey PRIMARY KEY (id)
);

-- categories
CREATE TABLE IF NOT EXISTS public.categories (
  id          uuid    NOT NULL DEFAULT gen_random_uuid(),
  user_id     uuid,
  name        text    NOT NULL,
  icon        text,
  color       text,
  type        text    NOT NULL DEFAULT 'expense'::text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT categories_pkey PRIMARY KEY (id),
  CONSTRAINT categories_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT categories_type_check CHECK ((type = ANY (ARRAY['expense'::text, 'income'::text])))
);

-- assignments
CREATE TABLE IF NOT EXISTS public.assignments (
  id                 uuid                      NOT NULL DEFAULT gen_random_uuid(),
  user_id            uuid                      NOT NULL,
  title              text                      NOT NULL,
  description        text,
  subject            text                      NOT NULL,
  due_at             timestamptz               NOT NULL,
  priority           public.priority_level     NOT NULL DEFAULT 'medium'::priority_level,
  grade              text,
  notes              text,
  archived_at        timestamptz,
  created_at         timestamptz               NOT NULL DEFAULT now(),
  updated_at         timestamptz               NOT NULL DEFAULT now(),
  status             public.assignment_status  NOT NULL DEFAULT 'not_started'::assignment_status,
  estimated_minutes  integer,
  is_recurring       boolean                   NOT NULL DEFAULT false,
  recurrence_rule    text,
  progress           integer                   NOT NULL DEFAULT 0,
  CONSTRAINT assignments_pkey PRIMARY KEY (id),
  CONSTRAINT assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT assignments_estimated_minutes_check CHECK ((estimated_minutes > 0) AND (estimated_minutes <= 10000)),
  CONSTRAINT assignments_progress_check CHECK ((progress >= 0) AND (progress <= 100))
);

-- assignment_attachments
CREATE TABLE IF NOT EXISTS public.assignment_attachments (
  id            uuid        NOT NULL DEFAULT gen_random_uuid(),
  assignment_id uuid        NOT NULL,
  user_id       uuid        NOT NULL,
  file_name     text        NOT NULL,
  storage_key   text        NOT NULL,
  mime_type     text,
  size_bytes    bigint,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT assignment_attachments_pkey PRIMARY KEY (id),
  CONSTRAINT assignment_attachments_assignment_id_fkey
    FOREIGN KEY (assignment_id) REFERENCES public.assignments(id) ON DELETE CASCADE,
  CONSTRAINT assignment_attachments_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- assignment_reminders
CREATE TABLE IF NOT EXISTS public.assignment_reminders (
  id              uuid                   NOT NULL DEFAULT gen_random_uuid(),
  assignment_id   uuid                   NOT NULL,
  user_id         uuid                   NOT NULL,
  trigger_at      timestamptz            NOT NULL,
  sent            boolean                NOT NULL DEFAULT false,
  created_at      timestamptz            NOT NULL DEFAULT now(),
  reminder_type   public.reminder_type,
  google_event_id text,
  sync_failed_at  timestamptz,
  CONSTRAINT assignment_reminders_pkey PRIMARY KEY (id),
  CONSTRAINT assignment_reminders_assignment_id_fkey
    FOREIGN KEY (assignment_id) REFERENCES public.assignments(id) ON DELETE CASCADE,
  CONSTRAINT assignment_reminders_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- recurring_completions
CREATE TABLE IF NOT EXISTS public.recurring_completions (
  id              uuid        NOT NULL DEFAULT gen_random_uuid(),
  assignment_id   uuid        NOT NULL,
  user_id         uuid        NOT NULL,
  occurrence_date date        NOT NULL,
  completed_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT recurring_completions_pkey PRIMARY KEY (id),
  CONSTRAINT recurring_completions_assignment_id_fkey
    FOREIGN KEY (assignment_id) REFERENCES public.assignments(id) ON DELETE CASCADE,
  CONSTRAINT recurring_completions_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT recurring_completions_assignment_id_occurrence_date_key
    UNIQUE (assignment_id, occurrence_date)
);

-- exams
-- NOTE: DB column is `location`; app code references `venue`/`exam_type`
-- which do not exist — database.types.ts needs regeneration.
CREATE TABLE IF NOT EXISTS public.exams (
  id           uuid                  NOT NULL DEFAULT gen_random_uuid(),
  user_id      uuid                  NOT NULL,
  title        text                  NOT NULL,
  subject      text                  NOT NULL,
  exam_at      timestamptz           NOT NULL,
  duration_min integer,
  location     text,
  status       public.exam_status    NOT NULL DEFAULT 'upcoming'::exam_status,
  score        text,
  notes        text,
  archived_at  timestamptz,
  created_at   timestamptz           NOT NULL DEFAULT now(),
  updated_at   timestamptz           NOT NULL DEFAULT now(),
  CONSTRAINT exams_pkey PRIMARY KEY (id),
  CONSTRAINT exams_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- exam_attachments
CREATE TABLE IF NOT EXISTS public.exam_attachments (
  id           uuid        NOT NULL DEFAULT gen_random_uuid(),
  exam_id      uuid        NOT NULL,
  user_id      uuid        NOT NULL,
  file_name    text        NOT NULL,
  storage_key  text        NOT NULL,
  mime_type    text,
  size_bytes   bigint,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT exam_attachments_pkey PRIMARY KEY (id),
  CONSTRAINT exam_attachments_exam_id_fkey
    FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE CASCADE,
  CONSTRAINT exam_attachments_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- exam_reminders
CREATE TABLE IF NOT EXISTS public.exam_reminders (
  id              uuid        NOT NULL DEFAULT gen_random_uuid(),
  exam_id         uuid        NOT NULL,
  user_id         uuid        NOT NULL,
  remind_at       timestamptz NOT NULL,
  sent            boolean     NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  google_event_id text,
  sync_failed_at  timestamptz,
  CONSTRAINT exam_reminders_pkey PRIMARY KEY (id),
  CONSTRAINT exam_reminders_exam_id_fkey
    FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE CASCADE,
  CONSTRAINT exam_reminders_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- exam_topics
CREATE TABLE IF NOT EXISTS public.exam_topics (
  id          uuid        NOT NULL DEFAULT gen_random_uuid(),
  exam_id     uuid        NOT NULL,
  user_id     uuid        NOT NULL,
  title       text        NOT NULL,
  done        boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT exam_topics_pkey PRIMARY KEY (id),
  CONSTRAINT exam_topics_exam_id_fkey
    FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE CASCADE,
  CONSTRAINT exam_topics_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- expenses
CREATE TABLE IF NOT EXISTS public.expenses (
  id              uuid            NOT NULL DEFAULT gen_random_uuid(),
  user_id         uuid            NOT NULL,
  category_id     uuid,
  title           text            NOT NULL,
  amount          numeric(10,2)   NOT NULL,
  payment_method  text            NOT NULL DEFAULT 'cash'::text,
  spent_at        timestamptz     NOT NULL DEFAULT now(),
  notes           text,
  created_at      timestamptz     NOT NULL DEFAULT now(),
  updated_at      timestamptz     NOT NULL DEFAULT now(),
  CONSTRAINT expenses_pkey PRIMARY KEY (id),
  CONSTRAINT expenses_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT expenses_category_id_fkey
    FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL,
  CONSTRAINT expenses_amount_check CHECK ((amount > (0)::numeric))
);

-- income (no updated_at column)
CREATE TABLE IF NOT EXISTS public.income (
  id           uuid            NOT NULL DEFAULT gen_random_uuid(),
  user_id      uuid            NOT NULL,
  category_id  uuid,
  title        text            NOT NULL,
  amount       numeric(10,2)   NOT NULL,
  source       text,
  received_at  timestamptz     NOT NULL DEFAULT now(),
  notes        text,
  created_at   timestamptz     NOT NULL DEFAULT now(),
  CONSTRAINT income_pkey PRIMARY KEY (id),
  CONSTRAINT income_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT income_category_id_fkey
    FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL,
  CONSTRAINT income_amount_check CHECK ((amount > (0)::numeric))
);

-- budgets
CREATE TABLE IF NOT EXISTS public.budgets (
  id          uuid            NOT NULL DEFAULT gen_random_uuid(),
  user_id     uuid            NOT NULL,
  category_id uuid,
  name        text            NOT NULL,
  amount      numeric(10,2)   NOT NULL,
  period      text            NOT NULL DEFAULT 'monthly'::text,
  starts_at   date            NOT NULL DEFAULT CURRENT_DATE,
  ends_at     date,
  created_at  timestamptz     NOT NULL DEFAULT now(),
  updated_at  timestamptz     NOT NULL DEFAULT now(),
  CONSTRAINT budgets_pkey PRIMARY KEY (id),
  CONSTRAINT budgets_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT budgets_category_id_fkey
    FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL,
  CONSTRAINT budgets_amount_check CHECK ((amount > (0)::numeric)),
  CONSTRAINT budgets_period_check
    CHECK ((period = ANY (ARRAY['weekly'::text, 'monthly'::text, 'yearly'::text])))
);

-- budget_alerts
CREATE TABLE IF NOT EXISTS public.budget_alerts (
  id          uuid        NOT NULL DEFAULT gen_random_uuid(),
  budget_id   uuid        NOT NULL,
  user_id     uuid        NOT NULL,
  threshold   integer     NOT NULL DEFAULT 80,
  sent        boolean     NOT NULL DEFAULT false,
  sent_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT budget_alerts_pkey PRIMARY KEY (id),
  CONSTRAINT budget_alerts_budget_id_fkey
    FOREIGN KEY (budget_id) REFERENCES public.budgets(id) ON DELETE CASCADE,
  CONSTRAINT budget_alerts_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT budget_alerts_budget_id_threshold_key UNIQUE (budget_id, threshold),
  CONSTRAINT budget_alerts_threshold_check CHECK ((threshold >= 1) AND (threshold <= 100))
);

-- savings_goals
CREATE TABLE IF NOT EXISTS public.savings_goals (
  id              uuid            NOT NULL DEFAULT gen_random_uuid(),
  user_id         uuid            NOT NULL,
  title           text            NOT NULL,
  target_amount   numeric(10,2)   NOT NULL,
  current_amount  numeric(10,2)   NOT NULL DEFAULT 0,
  deadline        date,
  notes           text,
  created_at      timestamptz     NOT NULL DEFAULT now(),
  updated_at      timestamptz     NOT NULL DEFAULT now(),
  CONSTRAINT savings_goals_pkey PRIMARY KEY (id),
  CONSTRAINT savings_goals_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT savings_goals_target_amount_check  CHECK ((target_amount > (0)::numeric)),
  CONSTRAINT savings_goals_current_amount_check CHECK ((current_amount >= (0)::numeric))
);

-- friends  (attnum 3 was a dropped column; not reproduced)
CREATE TABLE IF NOT EXISTS public.friends (
  id          uuid        NOT NULL DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  name        text        NOT NULL,
  email       text,
  deleted_at  timestamptz,
  CONSTRAINT friends_pkey PRIMARY KEY (id),
  CONSTRAINT friends_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- split_groups
CREATE TABLE IF NOT EXISTS public.split_groups (
  id           uuid        NOT NULL DEFAULT gen_random_uuid(),
  owner_id     uuid        NOT NULL,
  name         text        NOT NULL,
  description  text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT split_groups_pkey PRIMARY KEY (id),
  CONSTRAINT split_groups_owner_id_fkey
    FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- split_group_members  (attnum 3 was user_id, dropped; friend_id used)
CREATE TABLE IF NOT EXISTS public.split_group_members (
  id          uuid        NOT NULL DEFAULT gen_random_uuid(),
  group_id    uuid        NOT NULL,
  joined_at   timestamptz NOT NULL DEFAULT now(),
  friend_id   uuid        NOT NULL,
  CONSTRAINT split_group_members_pkey PRIMARY KEY (id),
  CONSTRAINT split_group_members_group_id_fkey
    FOREIGN KEY (group_id) REFERENCES public.split_groups(id) ON DELETE CASCADE,
  CONSTRAINT split_group_members_friend_id_fkey
    FOREIGN KEY (friend_id) REFERENCES public.friends(id) ON DELETE CASCADE
);

-- splits
CREATE TABLE IF NOT EXISTS public.splits (
  id            uuid                NOT NULL DEFAULT gen_random_uuid(),
  group_id      uuid,
  created_by    uuid                NOT NULL,
  paid_by       uuid                NOT NULL,
  title         text                NOT NULL,
  total_amount  numeric(10,2)       NOT NULL,
  status        public.split_status NOT NULL DEFAULT 'pending'::split_status,
  description   text,
  created_at    timestamptz         NOT NULL DEFAULT now(),
  updated_at    timestamptz         NOT NULL DEFAULT now(),
  paid_at       timestamptz         NOT NULL DEFAULT now(),
  CONSTRAINT splits_pkey PRIMARY KEY (id),
  CONSTRAINT splits_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT splits_paid_by_fkey
    FOREIGN KEY (paid_by) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT splits_group_id_fkey
    FOREIGN KEY (group_id) REFERENCES public.split_groups(id) ON DELETE SET NULL,
  CONSTRAINT splits_total_amount_check CHECK ((total_amount > (0)::numeric))
);

-- split_shares  (attnum 3 was user_id, dropped; friend_id used)
CREATE TABLE IF NOT EXISTS public.split_shares (
  id           uuid            NOT NULL DEFAULT gen_random_uuid(),
  split_id     uuid            NOT NULL,
  amount_owed  numeric(10,2)   NOT NULL,
  is_settled   boolean         NOT NULL DEFAULT false,
  settled_at   timestamptz,
  created_at   timestamptz     NOT NULL DEFAULT now(),
  friend_id    uuid            NOT NULL,
  CONSTRAINT split_shares_pkey PRIMARY KEY (id),
  CONSTRAINT split_shares_split_id_fkey
    FOREIGN KEY (split_id) REFERENCES public.splits(id) ON DELETE CASCADE,
  CONSTRAINT split_shares_friend_id_fkey
    FOREIGN KEY (friend_id) REFERENCES public.friends(id) ON DELETE RESTRICT,
  CONSTRAINT split_shares_amount_check CHECK ((amount_owed > (0)::numeric))
);

-- community_posts
CREATE TABLE IF NOT EXISTS public.community_posts (
  id              uuid        NOT NULL DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL,
  title           text        NOT NULL,
  description     text,
  subject_tag     text                 DEFAULT 'general'::text,
  is_pinned       boolean     NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  content_type    text        NOT NULL DEFAULT 'notes'::text,
  storage_key     text,
  external_url    text,
  is_anonymous    boolean     NOT NULL DEFAULT false,
  expires_at      timestamptz,
  deleted_at      timestamptz,
  download_count  integer     NOT NULL DEFAULT 0,
  CONSTRAINT community_posts_pkey PRIMARY KEY (id),
  CONSTRAINT community_posts_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT community_posts_content_type_check CHECK (
    content_type = ANY (ARRAY[
      'assignment'::text,'solution'::text,'paper'::text,
      'notes'::text,'syllabus'::text,'link'::text
    ])
  )
);

-- community_comments
CREATE TABLE IF NOT EXISTS public.community_comments (
  id          uuid        NOT NULL DEFAULT gen_random_uuid(),
  post_id     uuid        NOT NULL,
  user_id     uuid        NOT NULL,
  parent_id   uuid,
  content     text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz,
  CONSTRAINT community_comments_pkey PRIMARY KEY (id),
  CONSTRAINT community_comments_post_id_fkey
    FOREIGN KEY (post_id) REFERENCES public.community_posts(id) ON DELETE CASCADE,
  CONSTRAINT community_comments_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT community_comments_parent_id_fkey
    FOREIGN KEY (parent_id) REFERENCES public.community_comments(id) ON DELETE CASCADE
);

-- community_votes
CREATE TABLE IF NOT EXISTS public.community_votes (
  post_id     uuid        NOT NULL,
  user_id     uuid        NOT NULL,
  value       smallint    NOT NULL DEFAULT 1,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT community_votes_pkey PRIMARY KEY (post_id, user_id),
  CONSTRAINT community_votes_post_id_fkey
    FOREIGN KEY (post_id) REFERENCES public.community_posts(id) ON DELETE CASCADE,
  CONSTRAINT community_votes_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT community_votes_value_check
    CHECK ((value = ANY (ARRAY[1, '-1'::integer])))
);

-- community_reports
CREATE TABLE IF NOT EXISTS public.community_reports (
  id           uuid        NOT NULL DEFAULT gen_random_uuid(),
  reporter_id  uuid        NOT NULL,
  post_id      uuid,
  comment_id   uuid,
  reason       text        NOT NULL,
  resolved     boolean     NOT NULL DEFAULT false,
  resolved_by  uuid,
  resolved_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT community_reports_pkey PRIMARY KEY (id),
  CONSTRAINT community_reports_reporter_id_fkey
    FOREIGN KEY (reporter_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT community_reports_post_id_fkey
    FOREIGN KEY (post_id) REFERENCES public.community_posts(id) ON DELETE CASCADE,
  CONSTRAINT community_reports_comment_id_fkey
    FOREIGN KEY (comment_id) REFERENCES public.community_comments(id) ON DELETE CASCADE,
  CONSTRAINT community_reports_resolved_by_fkey
    FOREIGN KEY (resolved_by) REFERENCES auth.users(id),
  CONSTRAINT community_reports_check CHECK (
    ((post_id IS NOT NULL) AND (comment_id IS NULL)) OR
    ((post_id IS NULL)     AND (comment_id IS NOT NULL))
  )
);

-- notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id          uuid        NOT NULL DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL,
  type        text        NOT NULL,
  title       text        NOT NULL,
  body        text        NOT NULL,
  data        jsonb,
  read        boolean     NOT NULL DEFAULT false,
  read_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- voice_entries
CREATE TABLE IF NOT EXISTS public.voice_entries (
  id             uuid                NOT NULL DEFAULT gen_random_uuid(),
  user_id        uuid                NOT NULL,
  storage_key    text                NOT NULL,
  transcript     text,
  parsed_action  jsonb,
  status         public.voice_status NOT NULL DEFAULT 'pending'::voice_status,
  error_message  text,
  duration_sec   integer,
  created_at     timestamptz         NOT NULL DEFAULT now(),
  CONSTRAINT voice_entries_pkey PRIMARY KEY (id),
  CONSTRAINT voice_entries_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- google_integrations
CREATE TABLE IF NOT EXISTS public.google_integrations (
  id                       uuid        NOT NULL DEFAULT gen_random_uuid(),
  user_id                  uuid        NOT NULL,
  encrypted_access_token   text        NOT NULL,
  encrypted_refresh_token  text        NOT NULL,
  expires_at               timestamptz NOT NULL,
  scope                    text        NOT NULL DEFAULT 'https://www.googleapis.com/auth/calendar.events'::text,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT google_integrations_pkey PRIMARY KEY (id),
  CONSTRAINT google_integrations_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT google_integrations_user_id_key UNIQUE (user_id)
);

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_asgn_attachments_assignment   ON public.assignment_attachments USING btree (assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_attachments_user   ON public.assignment_attachments USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_asgn_reminders_assignment     ON public.assignment_reminders   USING btree (assignment_id);
CREATE INDEX IF NOT EXISTS idx_asgn_reminders_pending        ON public.assignment_reminders   USING btree (trigger_at) WHERE (sent = false);
CREATE INDEX IF NOT EXISTS idx_assignments_user_id           ON public.assignments            USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_assignments_due_at            ON public.assignments            USING btree (due_at);
CREATE INDEX IF NOT EXISTS idx_assignments_active            ON public.assignments            USING btree (user_id) WHERE (archived_at IS NULL);
CREATE UNIQUE INDEX IF NOT EXISTS budget_alerts_budget_id_threshold_key ON public.budget_alerts USING btree (budget_id, threshold);
CREATE INDEX IF NOT EXISTS idx_budget_alerts_budget          ON public.budget_alerts          USING btree (budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_alerts_pending         ON public.budget_alerts          USING btree (user_id) WHERE (sent = false);
CREATE INDEX IF NOT EXISTS idx_budgets_user                  ON public.budgets                USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_categories_user               ON public.categories             USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_community_comments_post       ON public.community_comments     USING btree (post_id);
CREATE INDEX IF NOT EXISTS idx_community_comments_parent     ON public.community_comments     USING btree (parent_id);
CREATE INDEX IF NOT EXISTS idx_community_comments_user       ON public.community_comments     USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_user          ON public.community_posts        USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_category      ON public.community_posts        USING btree (subject_tag);
CREATE INDEX IF NOT EXISTS idx_community_posts_created       ON public.community_posts        USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_pinned        ON public.community_posts        USING btree (is_pinned) WHERE (is_pinned = true);
CREATE INDEX IF NOT EXISTS idx_community_posts_feed          ON public.community_posts        USING btree (created_at DESC) WHERE (deleted_at IS NULL);
CREATE INDEX IF NOT EXISTS idx_community_posts_expires       ON public.community_posts        USING btree (expires_at) WHERE (deleted_at IS NULL);
CREATE INDEX IF NOT EXISTS idx_community_posts_subject_tag   ON public.community_posts        USING btree (subject_tag) WHERE (deleted_at IS NULL);
CREATE INDEX IF NOT EXISTS idx_community_reports_reporter    ON public.community_reports      USING btree (reporter_id);
CREATE INDEX IF NOT EXISTS idx_community_reports_unresolved  ON public.community_reports      USING btree (resolved) WHERE (resolved = false);
CREATE INDEX IF NOT EXISTS idx_community_votes_post          ON public.community_votes        USING btree (post_id);
CREATE INDEX IF NOT EXISTS idx_community_votes_user          ON public.community_votes        USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_exam_attachments_exam         ON public.exam_attachments       USING btree (exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_attachments_user         ON public.exam_attachments       USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_exam_reminders_exam           ON public.exam_reminders         USING btree (exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_reminders_pending        ON public.exam_reminders         USING btree (remind_at) WHERE (sent = false);
CREATE INDEX IF NOT EXISTS idx_exam_topics_exam              ON public.exam_topics            USING btree (exam_id);
CREATE INDEX IF NOT EXISTS idx_exams_user_id                 ON public.exams                  USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_exams_exam_at                 ON public.exams                  USING btree (exam_at);
CREATE INDEX IF NOT EXISTS idx_exams_active                  ON public.exams                  USING btree (user_id) WHERE (archived_at IS NULL);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id              ON public.expenses               USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_spent_at             ON public.expenses               USING btree (user_id, spent_at DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category             ON public.expenses               USING btree (category_id);
CREATE INDEX IF NOT EXISTS idx_friends_user                  ON public.friends                USING btree (user_id);
CREATE INDEX IF NOT EXISTS friends_user_active_idx           ON public.friends                USING btree (user_id) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX IF NOT EXISTS google_integrations_user_id_key ON public.google_integrations USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_income_user_id                ON public.income                 USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_income_received_at            ON public.income                 USING btree (user_id, received_at DESC);
CREATE INDEX IF NOT EXISTS login_attempts_email_attempted_at_idx ON public.login_attempts    USING btree (email, attempted_at);
CREATE INDEX IF NOT EXISTS login_attempts_ip_attempted_at_idx    ON public.login_attempts    USING btree (ip, attempted_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user            ON public.notifications          USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread          ON public.notifications          USING btree (user_id) WHERE (read = false);
CREATE INDEX IF NOT EXISTS idx_notifications_created         ON public.notifications          USING btree (user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_key      ON public.profiles               USING btree (username);
CREATE INDEX IF NOT EXISTS rate_limits_key_attempted_at_idx  ON public.rate_limits            USING btree (key, attempted_at);
CREATE UNIQUE INDEX IF NOT EXISTS recurring_completions_assignment_id_occurrence_date_key ON public.recurring_completions USING btree (assignment_id, occurrence_date);
CREATE INDEX IF NOT EXISTS idx_recurring_completions_assignment ON public.recurring_completions USING btree (assignment_id);
CREATE INDEX IF NOT EXISTS idx_recurring_completions_user    ON public.recurring_completions  USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_savings_goals_user            ON public.savings_goals          USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_sgm_group                     ON public.split_group_members    USING btree (group_id);
CREATE INDEX IF NOT EXISTS sgm_group_id_idx                  ON public.split_group_members    USING btree (group_id);
CREATE INDEX IF NOT EXISTS sgm_friend_id_idx                 ON public.split_group_members    USING btree (friend_id);
CREATE INDEX IF NOT EXISTS idx_split_groups_owner            ON public.split_groups           USING btree (owner_id);
CREATE INDEX IF NOT EXISTS idx_split_shares_split            ON public.split_shares           USING btree (split_id);
CREATE INDEX IF NOT EXISTS ss_friend_id_idx                  ON public.split_shares           USING btree (friend_id);
CREATE INDEX IF NOT EXISTS ss_split_id_idx                   ON public.split_shares           USING btree (split_id);
CREATE INDEX IF NOT EXISTS ss_unsettled_idx                  ON public.split_shares           USING btree (split_id) WHERE (is_settled = false);
CREATE INDEX IF NOT EXISTS idx_splits_created_by             ON public.splits                 USING btree (created_by);
CREATE INDEX IF NOT EXISTS idx_splits_paid_by                ON public.splits                 USING btree (paid_by);
CREATE INDEX IF NOT EXISTS idx_splits_group                  ON public.splits                 USING btree (group_id);
CREATE INDEX IF NOT EXISTS idx_splits_pending                ON public.splits                 USING btree (created_by) WHERE (status = 'pending'::split_status);
CREATE INDEX IF NOT EXISTS idx_voice_entries_user            ON public.voice_entries          USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_voice_entries_pending         ON public.voice_entries          USING btree (status) WHERE (status = 'pending'::voice_status);

-- ── RLS enable ────────────────────────────────────────────────
ALTER TABLE public.assignment_attachments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_reminders    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_alerts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_comments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_reports       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_votes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_attachments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_reminders          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_topics             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friends                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_integrations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.income                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_attempts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_completions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_goals           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.split_group_members     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.split_groups            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.split_shares            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.splits                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_entries           ENABLE ROW LEVEL SECURITY;

-- ── RLS policies ──────────────────────────────────────────────

-- assignment_attachments
CREATE POLICY "asgn_attachments: select own" ON public.assignment_attachments AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);
CREATE POLICY "asgn_attachments: insert own" ON public.assignment_attachments AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);
CREATE POLICY "asgn_attachments: delete own" ON public.assignment_attachments AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);

-- assignment_reminders
CREATE POLICY "asgn_reminders: select own"  ON public.assignment_reminders AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);
CREATE POLICY "asgn_reminders: insert own"  ON public.assignment_reminders AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);
CREATE POLICY "asgn_reminders: update own"  ON public.assignment_reminders AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "asgn_reminders: delete own"  ON public.assignment_reminders AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);

-- assignments
CREATE POLICY "assignments: select own" ON public.assignments AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);
CREATE POLICY "assignments: insert own" ON public.assignments AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);
CREATE POLICY "assignments: update own" ON public.assignments AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "assignments: delete own" ON public.assignments AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);

-- budget_alerts
CREATE POLICY "budget_alerts: select own" ON public.budget_alerts AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);
CREATE POLICY "budget_alerts: insert own" ON public.budget_alerts AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);
CREATE POLICY "budget_alerts: update own" ON public.budget_alerts AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "budget_alerts: delete own" ON public.budget_alerts AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);

-- budgets
CREATE POLICY "budgets: select own" ON public.budgets AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);
CREATE POLICY "budgets: insert own" ON public.budgets AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);
CREATE POLICY "budgets: update own" ON public.budgets AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "budgets: delete own" ON public.budgets AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);

-- categories
CREATE POLICY "categories: select own + system" ON public.categories AS PERMISSIVE FOR SELECT TO public USING ((user_id = auth.uid()) OR (user_id IS NULL));
CREATE POLICY "categories: insert own"           ON public.categories AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);
CREATE POLICY "categories: update own"           ON public.categories AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "categories: delete own"           ON public.categories AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);

-- community_comments
CREATE POLICY "community_comments: select authenticated" ON public.community_comments AS PERMISSIVE FOR SELECT TO public USING (auth.uid() IS NOT NULL);
CREATE POLICY "community_comments: insert own" ON public.community_comments AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);
CREATE POLICY "community_comments: update own or admin" ON public.community_comments AS PERMISSIVE FOR UPDATE TO public
  USING  ((auth.uid() = user_id) OR (( SELECT profiles.is_admin FROM profiles WHERE (profiles.id = auth.uid())) = true))
  WITH CHECK ((auth.uid() = user_id) OR (( SELECT profiles.is_admin FROM profiles WHERE (profiles.id = auth.uid())) = true));
CREATE POLICY "community_comments: delete own or admin" ON public.community_comments AS PERMISSIVE FOR DELETE TO public
  USING  ((auth.uid() = user_id) OR (( SELECT profiles.is_admin FROM profiles WHERE (profiles.id = auth.uid())) = true));

-- community_posts
CREATE POLICY "community_posts: select authenticated" ON public.community_posts AS PERMISSIVE FOR SELECT TO public     USING (auth.uid() IS NOT NULL);
CREATE POLICY "community_posts_select"                ON public.community_posts AS PERMISSIVE FOR SELECT TO authenticated USING (deleted_at IS NULL);
CREATE POLICY "community_posts: insert own"           ON public.community_posts AS PERMISSIVE FOR INSERT TO public     WITH CHECK (auth.uid() = user_id);
CREATE POLICY "community_posts: update own or admin"  ON public.community_posts AS PERMISSIVE FOR UPDATE TO public
  USING  ((auth.uid() = user_id) OR (( SELECT profiles.is_admin FROM profiles WHERE (profiles.id = auth.uid())) = true))
  WITH CHECK ((auth.uid() = user_id) OR (( SELECT profiles.is_admin FROM profiles WHERE (profiles.id = auth.uid())) = true));
CREATE POLICY "community_posts: delete own or admin"  ON public.community_posts AS PERMISSIVE FOR DELETE TO public
  USING  ((auth.uid() = user_id) OR (( SELECT profiles.is_admin FROM profiles WHERE (profiles.id = auth.uid())) = true));

-- community_reports
CREATE POLICY "community_reports: select own or admin" ON public.community_reports AS PERMISSIVE FOR SELECT TO public
  USING ((reporter_id = auth.uid()) OR (( SELECT profiles.is_admin FROM profiles WHERE (profiles.id = auth.uid())) = true));
CREATE POLICY "community_reports: insert own" ON public.community_reports AS PERMISSIVE FOR INSERT TO public WITH CHECK (reporter_id = auth.uid());
CREATE POLICY "community_reports: update admin only" ON public.community_reports AS PERMISSIVE FOR UPDATE TO public
  USING  (( SELECT profiles.is_admin FROM profiles WHERE (profiles.id = auth.uid())) = true)
  WITH CHECK (( SELECT profiles.is_admin FROM profiles WHERE (profiles.id = auth.uid())) = true);
CREATE POLICY "community_reports: delete admin only" ON public.community_reports AS PERMISSIVE FOR DELETE TO public
  USING  (( SELECT profiles.is_admin FROM profiles WHERE (profiles.id = auth.uid())) = true);

-- community_votes
CREATE POLICY "community_votes: select authenticated" ON public.community_votes AS PERMISSIVE FOR SELECT TO public USING (auth.uid() IS NOT NULL);
CREATE POLICY "community_votes: insert own"           ON public.community_votes AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);
CREATE POLICY "community_votes: update own"           ON public.community_votes AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "community_votes: delete own"           ON public.community_votes AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);

-- exam_attachments
CREATE POLICY "exam_attachments: select own" ON public.exam_attachments AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);
CREATE POLICY "exam_attachments: insert own" ON public.exam_attachments AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);
CREATE POLICY "exam_attachments: delete own" ON public.exam_attachments AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);

-- exam_reminders
CREATE POLICY "exam_reminders: select own" ON public.exam_reminders AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);
CREATE POLICY "exam_reminders: insert own" ON public.exam_reminders AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);
CREATE POLICY "exam_reminders: update own" ON public.exam_reminders AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "exam_reminders: delete own" ON public.exam_reminders AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);

-- exam_topics
CREATE POLICY "exam_topics: select own" ON public.exam_topics AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);
CREATE POLICY "exam_topics: insert own" ON public.exam_topics AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);
CREATE POLICY "exam_topics: update own" ON public.exam_topics AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "exam_topics: delete own" ON public.exam_topics AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);

-- exams
CREATE POLICY "exams: select own" ON public.exams AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);
CREATE POLICY "exams: insert own" ON public.exams AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);
CREATE POLICY "exams: update own" ON public.exams AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "exams: delete own" ON public.exams AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);

-- expenses
CREATE POLICY "expenses: select own" ON public.expenses AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);
CREATE POLICY "expenses: insert own" ON public.expenses AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);
CREATE POLICY "expenses: update own" ON public.expenses AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "expenses: delete own" ON public.expenses AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);

-- friends
CREATE POLICY "friends_select" ON public.friends AS PERMISSIVE FOR SELECT TO public USING (user_id = auth.uid());
CREATE POLICY "friends_insert" ON public.friends AS PERMISSIVE FOR INSERT TO public WITH CHECK (user_id = auth.uid());
CREATE POLICY "friends_update" ON public.friends AS PERMISSIVE FOR UPDATE TO public USING (user_id = auth.uid());
CREATE POLICY "friends_delete" ON public.friends AS PERMISSIVE FOR DELETE TO public USING (user_id = auth.uid());

-- google_integrations
CREATE POLICY "select own integration" ON public.google_integrations AS PERMISSIVE FOR SELECT TO public USING (user_id = auth.uid());
CREATE POLICY "insert own integration" ON public.google_integrations AS PERMISSIVE FOR INSERT TO public WITH CHECK (user_id = auth.uid());
CREATE POLICY "update own integration" ON public.google_integrations AS PERMISSIVE FOR UPDATE TO public USING (user_id = auth.uid());
CREATE POLICY "delete own integration" ON public.google_integrations AS PERMISSIVE FOR DELETE TO public USING (user_id = auth.uid());

-- income
CREATE POLICY "income: select own" ON public.income AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);
CREATE POLICY "income: insert own" ON public.income AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);
CREATE POLICY "income: delete own" ON public.income AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);

-- login_attempts (RESTRICTIVE — no client may ever touch this table)
CREATE POLICY "login_attempts_deny_anon"          ON public.login_attempts AS RESTRICTIVE FOR ALL TO anon          USING (false) WITH CHECK (false);
CREATE POLICY "login_attempts_deny_authenticated" ON public.login_attempts AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- notifications
CREATE POLICY "notifications: select own" ON public.notifications AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);
CREATE POLICY "notifications: update own" ON public.notifications AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notifications: delete own" ON public.notifications AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);

-- profiles
CREATE POLICY "Authenticated users can view profiles" ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile"          ON public.profiles AS PERMISSIVE FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_insert_own"                   ON public.profiles AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((( SELECT auth.uid() AS uid) = id));

-- rate_limits (RESTRICTIVE — no client may ever touch this table)
CREATE POLICY "rate_limits_deny_anon"          ON public.rate_limits AS RESTRICTIVE FOR ALL TO anon          USING (false) WITH CHECK (false);
CREATE POLICY "rate_limits_deny_authenticated" ON public.rate_limits AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- recurring_completions
CREATE POLICY "own recurring completions" ON public.recurring_completions AS PERMISSIVE FOR ALL TO public USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- savings_goals
CREATE POLICY "savings_goals: select own" ON public.savings_goals AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);
CREATE POLICY "savings_goals: insert own" ON public.savings_goals AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);
CREATE POLICY "savings_goals: update own" ON public.savings_goals AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "savings_goals: delete own" ON public.savings_goals AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);

-- split_group_members
CREATE POLICY "split_group_members_select" ON public.split_group_members AS PERMISSIVE FOR SELECT TO public
  USING (EXISTS ( SELECT 1 FROM split_groups g WHERE ((g.id = split_group_members.group_id) AND (g.owner_id = auth.uid()))));
CREATE POLICY "split_group_members_insert" ON public.split_group_members AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (EXISTS ( SELECT 1 FROM split_groups g WHERE ((g.id = split_group_members.group_id) AND (g.owner_id = auth.uid()))));
CREATE POLICY "split_group_members_delete" ON public.split_group_members AS PERMISSIVE FOR DELETE TO public
  USING (EXISTS ( SELECT 1 FROM split_groups g WHERE ((g.id = split_group_members.group_id) AND (g.owner_id = auth.uid()))));

-- split_groups
CREATE POLICY "split_groups_select" ON public.split_groups AS PERMISSIVE FOR SELECT TO public USING (owner_id = auth.uid());
CREATE POLICY "split_groups_insert" ON public.split_groups AS PERMISSIVE FOR INSERT TO public WITH CHECK (owner_id = auth.uid());
CREATE POLICY "split_groups_update" ON public.split_groups AS PERMISSIVE FOR UPDATE TO public USING (owner_id = auth.uid());
CREATE POLICY "split_groups_delete" ON public.split_groups AS PERMISSIVE FOR DELETE TO public USING (owner_id = auth.uid());

-- split_shares
CREATE POLICY "split_shares_select" ON public.split_shares AS PERMISSIVE FOR SELECT TO public
  USING (EXISTS ( SELECT 1 FROM splits s WHERE ((s.id = split_shares.split_id) AND (s.created_by = auth.uid()))));
CREATE POLICY "split_shares_insert" ON public.split_shares AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (EXISTS ( SELECT 1 FROM splits s WHERE ((s.id = split_shares.split_id) AND (s.created_by = auth.uid()))));
CREATE POLICY "split_shares_update" ON public.split_shares AS PERMISSIVE FOR UPDATE TO public
  USING (EXISTS ( SELECT 1 FROM splits s WHERE ((s.id = split_shares.split_id) AND (s.created_by = auth.uid()))));
CREATE POLICY "split_shares_delete" ON public.split_shares AS PERMISSIVE FOR DELETE TO public
  USING (EXISTS ( SELECT 1 FROM splits s WHERE ((s.id = split_shares.split_id) AND (s.created_by = auth.uid()))));

-- splits
CREATE POLICY "splits_select" ON public.splits AS PERMISSIVE FOR SELECT TO public USING (created_by = auth.uid());
CREATE POLICY "splits_insert" ON public.splits AS PERMISSIVE FOR INSERT TO public WITH CHECK (created_by = auth.uid());
CREATE POLICY "splits_update" ON public.splits AS PERMISSIVE FOR UPDATE TO public USING (created_by = auth.uid());
CREATE POLICY "splits_delete" ON public.splits AS PERMISSIVE FOR DELETE TO public USING (created_by = auth.uid());

-- voice_entries
CREATE POLICY "voice_entries: select own" ON public.voice_entries AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);
CREATE POLICY "voice_entries: insert own" ON public.voice_entries AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);
CREATE POLICY "voice_entries: delete own" ON public.voice_entries AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);

-- ── Triggers ──────────────────────────────────────────────────
CREATE OR REPLACE TRIGGER assignments_updated_at
  BEFORE UPDATE ON public.assignments FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER budgets_updated_at
  BEFORE UPDATE ON public.budgets FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER categories_updated_at
  BEFORE UPDATE ON public.categories FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER community_comments_updated_at
  BEFORE UPDATE ON public.community_comments FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER enforce_comment_nesting
  BEFORE INSERT OR UPDATE ON public.community_comments FOR EACH ROW
  EXECUTE FUNCTION check_comment_nesting_depth();

CREATE OR REPLACE TRIGGER community_posts_updated_at
  BEFORE UPDATE ON public.community_posts FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER exams_updated_at
  BEFORE UPDATE ON public.exams FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER expenses_updated_at
  BEFORE UPDATE ON public.expenses FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_google_integrations_updated_at
  BEFORE UPDATE ON public.google_integrations FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER trg_block_is_admin_escalation
  BEFORE UPDATE ON public.profiles FOR EACH ROW
  EXECUTE FUNCTION block_is_admin_self_escalation();

CREATE OR REPLACE TRIGGER savings_goals_updated_at
  BEFORE UPDATE ON public.savings_goals FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER split_groups_updated_at
  BEFORE UPDATE ON public.split_groups FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER splits_updated_at
  BEFORE UPDATE ON public.splits FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
