-- profiles has no updated_at column; this trigger crashes every UPDATE with 42703.
-- It also masks trg_block_is_admin_escalation (which runs after it alphabetically).
-- Detach the trigger from profiles only. The shared function stays for other tables.
DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
