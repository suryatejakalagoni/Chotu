-- ============================================================
-- CHOTU seed data
-- Global categories (user_id IS NULL — visible to all users).
-- 13 expense + 5 income = 18 rows.
-- UUIDs match prod so re-running against an already-seeded DB
-- is safe (ON CONFLICT DO NOTHING).
-- ============================================================

INSERT INTO public.categories (id, user_id, name, type, color)
VALUES
  -- expense categories
  ('ef5b3fb6-0cfa-431d-aa08-c68e254339f8', NULL, 'Books & Study',    'expense', '#8b5cf6'),
  ('0000646f-037d-4f55-b4a9-7770a5ba0da8', NULL, 'Coffee',           'expense', '#a0522d'),
  ('cc534517-a363-4015-b88d-0153f558e29c', NULL, 'College Fees',     'expense', '#ef4444'),
  ('8e6790c4-60fb-4a23-a842-11158189953c', NULL, 'Entertainment',    'expense', '#ec4899'),
  ('871c31f1-f019-4e0c-a308-9ee9588c179c', NULL, 'Food',             'expense', '#f97316'),
  ('00d63021-bcdb-4386-9d8e-18af529befae', NULL, 'Medical',          'expense', '#10b981'),
  ('75260765-9b58-4319-9012-6e765a39f131', NULL, 'Miscellaneous',    'expense', '#94a3b8'),
  ('a71ed59f-3be6-4b67-93b9-4d15bd50e8f6', NULL, 'Phone & Internet', 'expense', '#06b6d4'),
  ('f73cf734-4c2e-44d7-bf92-022c30a49a76', NULL, 'Rent',             'expense', '#6366f1'),
  ('15280e93-3888-4e75-8916-ed5204dae01c', NULL, 'Shopping',         'expense', '#f59e0b'),
  ('5d7c4afd-402e-4b02-8c06-696fa75cb7c9', NULL, 'Stationery',       'expense', '#708090'),
  ('957dd7c2-0b3a-4c2e-bf61-d2308fb8e9b8', NULL, 'Tea',              'expense', '#8b4513'),
  ('62da975b-35bf-45b8-81db-8c576ce6d685', NULL, 'Transport',        'expense', '#3b82f6'),
  -- income categories
  ('23458aba-f8e2-4bcd-b8bd-cadfe598fc9b', NULL, 'Allowance',        'income',  '#22c55e'),
  ('63aaa1c9-4f69-44c4-b5ad-8f0a5096dde6', NULL, 'Gifts',            'income',  '#f472b6'),
  ('b02a6a28-4d48-4337-9ef8-d974365cfea7', NULL, 'Other Income',     'income',  '#94a3b8'),
  ('bba6cc2f-0102-4285-8647-31269718cdcc', NULL, 'Part-time Job',    'income',  '#84cc16'),
  ('aa6f349e-8395-44e2-a2be-13ce7bceaf2b', NULL, 'Scholarship',      'income',  '#eab308')
ON CONFLICT (id) DO NOTHING;
