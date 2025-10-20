-- DIAGNOSTIC: Find all records related to STU70419874
-- Run this first to see what's actually in the database

-- Check students table
SELECT 'STUDENTS TABLE' as source, id, enrollment_id, name, email, parent_email, created_at
FROM students
WHERE enrollment_id = 'STU70419874';

-- Check user_profiles table
SELECT 'USER_PROFILES TABLE' as source, id, email, full_name, role, student_id, enrollment_id, parent_email
FROM user_profiles
WHERE enrollment_id = 'STU70419874' OR email LIKE '%70419874%' OR parent_email LIKE '%@%';

-- Check auth.users table (looking for any email that might match)
SELECT 'AUTH.USERS TABLE' as source, id, email, email_confirmed_at, created_at
FROM auth.users
WHERE email IN (
    SELECT DISTINCT email FROM students WHERE enrollment_id = 'STU70419874'
    UNION
    SELECT DISTINCT parent_email FROM students WHERE enrollment_id = 'STU70419874' AND parent_email IS NOT NULL
)
OR email LIKE '%test%'
ORDER BY created_at DESC
LIMIT 5;

-- Show the relationship breakdown
SELECT 
    'RELATIONSHIP CHECK' as analysis,
    s.enrollment_id,
    s.email as student_email,
    s.parent_email,
    up.id as profile_id,
    up.email as profile_email,
    up.parent_email as profile_parent_email,
    up.student_id as profile_points_to,
    au.email as auth_email,
    CASE 
        WHEN up.student_id = s.id THEN '✅ Linked correctly'
        WHEN up.student_id IS NULL THEN '❌ student_id is NULL'
        ELSE '❌ student_id points to wrong record'
    END as link_status
FROM students s
LEFT JOIN user_profiles up ON s.enrollment_id = up.enrollment_id
LEFT JOIN auth.users au ON au.id = up.id
WHERE s.enrollment_id = 'STU70419874';
