-- DEBUG STUDENT LOGIN ISSUE
-- Run this in Supabase SQL Editor to diagnose the problem

-- 1. Check if students exist
SELECT 
    'Students Table' AS check_type,
    id,
    name,
    enrollment_id,
    parent_email,
    email,
    created_at
FROM students
ORDER BY created_at DESC
LIMIT 5;

-- 2. Check if user_profiles exist for students
SELECT 
    'User Profiles for Students' AS check_type,
    up.id,
    up.email,
    up.full_name,
    up.role,
    up.enrollment_id,
    up.student_id,
    up.parent_email
FROM user_profiles up
WHERE up.role = 'student'
ORDER BY up.created_at DESC
LIMIT 5;

-- 3. Check if auth users exist with student emails
SELECT 
    'Auth Users for Students' AS check_type,
    au.id,
    au.email,
    au.created_at,
    au.confirmed_at,
    au.last_sign_in_at
FROM auth.users au
WHERE au.email IN (
    SELECT DISTINCT parent_email FROM students WHERE parent_email IS NOT NULL
    UNION
    SELECT DISTINCT email FROM user_profiles WHERE role = 'student'
);

-- 4. CRITICAL: Check if students are properly linked to user_profiles
SELECT 
    'Linkage Check' AS check_type,
    s.id AS student_id,
    s.name AS student_name,
    s.enrollment_id,
    s.parent_email AS student_parent_email,
    up.id AS profile_id,
    up.email AS profile_email,
    up.student_id AS profile_student_id_link,
    CASE 
        WHEN up.id IS NULL THEN '❌ No Profile'
        WHEN up.student_id IS NULL THEN '❌ Profile Not Linked'
        WHEN up.student_id != s.id THEN '❌ Wrong Link'
        ELSE '✅ Properly Linked'
    END AS status
FROM students s
LEFT JOIN user_profiles up ON up.student_id = s.id
ORDER BY s.created_at DESC
LIMIT 5;

-- 5. Check for orphaned records
SELECT 
    'Orphaned Profiles' AS issue_type,
    up.id,
    up.email,
    up.full_name,
    up.student_id,
    'Profile exists but student record missing' AS problem
FROM user_profiles up
WHERE up.role = 'student' 
AND up.student_id IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM students WHERE id = up.student_id);

-- 6. Check login logs for the enrollment ID you're trying to use
-- Replace 'YOUR_ENROLLMENT_ID' with the actual enrollment ID
SELECT 
    'Login Attempts' AS check_type,
    enrollment_id,
    user_id,
    success,
    login_at
FROM login_logs
-- WHERE enrollment_id = 'YOUR_ENROLLMENT_ID'  -- Uncomment and replace
ORDER BY login_at DESC
LIMIT 10;

-- 7. SOLUTION: If student exists but not properly linked, run this:
-- (Uncomment the student you want to fix)

/*
-- Find the student and auth user
WITH student_info AS (
    SELECT id, name, enrollment_id, parent_email
    FROM students
    WHERE enrollment_id = 'YOUR_ENROLLMENT_ID'  -- Replace with actual enrollment ID
),
auth_user AS (
    SELECT id, email
    FROM auth.users
    WHERE email = (SELECT parent_email FROM student_info)
)
-- Check what we found
SELECT 
    si.id AS student_id,
    si.name,
    si.enrollment_id,
    si.parent_email,
    au.id AS auth_user_id,
    au.email AS auth_email
FROM student_info si
CROSS JOIN auth_user au;
*/

-- 8. If records exist but aren't linked, create the user_profile manually:
/*
INSERT INTO user_profiles (
    id,
    email,
    full_name,
    role,
    enrollment_id,
    student_id,
    parent_email
)
SELECT 
    au.id,
    au.email,
    s.name,
    'student',
    s.enrollment_id,
    s.id,
    s.parent_email
FROM students s
CROSS JOIN auth.users au
WHERE s.enrollment_id = 'YOUR_ENROLLMENT_ID'  -- Replace
AND au.email = s.parent_email
AND NOT EXISTS (
    SELECT 1 FROM user_profiles WHERE student_id = s.id
);
*/

-- 9. COMPLETE DIAGNOSTIC: Show everything for a specific enrollment ID
-- Uncomment and replace YOUR_ENROLLMENT_ID
/*
WITH enrollment_check AS (
    SELECT 'YOUR_ENROLLMENT_ID' AS enrollment_id  -- Replace this
)
SELECT 
    'Complete Diagnostic' AS section,
    s.id AS student_id,
    s.name AS student_name,
    s.enrollment_id,
    s.parent_email AS student_parent_email,
    s.email AS student_direct_email,
    up.id AS profile_id,
    up.email AS profile_email,
    up.role AS profile_role,
    up.student_id AS profile_link_to_student,
    au.id AS auth_user_id,
    au.email AS auth_email,
    au.confirmed_at IS NOT NULL AS email_confirmed,
    CASE 
        WHEN s.id IS NULL THEN '❌ Student record not found'
        WHEN up.id IS NULL THEN '❌ User profile not created'
        WHEN up.student_id IS NULL THEN '❌ Profile not linked to student'
        WHEN up.student_id != s.id THEN '❌ Profile linked to wrong student'
        WHEN au.id IS NULL THEN '❌ Auth user not created'
        WHEN up.id != au.id THEN '❌ Profile ID mismatch with Auth user'
        ELSE '✅ Everything looks good'
    END AS diagnosis
FROM enrollment_check ec
LEFT JOIN students s ON s.enrollment_id = ec.enrollment_id
LEFT JOIN user_profiles up ON up.student_id = s.id
LEFT JOIN auth.users au ON au.id = up.id;
*/
