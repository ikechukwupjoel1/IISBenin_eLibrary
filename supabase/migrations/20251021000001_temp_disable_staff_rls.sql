
-- Temporarily disable RLS for SELECT on staff table for authenticated users
-- This is for debugging purposes to isolate the staff count issue.
-- This policy will be reverted once the issue is identified and fixed.

DROP POLICY IF EXISTS "Librarians and staff can view all staff" ON staff;

CREATE POLICY "Authenticated users can view all staff (TEMP)"
  ON staff FOR SELECT
  TO authenticated
  USING (true);
