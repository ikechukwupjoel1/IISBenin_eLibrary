-- Fix missing user_profile for student S0003
-- This student exists in students table but not in user_profiles

DO $$
DECLARE
  v_student_record RECORD;
  v_user_profile_id uuid;
BEGIN
  -- Get student details
  SELECT * INTO v_student_record
  FROM students
  WHERE enrollment_id = 'S0003';

  IF v_student_record IS NULL THEN
    RAISE EXCEPTION 'Student S0003 not found';
  END IF;

  -- Check if user_profile already exists
  SELECT id INTO v_user_profile_id
  FROM user_profiles
  WHERE student_id = v_student_record.id;

  IF v_user_profile_id IS NOT NULL THEN
    RAISE NOTICE 'User profile already exists for student S0003: %', v_user_profile_id;
  ELSE
    -- Create user_profile for this student
    INSERT INTO user_profiles (
      id,
      email,
      full_name,
      role,
      enrollment_id,
      student_id,
      institution_id,
      password_hash,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      LOWER(v_student_record.parent_email),  -- Use parent email
      v_student_record.name,
      'student',
      v_student_record.enrollment_id,
      v_student_record.id,
      v_student_record.institution_id,
      '*Zy5C^LemK$6',  -- Store password in plain text (as per current system)
      NOW(),
      NOW()
    )
    RETURNING id INTO v_user_profile_id;

    RAISE NOTICE 'Created user_profile for student S0003: %', v_user_profile_id;
  END IF;
END $$;

-- Verify the fix
SELECT 
  s.enrollment_id,
  s.name,
  s.parent_email,
  up.id as profile_id,
  up.email,
  up.role,
  up.password_hash,
  up.student_id
FROM students s
LEFT JOIN user_profiles up ON s.id = up.student_id
WHERE s.enrollment_id = 'S0003';
