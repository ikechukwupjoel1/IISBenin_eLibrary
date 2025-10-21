
-- Revert temporary RLS policy and re-apply the original one for user_profiles table

-- Drop the temporary permissive policy
DROP POLICY IF EXISTS "Users can view their own profile (TEMP)" ON user_profiles;

-- Re-create the original policy that uses get_user_role
CREATE POLICY "Users can view their own profile and librarians see all"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR get_user_role(auth.uid()) = 'librarian');
