
-- Temporarily simplify RLS policy on user_profiles for SELECT operations
-- This is for debugging purposes to isolate the PGRST116 error.
-- This policy will be reverted once the issue is identified and fixed.

DROP POLICY IF EXISTS "Users can view their own profile and librarians see all" ON user_profiles;

CREATE POLICY "Users can view their own profile (TEMP)"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());
