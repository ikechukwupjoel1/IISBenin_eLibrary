-- SIMPLE FIX for Student Bill Login
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/myxwxakwlfjoovvlkkul/sql/new

-- Step 1: Check current state
SELECT 
    'Current State' as status,
    s.id AS student_id,
    s.name AS student_name,
    s.enrollment_id,
    s.email AS student_email,
    s.grade_level,
    up.id AS profile_id,
    up.email AS profile_email,
    up.role AS profile_role,
    up.student_id AS profile_linked_to,
    au.id AS auth_user_id,
    au.email AS auth_email,
    au.email_confirmed_at IS NOT NULL AS email_confirmed
FROM students s
LEFT JOIN user_profiles up ON up.student_id = s.id
LEFT JOIN auth.users au ON au.email = s.email
WHERE s.enrollment_id = 'STU47856843';

-- Step 2: Fix the linkage
-- This will create or update the user_profile to link properly
DO $$
DECLARE
    v_student RECORD;
    v_auth_user RECORD;
BEGIN
    -- Get student record
    SELECT * INTO v_student
    FROM students
    WHERE enrollment_id = 'STU47856843';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Student with enrollment_id STU47856843 not found';
    END IF;
    
    -- Get auth user by email
    SELECT * INTO v_auth_user
    FROM auth.users
    WHERE email = v_student.email;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Auth user with email % not found', v_student.email;
    END IF;
    
    -- Check if user_profile exists
    IF EXISTS (SELECT 1 FROM user_profiles WHERE id = v_auth_user.id) THEN
        -- Update existing profile
        UPDATE user_profiles
        SET 
            email = v_student.email,
            full_name = v_student.name,
            role = 'student',
            student_id = v_student.id,
            enrollment_id = v_student.enrollment_id
        WHERE id = v_auth_user.id;
        
        RAISE NOTICE 'Updated user_profile for student bill';
    ELSE
        -- Create new profile
        INSERT INTO user_profiles (
            id,
            email,
            full_name,
            role,
            student_id,
            enrollment_id
        ) VALUES (
            v_auth_user.id,
            v_student.email,
            v_student.name,
            'student',
            v_student.id,
            v_student.enrollment_id
        );
        
        RAISE NOTICE 'Created user_profile for student bill';
    END IF;
    
    -- Confirm the email if not already confirmed
    UPDATE auth.users
    SET 
        email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
        confirmed_at = COALESCE(confirmed_at, NOW())
    WHERE id = v_auth_user.id;
    
    RAISE NOTICE 'Confirmed email for auth user';
END $$;

-- Step 3: Verify the fix worked
SELECT 
    'After Fix' as status,
    s.id AS student_id,
    s.name AS student_name,
    s.enrollment_id,
    s.email AS student_email,
    up.id AS profile_id,
    up.email AS profile_email,
    up.role AS profile_role,
    up.student_id AS profile_linked_to,
    au.email_confirmed_at IS NOT NULL AS email_confirmed,
    CASE 
        WHEN up.id IS NULL THEN '❌ Profile missing'
        WHEN up.student_id != s.id THEN '❌ Wrong linkage'
        WHEN au.email_confirmed_at IS NULL THEN '❌ Email not confirmed'
        ELSE '✅ READY TO LOGIN!'
    END AS diagnosis
FROM students s
LEFT JOIN user_profiles up ON up.student_id = s.id
LEFT JOIN auth.users au ON au.id = up.id
WHERE s.enrollment_id = 'STU47856843';

-- ================================================================
-- NEXT STEP: Reset Password in Supabase Dashboard
-- ================================================================
-- 1. Go to: https://supabase.com/dashboard/project/myxwxakwlfjoovvlkkul/auth/users
-- 2. Find user: stu47856843@iisbenin.edu
-- 3. Click the user, then click "Reset Password" or edit icon
-- 4. Set password to: Password123
-- 5. Save
--
-- Then test login:
--   - Enrollment ID: STU47856843
--   - Password: Password123
