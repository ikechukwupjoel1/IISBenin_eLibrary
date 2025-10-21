
-- Revert temporary RLS policy and re-apply the correct one for staff table

-- Drop the temporary permissive policy
DROP POLICY IF EXISTS "Authenticated users can view all staff (TEMP)" ON staff;

-- Re-create the original policy that uses get_user_role
CREATE POLICY "Librarians and staff can view all staff"
  ON staff FOR SELECT
  TO authenticated
  USING (
    get_user_role(auth.uid()) IN ('librarian', 'staff')
  );
