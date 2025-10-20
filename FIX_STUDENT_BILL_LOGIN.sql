-- Fix Student "bill" Login Issue
-- The problem: AuthContext is looking for user_profiles linked via student_id, but it might not exist
-- Run this in Supabase SQL Editor

-- Step 1: Check current state
SELECT 
    'Student Record' as source,
    s.id as student_id,
    s.user_id,
    s.name,
    s.enrollment_id,
    s.email as student_email,
    s.grade_level
FROM students s
WHERE s.enrollment_id = 'STU47856843'

UNION ALL

SELECT 
    'Auth User' as source,
    NULL as student_id,
    au.id as user_id,
    NULL as name,
    NULL as enrollment_id,
    au.email as student_email,
    NULL as grade_level
FROM auth.users au
WHERE au.email = 'stu47856843@iisbenin.edu'

UNION ALL

SELECT 
    'User Profile' as source,
    up.student_id,
    up.id as user_id,
    up.full_name as name,
    up.enrollment_id,
    up.email as student_email,
    up.role as grade_level
FROM user_profiles up
WHERE up.email = 'stu47856843@iisbenin.edu'
   OR up.enrollment_id = 'STU47856843';

-- Step 2: Check if user_profile exists for this student
DO $$
DECLARE
    v_student_record RECORD;
    v_profile_exists BOOLEAN;
BEGIN
    -- Get student record
    SELECT * INTO v_student_record
    FROM students
    WHERE enrollment_id = 'STU47856843';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Student with enrollment_id STU47856843 not found';
    END IF;
    
    -- Check if profile exists
    SELECT EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE id = v_student_record.user_id
    ) INTO v_profile_exists;
    
    IF NOT v_profile_exists THEN
        -- Create the user_profile
        INSERT INTO user_profiles (
            id,
            email,
            full_name,
            role,
            student_id,
            enrollment_id
        ) VALUES (
            v_student_record.user_id,
            v_student_record.email,
            v_student_record.name,
            'student',
            v_student_record.id,
            v_student_record.enrollment_id
        );
        
        RAISE NOTICE 'Created user_profile for student bill';
    ELSE
        -- Update existing profile to ensure all fields are set
        UPDATE user_profiles
        SET 
            email = v_student_record.email,
            full_name = v_student_record.name,
            role = 'student',
            student_id = v_student_record.id,
            enrollment_id = v_student_record.enrollment_id
        WHERE id = v_student_record.user_id;
        
        RAISE NOTICE 'Updated user_profile for student bill';
    END IF;
END $$;

-- Step 3: Verify the fix
SELECT 
    s.name,
    s.enrollment_id,
    s.email as student_email,
    s.grade_level,
    up.id as profile_user_id,
    up.email as profile_email,
    up.full_name as profile_name,
    up.role as profile_role,
    up.student_id as linked_student_id,
    au.email as auth_email,
    au.email_confirmed_at,
    CASE 
        WHEN au.email_confirmed_at IS NULL THEN 'User email NOT confirmed - needs confirmation'
        ELSE 'User email confirmed - OK'
    END as email_status
FROM students s
LEFT JOIN user_profiles up ON up.id = s.user_id
LEFT JOIN auth.users au ON au.id = s.user_id
WHERE s.enrollment_id = 'STU47856843';

-- Step 4: Confirm the auth user email (if not already confirmed)
UPDATE auth.users
SET 
    email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
    confirmed_at = COALESCE(confirmed_at, NOW())
WHERE email = 'stu47856843@iisbenin.edu'
  AND (email_confirmed_at IS NULL OR confirmed_at IS NULL);

-- Step 5: Reset password to 'Password123'
-- NOTE: You must do this in the Supabase Dashboard
-- Go to: https://supabase.com/dashboard/project/myxwxakwlfjoovvlkkul/auth/users
-- Find user: stu47856843@iisbenin.edu
-- Click "Reset Password" and set to: Password123

-- Step 6: Test login
-- After running these queries:
-- 1. Go to your app
-- 2. Click "Student" tab
-- 3. Enter Enrollment ID: STU47856843
-- 4. Enter Password: Password123
-- 5. Click Sign In

-- Expected behavior:
-- 1. System looks up 'STU47856843' in students table
-- 2. Finds student record with email 'stu47856843@iisbenin.edu'
-- 3. Looks up user_profile by student_id
-- 4. Finds profile email 'stu47856843@iisbenin.edu'
-- 5. Calls auth.signInWithPassword with email + password
-- 6. Logs in successfully
