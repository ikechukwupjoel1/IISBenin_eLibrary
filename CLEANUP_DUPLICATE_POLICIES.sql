-- =====================================================
-- CLEANUP DUPLICATE RLS POLICIES
-- =====================================================
-- Remove old/duplicate policies to improve performance
-- Keep only the latest, most comprehensive policies
-- =====================================================

-- Clean up STUDENTS table duplicate policies
DROP POLICY IF EXISTS "librarian_can_select_students" ON students;
DROP POLICY IF EXISTS "Librarians can view all students" ON students;
DROP POLICY IF EXISTS "owner_select_students" ON students;
DROP POLICY IF EXISTS "librarian_select_students" ON students;

DROP POLICY IF EXISTS "librarian_can_insert_students" ON students;
DROP POLICY IF EXISTS "librarian_insert_students" ON students;

DROP POLICY IF EXISTS "librarian_can_update_students" ON students;
DROP POLICY IF EXISTS "librarian_update_students" ON students;

DROP POLICY IF EXISTS "librarian_can_delete_students" ON students;
DROP POLICY IF EXISTS "librarian_delete_students" ON students;

-- Clean up BOOKS table duplicate policies
DROP POLICY IF EXISTS "diagnostic_select_for_auth" ON books;

-- Verify remaining policies
SELECT 
  tablename, 
  policyname, 
  cmd
FROM pg_policies
WHERE tablename IN ('students', 'staff', 'books', 'borrow_records')
  AND cmd IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
ORDER BY tablename, cmd, policyname;

DO $$
BEGIN
  RAISE NOTICE '✅ Duplicate policies cleaned up!';
  RAISE NOTICE 'Kept only the most recent comprehensive policies';
END $$;
