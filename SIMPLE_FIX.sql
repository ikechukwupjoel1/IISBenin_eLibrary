-- SAFEST FIX: Only update user_profiles table
-- This avoids any issues with auth.users generated columns
-- Run this in Supabase SQL Editor

-- Step 1: Fix the linkage in user_profiles
UPDATE user_profiles up
SET student_id = s.id
FROM students s
WHERE s.enrollment_id = 'STU70419874'
  AND up.enrollment_id = 'STU70419874'
  AND (up.student_id IS NULL OR up.student_id != s.id);

-- Step 2: Verify the fix
SELECT 
    'After Fix' as status,
    s.enrollment_id,
    s.name,
    s.email as student_email,
    s.parent_email,
    up.id as profile_user_id,
    up.student_id as profile_links_to_student,
    s.id as actual_student_id,
    CASE 
        WHEN up.student_id = s.id THEN '✅ READY TO LOGIN!'
        ELSE '❌ Still needs fixing'
    END as result
FROM students s
JOIN user_profiles up ON up.enrollment_id = s.enrollment_id
WHERE s.enrollment_id = 'STU70419874';
