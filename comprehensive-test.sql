-- Comprehensive Database Health Check
-- Run this in Supabase SQL Editor to diagnose all issues

-- ============================================
-- 1. CHECK ALL TABLES EXIST
-- ============================================
SELECT 'TABLE EXISTENCE CHECK' AS test_section;

SELECT 
  'books' AS table_name,
  CASE WHEN to_regclass('public.books') IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END AS status,
  (SELECT count(*) FROM books) AS row_count
UNION ALL
SELECT 
  'students' AS table_name,
  CASE WHEN to_regclass('public.students') IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END AS status,
  (SELECT count(*) FROM students) AS row_count
UNION ALL
SELECT 
  'staff' AS table_name,
  CASE WHEN to_regclass('public.staff') IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END AS status,
  (SELECT count(*) FROM staff) AS row_count
UNION ALL
SELECT 
  'borrow_records' AS table_name,
  CASE WHEN to_regclass('public.borrow_records') IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END AS status,
  (SELECT count(*) FROM borrow_records) AS row_count
UNION ALL
SELECT 
  'user_profiles' AS table_name,
  CASE WHEN to_regclass('public.user_profiles') IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END AS status,
  (SELECT count(*) FROM user_profiles) AS row_count;

-- ============================================
-- 2. CHECK ADMIN USER
-- ============================================
SELECT 'ADMIN USER CHECK' AS test_section;

SELECT 
  id,
  email,
  full_name,
  role,
  enrollment_id,
  created_at
FROM user_profiles
WHERE email = 'iksotech@gmail.com' OR role = 'librarian';

-- Check auth.users for admin
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE email = 'iksotech@gmail.com';

-- ============================================
-- 3. CHECK RLS POLICIES
-- ============================================
SELECT 'RLS POLICIES CHECK' AS test_section;

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual::text AS using_clause
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================
-- 4. CHECK SAMPLE DATA
-- ============================================
SELECT 'SAMPLE DATA - STUDENTS' AS test_section;
SELECT id, name, enrollment_id, email, phone_number, grade_level, created_at 
FROM students 
ORDER BY created_at DESC 
LIMIT 5;

SELECT 'SAMPLE DATA - STAFF' AS test_section;
SELECT id, name, enrollment_id, email, phone_number, created_at 
FROM staff 
ORDER BY created_at DESC 
LIMIT 5;

SELECT 'SAMPLE DATA - BOOKS' AS test_section;
SELECT id, title, author_publisher, isbn, category, status, created_at 
FROM books 
ORDER BY created_at DESC 
LIMIT 5;

SELECT 'SAMPLE DATA - BORROW RECORDS' AS test_section;
SELECT id, book_id, student_id, staff_id, status, borrow_date, due_date, return_date 
FROM borrow_records 
ORDER BY created_at DESC 
LIMIT 5;

-- ============================================
-- 5. CHECK USER_PROFILES INTEGRITY
-- ============================================
SELECT 'USER PROFILES INTEGRITY' AS test_section;

-- Find profiles missing student/staff references
SELECT 
  id,
  full_name,
  role,
  enrollment_id,
  student_id,
  staff_id,
  CASE 
    WHEN role = 'student' AND student_id IS NULL THEN '❌ Missing student link'
    WHEN role = 'staff' AND staff_id IS NULL THEN '❌ Missing staff link'
    ELSE '✅ OK'
  END AS integrity_check
FROM user_profiles
WHERE role IN ('student', 'staff');

-- ============================================
-- 6. CHECK FUNCTIONS
-- ============================================
SELECT 'FUNCTION CHECK' AS test_section;

SELECT 
  proname AS function_name,
  pg_get_function_arguments(oid) AS arguments,
  prosecdef AS is_security_definer
FROM pg_proc
WHERE proname IN ('is_librarian', 'create_student_member', 'create_staff_member')
ORDER BY proname;

-- ============================================
-- 7. CHECK FOR ORPHANED RECORDS
-- ============================================
SELECT 'ORPHANED RECORDS CHECK' AS test_section;

-- Students without profiles
SELECT 'Students without user_profiles' AS issue, count(*) AS count
FROM students s
WHERE NOT EXISTS (SELECT 1 FROM user_profiles up WHERE up.student_id = s.id);

-- Staff without profiles
SELECT 'Staff without user_profiles' AS issue, count(*) AS count
FROM staff s
WHERE NOT EXISTS (SELECT 1 FROM user_profiles up WHERE up.staff_id = s.id);

-- Profiles without student/staff records
SELECT 'Student profiles without student records' AS issue, count(*) AS count
FROM user_profiles up
WHERE role = 'student' AND student_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM students s WHERE s.id = up.student_id);

SELECT 'Staff profiles without staff records' AS issue, count(*) AS count
FROM user_profiles up
WHERE role = 'staff' AND staff_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM staff s WHERE s.id = up.staff_id);
