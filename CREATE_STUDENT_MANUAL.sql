-- EMERGENCY WORKAROUND: Create Student Manually
-- Use this to create a test student without the Edge Function
-- Run in Supabase SQL Editor

DO $$
DECLARE
    v_enrollment_id TEXT := 'STU' || (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT::TEXT;
    v_parent_email TEXT := 'testparent@example.com';  -- CHANGE THIS
    v_student_name TEXT := 'Test Student';             -- CHANGE THIS
    v_grade_level TEXT := 'Grade 10';                  -- CHANGE THIS
    v_password TEXT := 'TestPass123';                  -- CHANGE THIS
    v_auth_user_id UUID;
    v_student_id UUID;
    v_librarian_id UUID;
BEGIN
    -- Get a librarian user ID (use your librarian ID)
    SELECT id INTO v_librarian_id 
    FROM user_profiles 
    WHERE role = 'librarian' 
    LIMIT 1;
    
    IF v_librarian_id IS NULL THEN
        RAISE EXCEPTION 'No librarian found. Please create a librarian first.';
    END IF;
    
    -- 1. Create auth user
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        invited_at,
        confirmation_token,
        confirmation_sent_at,
        recovery_token,
        recovery_sent_at,
        email_change_token_new,
        email_change,
        email_change_sent_at,
        last_sign_in_at,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin,
        created_at,
        updated_at,
        phone,
        phone_confirmed_at,
        phone_change,
        phone_change_token,
        phone_change_sent_at,
        confirmed_at,
        email_change_token_current,
        email_change_confirm_status,
        banned_until,
        reauthentication_token,
        reauthentication_sent_at,
        is_sso_user,
        deleted_at
    )
    VALUES (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        v_parent_email,
        crypt(v_password, gen_salt('bf')),
        NOW(),
        NULL,
        '',
        NULL,
        '',
        NULL,
        '',
        '',
        NULL,
        NULL,
        '{"provider":"email","providers":["email"]}',
        '{}',
        FALSE,
        NOW(),
        NOW(),
        NULL,
        NULL,
        '',
        '',
        NULL,
        NOW(),
        '',
        0,
        NULL,
        '',
        NULL,
        FALSE,
        NULL
    )
    RETURNING id INTO v_auth_user_id;
    
    -- 2. Create student record
    INSERT INTO students (
        id,
        name,
        email,
        grade_level,
        enrollment_id,
        created_at,
        updated_at
    )
    VALUES (
        gen_random_uuid(),
        v_student_name,
        v_parent_email,
        v_grade_level,
        v_enrollment_id,
        NOW(),
        NOW()
    )
    RETURNING id INTO v_student_id;
    
    -- 3. Create user_profile
    INSERT INTO user_profiles (
        id,
        email,
        full_name,
        role,
        student_id,
        enrollment_id,
        parent_email,
        created_at,
        updated_at
    )
    VALUES (
        v_auth_user_id,
        v_parent_email,
        v_student_name,
        'student',
        v_student_id,
        v_enrollment_id,
        v_parent_email,
        NOW(),
        NOW()
    );
    
    -- Output the credentials
    RAISE NOTICE '========================================';
    RAISE NOTICE 'STUDENT CREATED SUCCESSFULLY!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Enrollment ID: %', v_enrollment_id;
    RAISE NOTICE 'Password: %', v_password;
    RAISE NOTICE 'Parent Email: %', v_parent_email;
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Student can now login with:';
    RAISE NOTICE '  - Enrollment ID: %', v_enrollment_id;
    RAISE NOTICE '  - Password: %', v_password;
    RAISE NOTICE '========================================';
    
END $$;

-- Verify the student was created
SELECT 
    s.name,
    s.enrollment_id,
    s.email,
    s.grade_level,
    up.role,
    au.email as auth_email,
    au.email_confirmed_at IS NOT NULL as email_confirmed,
    '✅ Ready to login!' as status
FROM students s
JOIN user_profiles up ON up.student_id = s.id
JOIN auth.users au ON au.id = up.id
WHERE s.created_at > NOW() - INTERVAL '1 minute'
ORDER BY s.created_at DESC
LIMIT 1;
