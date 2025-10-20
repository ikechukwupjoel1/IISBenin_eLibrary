-- COPY THIS ENTIRE SCRIPT AND PASTE INTO SUPABASE SQL EDITOR
-- Go to: https://supabase.com/dashboard/project/myxwxakwlfjoovvlkkul/sql/new
-- Paste this script and click RUN

-- Fix student STU70419874 linkage
DO $$
DECLARE
    v_student_id UUID;
    v_auth_user_id UUID;
BEGIN
    -- Get student ID
    SELECT id INTO v_student_id
    FROM students
    WHERE enrollment_id = 'STU70419874';
    
    -- Get auth user ID by looking up the email from students table
    SELECT au.id INTO v_auth_user_id
    FROM auth.users au
    JOIN students s ON au.email = s.email
    WHERE s.enrollment_id = 'STU70419874';
    
    -- Update user_profile to link correctly
    UPDATE user_profiles
    SET 
        student_id = v_student_id,
        enrollment_id = 'STU70419874'
    WHERE id = v_auth_user_id;
    
    -- Confirm email
    UPDATE auth.users
    SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
    WHERE id = v_auth_user_id;
    
    RAISE NOTICE 'Fixed! Student STU70419874 ready to login with password: Hv3NZ8zE';
END $$;

-- Verify the fix worked
SELECT 
    'Verification Results' as info,
    s.enrollment_id,
    s.name,
    s.email,
    up.student_id as profile_student_id,
    s.id as actual_student_id,
    (up.student_id = s.id) as linkage_correct,
    au.email_confirmed_at IS NOT NULL as email_confirmed
FROM students s
LEFT JOIN user_profiles up ON up.enrollment_id = s.enrollment_id
LEFT JOIN auth.users au ON au.id = up.id
WHERE s.enrollment_id = 'STU70419874';
