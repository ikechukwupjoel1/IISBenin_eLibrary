
-- Allow librarians and staff to read all books
CREATE POLICY "Librarians and staff can view all books"
  ON books
  FOR SELECT
  TO authenticated
  USING (
    get_user_role(auth.uid()) IN ('librarian', 'staff')
  );

-- Allow librarians and staff to read all students
CREATE POLICY "Librarians and staff can view all students"
  ON students
  FOR SELECT
  TO authenticated
  USING (
    get_user_role(auth.uid()) IN ('librarian', 'staff')
  );

-- Allow librarians and staff to read all staff
CREATE POLICY "Librarians and staff can view all staff"
  ON staff
  FOR SELECT
  TO authenticated
  USING (
    get_user_role(auth.uid()) IN ('librarian', 'staff')
  );

-- Allow librarians and staff to read all borrow records
CREATE POLICY "Librarians and staff can view all borrow records"
  ON borrow_records
  FOR SELECT
  TO authenticated
  USING (
    get_user_role(auth.uid()) IN ('librarian', 'staff')
  );
