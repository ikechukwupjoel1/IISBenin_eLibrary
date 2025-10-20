-- COMPLETE FIX for Student Bill Login
-- This handles the case where student.email might be NULL
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/myxwxakwlfjoovvlkkul/sql/new

-- Step 1: Find all related records
SELECT 
    'Student Record' as source,
    s.id,
    s.name,
    s.enrollment_id,
    s.email,
    s.parent_email,
    s.grade_level
FROM students s
WHERE s.enrollment_id = 'STU47856843'

UNION ALL

SELECT 
    'Auth Users (matching pattern)',
    au.id,
    au.email,
    NULL,
    NULL,
    NULL,
    NULL
FROM auth.users au
WHERE au.email LIKE '%47856843%'

UNION ALL

SELECT 
    'User Profiles (if exists)',
    up.id,
    up.full_name,
    up.enrollment_id,
    up.email,
    up.parent_email,
    up.role
FROM user_profiles up
WHERE up.enrollment_id = 'STU47856843';

-- Step 2: Fix the linkage (handles NULL email)
DO $$
DECLARE
    v_student RECORD;
    v_auth_user RECORD;
    v_auth_email TEXT;
    v_final_email TEXT;
BEGIN
    -- Get student record
    SELECT * INTO v_student
    FROM students
    WHERE enrollment_id = 'STU47856843';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Student with enrollment_id STU47856843 not found';
    END IF;
    
    RAISE NOTICE 'Found student: % (email: %, parent_email: %)', 
        v_student.name, v_student.email, v_student.parent_email;
    
    -- Try to find auth user by email, parent_email, or pattern
    IF v_student.email IS NOT NULL THEN
        SELECT * INTO v_auth_user FROM auth.users WHERE email = v_student.email;
    END IF;
    
    IF v_auth_user IS NULL AND v_student.parent_email IS NOT NULL THEN
        SELECT * INTO v_auth_user FROM auth.users WHERE email = v_student.parent_email;
    END IF;
    
    -- Pattern match as last resort (e.g., stu47856843@iisbenin.edu)
    IF v_auth_user IS NULL THEN
        SELECT * INTO v_auth_user
        FROM auth.users
        WHERE email ILIKE '%' || REPLACE(v_student.enrollment_id, 'STU', '') || '%'
        LIMIT 1;
    END IF;
    
    IF v_auth_user IS NULL THEN
        RAISE EXCEPTION 'No auth user found for student %. Please create one first.', v_student.enrollment_id;
    END IF;
    
    RAISE NOTICE 'Found auth user: % (id: %)', v_auth_user.email, v_auth_user.id;
    
    -- Determine which email to use in user_profiles
    v_final_email := COALESCE(v_student.parent_email, v_student.email, v_auth_user.email);
    
    -- Update student record to have email if missing
    IF v_student.email IS NULL THEN
        UPDATE students
        SET email = v_auth_user.email
        WHERE id = v_student.id;
        RAISE NOTICE 'Updated student email to: %', v_auth_user.email;
    END IF;
    
    -- Create or update user_profile
    IF EXISTS (SELECT 1 FROM user_profiles WHERE id = v_auth_user.id) THEN
        UPDATE user_profiles
        SET 
            email = v_final_email,
            full_name = v_student.name,
            role = 'student',
            student_id = v_student.id,
            enrollment_id = v_student.enrollment_id,
            parent_email = v_student.parent_email
        WHERE id = v_auth_user.id;
        RAISE NOTICE 'Updated user_profile for %', v_auth_user.email;
    ELSE
        INSERT INTO user_profiles (
            id,
            email,
            full_name,
            role,
            student_id,
            enrollment_id,
            parent_email
        ) VALUES (
            v_auth_user.id,
            v_final_email,
            v_student.name,
            'student',
            v_student.id,
            v_student.enrollment_id,
            v_student.parent_email
        );
        RAISE NOTICE 'Created user_profile for %', v_auth_user.email;
    END IF;
    
    -- Confirm the email
    UPDATE auth.users
    SET 
        email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
        confirmed_at = COALESCE(confirmed_at, NOW())
    WHERE id = v_auth_user.id;
    
    RAISE NOTICE 'Email confirmed for auth user';
    RAISE NOTICE '✅ Student is now ready to login!';
END $$;

-- Step 3: Verify everything is linked correctly
SELECT 
    '✅ VERIFICATION' as status,
    s.id AS student_id,
    s.name,
    s.enrollment_id,
    s.email AS student_email,
    s.parent_email,
    up.id AS profile_user_id,
    up.email AS profile_email,
    up.student_id AS profile_links_to_student,
    au.email AS auth_email,
    au.email_confirmed_at IS NOT NULL AS email_confirmed,
    CASE 
        WHEN up.id IS NULL THEN '❌ No user profile'
        WHEN up.student_id != s.id THEN '❌ Profile not linked to student'
        WHEN up.id != au.id THEN '❌ Profile ID mismatch'
        WHEN au.email_confirmed_at IS NULL THEN '⚠️ Email not confirmed'
        ELSE '✅ READY TO LOGIN!'
    END AS status_check,
    'Use enrollment: ' || s.enrollment_id || ' with auth email: ' || au.email AS login_info
FROM students s
LEFT JOIN user_profiles up ON up.student_id = s.id
LEFT JOIN auth.users au ON au.id = up.id
WHERE s.enrollment_id = 'STU47856843';

-- ================================================================
-- FINAL STEPS:
-- ================================================================
-- 1. Run this entire script in SQL Editor
-- 2. Check the verification output - should say "✅ READY TO LOGIN!"
-- 3. Note the auth_email from the output
-- 4. Go to: https://supabase.com/dashboard/project/myxwxakwlfjoovvlkkul/auth/users
-- 5. Find that auth_email and reset password to: Password123
-- 6. Test login:
--    - Enrollment ID: STU47856843
--    - Password: Password123
