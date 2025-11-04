-- =====================================================
-- FIX SUPER ADMIN ACCESS TO ALL RECORDS
-- =====================================================
-- This migration adds super_admin role to all SELECT policies
-- so super admins can view all students, staff, books, and borrow records
-- =====================================================

-- Drop and recreate policy for students
DROP POLICY IF EXISTS "Librarians and staff can view all students" ON students;
CREATE POLICY "Librarians staff and super admins can view all students"
  ON students
  FOR SELECT
  TO authenticated
  USING (
    get_user_role(auth.uid()) IN ('librarian', 'staff', 'super_admin')
  );

-- Drop and recreate policy for staff
DROP POLICY IF EXISTS "Librarians and staff can view all staff" ON staff;
CREATE POLICY "Librarians staff and super admins can view all staff"
  ON staff
  FOR SELECT
  TO authenticated
  USING (
    get_user_role(auth.uid()) IN ('librarian', 'staff', 'super_admin')
  );

-- Drop and recreate policy for books
DROP POLICY IF EXISTS "Librarians and staff can view all books" ON books;
CREATE POLICY "Librarians staff and super admins can view all books"
  ON books
  FOR SELECT
  TO authenticated
  USING (
    get_user_role(auth.uid()) IN ('librarian', 'staff', 'super_admin')
  );

-- Drop and recreate policy for borrow_records
DROP POLICY IF EXISTS "Librarians and staff can view all borrow records" ON borrow_records;
CREATE POLICY "Librarians staff and super admins can view all borrow records"
  ON borrow_records
  FOR SELECT
  TO authenticated
  USING (
    get_user_role(auth.uid()) IN ('librarian', 'staff', 'super_admin')
  );

-- Also ensure super_admin can manage students (INSERT, UPDATE, DELETE)
DROP POLICY IF EXISTS "Librarians can insert students" ON students;
CREATE POLICY "Librarians and super admins can insert students"
  ON students
  FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role(auth.uid()) IN ('librarian', 'super_admin')
  );

DROP POLICY IF EXISTS "Librarians can update students" ON students;
CREATE POLICY "Librarians and super admins can update students"
  ON students
  FOR UPDATE
  TO authenticated
  USING (get_user_role(auth.uid()) IN ('librarian', 'super_admin'))
  WITH CHECK (get_user_role(auth.uid()) IN ('librarian', 'super_admin'));

DROP POLICY IF EXISTS "Librarians can delete students" ON students;
CREATE POLICY "Librarians and super admins can delete students"
  ON students
  FOR DELETE
  TO authenticated
  USING (get_user_role(auth.uid()) IN ('librarian', 'super_admin'));

-- Verification query
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd
FROM pg_policies
WHERE tablename IN ('students', 'staff', 'books', 'borrow_records')
ORDER BY tablename, cmd;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Super Admin Access Fixed!';
  RAISE NOTICE 'Super admins can now:';
  RAISE NOTICE '  - View all students';
  RAISE NOTICE '  - View all staff';
  RAISE NOTICE '  - View all books';
  RAISE NOTICE '  - View all borrow records';
  RAISE NOTICE '  - Manage (INSERT/UPDATE/DELETE) all students';
END $$;
