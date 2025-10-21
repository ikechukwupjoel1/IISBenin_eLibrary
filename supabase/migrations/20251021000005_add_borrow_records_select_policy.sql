
-- Add SELECT RLS policy for borrow_records to allow librarians and staff to view all records.

CREATE POLICY "Librarians and staff can view all borrow records"
  ON borrow_records FOR SELECT
  TO authenticated
  USING (
    get_user_role(auth.uid()) IN ('librarian', 'staff')
  );
