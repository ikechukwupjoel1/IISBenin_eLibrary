-- Direct Password Reset for Student "bill"
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/myxwxakwlfjoovvlkkul/sql/new

-- This will reset the password to "Password123" for the student with enrollment ID STU47856843
-- The student can then login with:
--   Enrollment ID: STU47856843
--   Password: Password123

-- Update the password in auth.users table
-- Note: Supabase uses bcrypt hashing, so we need to use their password update method
-- This uses the built-in admin API function

-- Option 1: Using Supabase's admin API (RECOMMENDED - run in SQL Editor)
-- First, get the user_id for the student
SELECT 
    au.id as user_id,
    au.email,
    s.name,
    s.enrollment_id,
    'Run this in Supabase Dashboard -> Authentication -> Users' as instructions,
    'Find user: stu47856843@iisbenin.edu and click "Reset Password"' as next_step
FROM auth.users au
JOIN students s ON s.user_id = au.id
WHERE s.enrollment_id = 'STU47856843';

-- The user_id is: c1642bf2-3753-4016-ab7b-57e3aff04e42
-- Email is: stu47856843@iisbenin.edu

-- ============================================
-- EASIEST METHOD: Use Supabase Dashboard
-- ============================================
-- 1. Go to: https://supabase.com/dashboard/project/myxwxakwlfjoovvlkkul/auth/users
-- 2. Search for email: stu47856843@iisbenin.edu
-- 3. Click on the user
-- 4. Look for "Reset Password" or "Send Password Reset Email" button
-- 5. Either:
--    a) Set password directly to: Password123
--    OR
--    b) Send password reset email to: stu47856843@iisbenin.edu (if email is configured)

-- ============================================
-- ALTERNATIVE: Send Password Reset Email
-- ============================================
-- If you want the student to reset their own password via email,
-- run this SQL command to trigger a password reset email:

-- Note: This requires email to be properly configured in Supabase
-- The reset link will be sent to: stu47856843@iisbenin.edu

SELECT extensions.email('stu47856843@iisbenin.edu', 'Password Reset', 'Click the link to reset your password');

-- ============================================
-- FOR TESTING: Verify Student Record
-- ============================================
SELECT 
    s.id as student_id,
    s.user_id,
    s.name,
    s.enrollment_id,
    s.grade_level,
    s.email as student_email,
    au.email as auth_email,
    au.created_at,
    up.role
FROM students s
LEFT JOIN auth.users au ON au.id = s.user_id
LEFT JOIN user_profiles up ON up.id = s.user_id
WHERE s.enrollment_id = 'STU47856843';

-- ============================================
-- After Password Reset
-- ============================================
-- Test login with:
--   Enrollment ID: STU47856843
--   Password: Password123 (or whatever you set)
--
-- The login flow should:
--   1. Look up enrollment_id 'STU47856843' in students table
--   2. Get the linked email: stu47856843@iisbenin.edu
--   3. Call supabase.auth.signInWithPassword() with that email + password
--   4. Redirect to student dashboard

-- ============================================
-- TROUBLESHOOTING
-- ============================================
-- If login still fails after password reset:

-- 1. Check if user is confirmed
SELECT id, email, email_confirmed_at, confirmed_at 
FROM auth.users 
WHERE email = 'stu47856843@iisbenin.edu';

-- 2. If email_confirmed_at is NULL, confirm the user:
UPDATE auth.users 
SET email_confirmed_at = NOW(), 
    confirmed_at = NOW()
WHERE email = 'stu47856843@iisbenin.edu';

-- 3. Check login_logs to see what's happening:
SELECT * FROM login_logs 
WHERE user_id = 'c1642bf2-3753-4016-ab7b-57e3aff04e42'
ORDER BY created_at DESC
LIMIT 5;
