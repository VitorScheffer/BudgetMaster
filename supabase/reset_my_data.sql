-- ─────────────────────────────────────────────────────────────────────────────
-- Reset all application data for the CURRENT signed-in user.
-- Run this in the Supabase Dashboard → SQL Editor.
--
-- Replaces YOUR_USER_ID with your actual auth user UUID.
-- Find it in: Supabase Dashboard → Authentication → Users → copy the UUID.
-- ─────────────────────────────────────────────────────────────────────────────

do $$
declare
  v_user_id uuid := 'YOUR_USER_ID';   -- ← paste your user UUID here
begin

  -- order matters: child tables first to avoid FK violations
  delete from import_logs      where user_id = v_user_id;
  delete from transactions     where user_id = v_user_id;
  delete from category_rules   where user_id = v_user_id;
  delete from categories       where user_id = v_user_id;
  delete from accounts         where user_id = v_user_id;

  raise notice 'Reset complete for user %', v_user_id;
end;
$$;
