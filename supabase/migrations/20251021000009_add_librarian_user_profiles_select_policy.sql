
-- Add SELECT RLS policy for user_profiles to allow librarians to view all user profiles.

CREATE POLICY "Librarians can view all user profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    get_user_role(auth.uid()) = 'librarian'
  );
