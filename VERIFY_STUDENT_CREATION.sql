-- TEST AND FIX: Student Account Creation System
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/myxwxakwlfjoovvlkkul/sql/new

-- ================================================================
-- PART 1: Verify Database Functions
-- ================================================================

-- Check if create_student_member function exists and its parameters
SELECT 
    'Function Check' as test_type,
    p.specific_name,
    p.parameter_name,
    p.data_type,
    p.parameter_mode,
    p.ordinal_position
FROM information_schema.parameters p
WHERE p.specific_schema = 'public'
AND p.specific_name IN (
    SELECT r.specific_name
    FROM information_schema.routines r
    WHERE r.routine_schema = 'public'
    AND r.routine_name = 'create_student_member'
)
ORDER BY p.ordinal_position;

-- ================================================================
-- PART 2: Ensure create_student_member Function is Correct
-- ================================================================

CREATE OR REPLACE FUNCTION create_student_member(
  p_name text,
  p_email text,
  p_phone_number text,
  p_grade_level text,
  p_enrollment_id text,
  p_password_hash text,
  p_calling_user_id uuid
)
RETURNS uuid AS $$
DECLARE
  v_student_id uuid;
BEGIN
  -- Check if caller is librarian
  IF NOT is_librarian(p_calling_user_id) THEN
    RAISE EXCEPTION 'Only librarians can create students';
  END IF;

  -- Check if enrollment_id already exists
  IF EXISTS (SELECT 1 FROM students WHERE enrollment_id = p_enrollment_id) THEN
    RAISE EXCEPTION 'Enrollment ID % already exists', p_enrollment_id;
  END IF;

  -- Insert student record
  INSERT INTO students (
    name, 
    email, 
    phone_number, 
    grade_level, 
    enrollment_id
  )
  VALUES (
    p_name, 
    p_email, 
    p_phone_number, 
    p_grade_level, 
    p_enrollment_id
  )
  RETURNING id INTO v_student_id;

  RETURN v_student_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- PART 3: Verify Table Columns
-- ================================================================

-- Check students table structure
SELECT 
    'students table' as table_name,
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'students'
ORDER BY ordinal_position;

-- Check user_profiles table structure  
SELECT 
    'user_profiles table' as table_name,
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;

-- ================================================================
-- PART 4: Verify Helper Functions
-- ================================================================

-- Check is_librarian function exists
SELECT 
    'Helper Functions' as check_type,
    routine_name,
    routine_type,
    'EXISTS' as status
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('is_librarian', 'create_student_member', 'create_staff_member')
ORDER BY routine_name;

-- ================================================================
-- PART 5: Check RLS Policies
-- ================================================================

-- View RLS policies on students table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename IN ('students', 'user_profiles', 'staff')
ORDER BY tablename, policyname;

-- ================================================================
-- PART 6: Test Librarian Permissions
-- ================================================================

-- Find an actual librarian user to test with
SELECT 
    'Librarian Users' as check_type,
    up.id,
    up.email,
    up.full_name,
    up.role,
    au.email as auth_email,
    au.created_at
FROM user_profiles up
JOIN auth.users au ON au.id = up.id
WHERE up.role = 'librarian'
ORDER BY up.created_at
LIMIT 5;

-- ================================================================
-- NEXT STEPS:
-- ================================================================
-- 1. Run this entire script
-- 2. Verify all outputs show:
--    - create_student_member function exists with correct parameters
--    - students table has: name, email, phone_number, grade_level, enrollment_id
--    - user_profiles table has: id, email, full_name, role, enrollment_id, student_id, parent_email
--    - is_librarian function exists
--    - At least one librarian user exists
-- 
-- 3. Try creating a new student account in your app
-- 4. If it fails, check the Edge Function logs:
--    https://supabase.com/dashboard/project/myxwxakwlfjoovvlkkul/functions/create-user-account
