-- Fix the newly created student STU70419874
-- This will ensure proper linkage between student, user_profile, and auth.users

DO $$
DECLARE
    v_student RECORD;
    v_auth_user RECORD;
    v_profile RECORD;
BEGIN
    -- Get student record
    SELECT * INTO v_student
    FROM students
    WHERE enrollment_id = 'STU70419874';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Student STU70419874 not found';
    END IF;
    
    -- Get auth user by email
    SELECT * INTO v_auth_user
    FROM auth.users
    WHERE email = v_student.email;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Auth user with email % not found', v_student.email;
    END IF;
    
    -- Check if user_profile exists
    SELECT * INTO v_profile
    FROM user_profiles
    WHERE id = v_auth_user.id;
    
    IF FOUND THEN
        -- Update existing profile
        UPDATE user_profiles
        SET 
            student_id = v_student.id,
            enrollment_id = v_student.enrollment_id,
            email = v_student.email,
            full_name = v_student.name,
            role = 'student'
        WHERE id = v_auth_user.id;
        
        RAISE NOTICE 'Updated user_profile for student %', v_student.enrollment_id;
    ELSE
        -- Create new profile (shouldn't happen but just in case)
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
        
        RAISE NOTICE 'Created user_profile for student %', v_student.enrollment_id;
    END IF;
    
    -- Confirm email if not already confirmed
    UPDATE auth.users
    SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
    WHERE id = v_auth_user.id;
    
    RAISE NOTICE '✅ Student % is now ready to login!', v_student.enrollment_id;
    RAISE NOTICE 'Login with:';
    RAISE NOTICE '  Enrollment ID: %', v_student.enrollment_id;
    RAISE NOTICE '  Password: Hv3NZ8zE';
    
END $$;

-- Verify the fix
SELECT 
    '✅ VERIFICATION' as status,
    s.enrollment_id,
    s.name,
    s.email AS student_email,
    up.id AS profile_id,
    up.student_id AS profile_links_to_student,
    au.email AS auth_email,
    au.email_confirmed_at IS NOT NULL AS email_confirmed,
    CASE 
        WHEN up.student_id = s.id THEN '✅ READY TO LOGIN!'
        ELSE '❌ Still broken'
    END AS final_status
FROM students s
JOIN user_profiles up ON up.student_id = s.id
JOIN auth.users au ON au.id = up.id
WHERE s.enrollment_id = 'STU70419874';
