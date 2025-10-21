-- ============================================
-- COMPREHENSIVE FIX SCRIPT
-- Run this to fix common database issues
-- ============================================

-- Fix 1: Ensure all tables exist with correct structure
-- ============================================

-- Ensure borrow_records has staff_id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'borrow_records' AND column_name = 'staff_id'
  ) THEN
    ALTER TABLE borrow_records ADD COLUMN staff_id uuid REFERENCES staff(id) ON DELETE CASCADE;
    ALTER TABLE borrow_records DROP CONSTRAINT IF EXISTS borrower_check;
    ALTER TABLE borrow_records ADD CONSTRAINT borrower_check 
      CHECK ((student_id IS NOT NULL AND staff_id IS NULL) OR (student_id IS NULL AND staff_id IS NOT NULL));
    CREATE INDEX IF NOT EXISTS idx_borrow_records_staff_id ON borrow_records(staff_id);
  END IF;
END $$;

-- Ensure user_profiles has password_hash column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN password_hash text;
  END IF;
END $$;

-- Fix 2: Recreate is_librarian function with proper SECURITY DEFINER
-- ============================================
CREATE OR REPLACE FUNCTION is_librarian(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = user_id AND role = 'librarian'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix 3: Ensure proper RLS policies for all tables
-- ============================================

-- Books policies
ALTER TABLE books ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "books_select_all" ON books;
CREATE POLICY "books_select_all" ON books FOR SELECT USING (true);

DROP POLICY IF EXISTS "books_insert_librarian" ON books;
CREATE POLICY "books_insert_librarian" ON books FOR INSERT 
  WITH CHECK (is_librarian(auth.uid()));

DROP POLICY IF EXISTS "books_update_librarian" ON books;
CREATE POLICY "books_update_librarian" ON books FOR UPDATE 
  USING (is_librarian(auth.uid()));

DROP POLICY IF EXISTS "books_delete_librarian" ON books;
CREATE POLICY "books_delete_librarian" ON books FOR DELETE 
  USING (is_librarian(auth.uid()));

-- Students policies
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "students_select_all" ON students;
CREATE POLICY "students_select_all" ON students FOR SELECT USING (true);

DROP POLICY IF EXISTS "students_insert_librarian" ON students;
CREATE POLICY "students_insert_librarian" ON students FOR INSERT 
  WITH CHECK (is_librarian(auth.uid()));

DROP POLICY IF EXISTS "students_update_librarian" ON students;
CREATE POLICY "students_update_librarian" ON students FOR UPDATE 
  USING (is_librarian(auth.uid()));

DROP POLICY IF EXISTS "students_delete_librarian" ON students;
CREATE POLICY "students_delete_librarian" ON students FOR DELETE 
  USING (is_librarian(auth.uid()));

-- Staff policies
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_select_all" ON staff;
CREATE POLICY "staff_select_all" ON staff FOR SELECT USING (true);

DROP POLICY IF EXISTS "staff_insert_librarian" ON staff;
CREATE POLICY "staff_insert_librarian" ON staff FOR INSERT 
  WITH CHECK (is_librarian(auth.uid()));

DROP POLICY IF EXISTS "staff_update_librarian" ON staff;
CREATE POLICY "staff_update_librarian" ON staff FOR UPDATE 
  USING (is_librarian(auth.uid()));

DROP POLICY IF EXISTS "staff_delete_librarian" ON staff;
CREATE POLICY "staff_delete_librarian" ON staff FOR DELETE 
  USING (is_librarian(auth.uid()));

-- Borrow records policies
ALTER TABLE borrow_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "borrow_records_select_all" ON borrow_records;
CREATE POLICY "borrow_records_select_all" ON borrow_records FOR SELECT USING (true);

DROP POLICY IF EXISTS "borrow_records_insert_librarian" ON borrow_records;
CREATE POLICY "borrow_records_insert_librarian" ON borrow_records FOR INSERT 
  WITH CHECK (is_librarian(auth.uid()));

DROP POLICY IF EXISTS "borrow_records_update_librarian" ON borrow_records;
CREATE POLICY "borrow_records_update_librarian" ON borrow_records FOR UPDATE 
  USING (is_librarian(auth.uid()));

DROP POLICY IF EXISTS "borrow_records_delete_librarian" ON borrow_records;
CREATE POLICY "borrow_records_delete_librarian" ON borrow_records FOR DELETE 
  USING (is_librarian(auth.uid()));

-- User profiles policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_own_profile" ON user_profiles;
CREATE POLICY "users_select_own_profile" ON user_profiles FOR SELECT 
  USING (auth.uid() = id OR is_librarian(auth.uid()));

DROP POLICY IF EXISTS "users_insert_own_profile" ON user_profiles;
CREATE POLICY "users_insert_own_profile" ON user_profiles FOR INSERT 
  WITH CHECK (auth.uid() = id OR is_librarian(auth.uid()));

DROP POLICY IF EXISTS "users_update_own_profile" ON user_profiles;
CREATE POLICY "users_update_own_profile" ON user_profiles FOR UPDATE 
  USING (auth.uid() = id OR is_librarian(auth.uid()));

-- Fix 4: Repair orphaned records
-- ============================================

-- Create user_profiles for students that are missing them
INSERT INTO user_profiles (id, email, full_name, role, enrollment_id, student_id, password_hash)
SELECT 
  s.id,
  s.email,
  s.name,
  'student',
  s.enrollment_id,
  s.id,
  'NEEDS_RESET' -- These students will need password reset
FROM students s
WHERE NOT EXISTS (
  SELECT 1 FROM user_profiles up WHERE up.student_id = s.id
)
ON CONFLICT (id) DO NOTHING;

-- Create user_profiles for staff that are missing them
INSERT INTO user_profiles (id, email, full_name, role, enrollment_id, staff_id, password_hash)
SELECT 
  s.id,
  s.email,
  s.name,
  'staff',
  s.enrollment_id,
  s.id,
  'NEEDS_RESET' -- These staff will need password reset
FROM staff s
WHERE NOT EXISTS (
  SELECT 1 FROM user_profiles up WHERE up.staff_id = s.id
)
ON CONFLICT (id) DO NOTHING;

-- Fix 5: Create missing indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);
CREATE INDEX IF NOT EXISTS idx_books_status ON books(status);
CREATE INDEX IF NOT EXISTS idx_students_enrollment ON students(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_staff_enrollment ON staff(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_borrow_records_book ON borrow_records(book_id);
CREATE INDEX IF NOT EXISTS idx_borrow_records_student ON borrow_records(student_id);
CREATE INDEX IF NOT EXISTS idx_borrow_records_staff ON borrow_records(staff_id);
CREATE INDEX IF NOT EXISTS idx_borrow_records_status ON borrow_records(status);
CREATE INDEX IF NOT EXISTS idx_borrow_records_due_date ON borrow_records(due_date);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_enrollment ON user_profiles(enrollment_id);

-- Fix 6: Verify admin user exists
-- ============================================
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Check if admin user exists in auth.users
  SELECT id INTO admin_user_id FROM auth.users WHERE email = 'iksotech@gmail.com';
  
  IF admin_user_id IS NOT NULL THEN
    -- Ensure user_profile exists
    INSERT INTO user_profiles (id, email, full_name, role, enrollment_id)
    VALUES (
      admin_user_id,
      'iksotech@gmail.com',
      'IKS ICT Admin',
      'librarian',
      'ADMIN001'
    )
    ON CONFLICT (id) DO UPDATE
    SET role = 'librarian',
        email = 'iksotech@gmail.com';
    
    RAISE NOTICE 'Admin user profile verified/created';
  ELSE
    RAISE NOTICE 'Admin user not found in auth.users - needs to be created via Supabase Auth';
  END IF;
END $$;

-- Fix 7: Clean up any invalid data
-- ============================================

-- Remove user_profiles with missing required fields for non-librarian users
-- (This helps prevent authentication issues)
UPDATE user_profiles
SET password_hash = 'NEEDS_RESET'
WHERE role IN ('student', 'staff')
  AND (password_hash IS NULL OR password_hash = '');

-- Report on data integrity
SELECT 'DATA INTEGRITY REPORT' AS report;

SELECT 
  'Total Books' AS metric,
  count(*) AS count
FROM books
UNION ALL
SELECT 
  'Total Students' AS metric,
  count(*) AS count
FROM students
UNION ALL
SELECT 
  'Total Staff' AS metric,
  count(*) AS count
FROM staff
UNION ALL
SELECT 
  'Total Borrow Records' AS metric,
  count(*) AS count
FROM borrow_records
UNION ALL
SELECT 
  'Total User Profiles' AS metric,
  count(*) AS count
FROM user_profiles
UNION ALL
SELECT 
  'Librarian Profiles' AS metric,
  count(*) AS count
FROM user_profiles
WHERE role = 'librarian';

-- Show any remaining issues
SELECT 'REMAINING ISSUES' AS report;

SELECT 
  'Students without profiles' AS issue,
  count(*) AS count
FROM students s
WHERE NOT EXISTS (SELECT 1 FROM user_profiles up WHERE up.student_id = s.id);

SELECT 
  'Staff without profiles' AS issue,
  count(*) AS count
FROM staff s
WHERE NOT EXISTS (SELECT 1 FROM user_profiles up WHERE up.staff_id = s.id);

SELECT 
  'Profiles needing password reset' AS issue,
  count(*) AS count
FROM user_profiles
WHERE password_hash = 'NEEDS_RESET';

-- Done
SELECT '✅ FIX SCRIPT COMPLETED' AS status;
