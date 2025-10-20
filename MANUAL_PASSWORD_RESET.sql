-- MANUAL PASSWORD RESET FOR STUDENT bill (STU47856843)
-- Run this in Supabase SQL Editor

-- Step 1: Verify the user
SELECT 
    s.name,
    s.enrollment_id,
    up.id AS user_id,
    up.email AS login_email
FROM students s
JOIN user_profiles up ON up.student_id = s.id
WHERE s.enrollment_id = 'STU47856843';

-- Expected result:
-- name: bill
-- enrollment_id: STU47856843
-- user_id: c1642bf2-3753-4016-ab7b-57e3aff04e42
-- login_email: stu47856843@iisbenin.edu

-- ========================================
-- OPTION 1: Reset via Supabase Dashboard (RECOMMENDED)
-- ========================================
-- 1. Go to: https://supabase.com/dashboard/project/myxwxakwlfjoovvlkkul/auth/users
-- 2. Search for: stu47856843@iisbenin.edu
-- 3. Click on the user
-- 4. Click "Reset Password" 
-- 5. Set new password: Password123
-- 6. Save

-- ========================================
-- OPTION 2: Test Edge Function in Dashboard
-- ========================================
-- 1. Go to: https://supabase.com/dashboard/project/myxwxakwlfjoovvlkkul/functions/reset-user-password/details
-- 2. Click "Invoke"
-- 3. Use this payload:
{
  "user_id": "c1642bf2-3753-4016-ab7b-57e3aff04e42",
  "new_password": "Password123"
}
-- 4. Add Authorization header with your librarian JWT token
-- 5. Add apikey header: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15eHd4YWt3bGZqb292dmxra3VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjc5MzEzMjMsImV4cCI6MjA0MzUwNzMyM30.fq1oFSe92B2tHGdJFAGU5A-YkD7qKePrqTIDe1Y3YTo

-- ========================================
-- AFTER RESET, TEST LOGIN:
-- ========================================
-- Enrollment ID: STU47856843
-- Password: Password123

-- ========================================
-- VERIFY LOGIN ATTEMPT
-- ========================================
SELECT 
    enrollment_id,
    success,
    login_at
FROM login_logs
WHERE enrollment_id = 'STU47856843'
ORDER BY login_at DESC
LIMIT 3;
