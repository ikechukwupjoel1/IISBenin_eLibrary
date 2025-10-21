
-- Add SELECT RLS policy for students to allow librarians to view all records.

CREATE POLICY "Librarians can view all students"
  ON students FOR SELECT
  TO authenticated
  USING (
    get_user_role(auth.uid()) = 'librarian'
  );
