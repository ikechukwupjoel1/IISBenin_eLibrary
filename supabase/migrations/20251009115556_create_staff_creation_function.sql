/*
  # Create Staff Creation Function

  ## Issue
  When librarians create staff, the auth.signUp() changes the auth context to the new user,
  causing RLS policy checks to fail because get_user_role(auth.uid()) returns null for the new user.

  ## Solution
  Create a SECURITY DEFINER function that bypasses RLS to insert staff records.
  This function still validates that the calling user is a librarian.

  ## Changes
  1. Create create_staff_member function that:
     - Validates caller is a librarian
     - Inserts into staff table with RLS bypassed
     - Returns the created staff record

  ## Security
  - SECURITY DEFINER allows bypassing RLS
  - Function explicitly checks caller is a librarian before proceeding
  - Only allows inserting staff records, not modifying other data
*/

CREATE OR REPLACE FUNCTION create_staff_member(
  p_name text,
  p_email text,
  p_phone_number text,
  p_enrollment_id text,
  p_password_hash text,
  p_calling_user_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_staff_id uuid;
  v_caller_role text;
BEGIN
  -- Verify the calling user is a librarian
  SELECT role INTO v_caller_role
  FROM user_profiles
  WHERE id = p_calling_user_id;

  IF v_caller_role IS NULL OR v_caller_role != 'librarian' THEN
    RAISE EXCEPTION 'Only librarians can create staff members';
  END IF;

  -- Insert the staff member (bypasses RLS because of SECURITY DEFINER)
  INSERT INTO staff (name, email, phone_number, enrollment_id, password_hash)
  VALUES (p_name, p_email, p_phone_number, p_enrollment_id, p_password_hash)
  RETURNING id INTO v_staff_id;

  RETURN v_staff_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_staff_member(text, text, text, text, text, uuid) TO authenticated;

-- Create similar function for students
CREATE OR REPLACE FUNCTION create_student_member(
  p_name text,
  p_email text,
  p_phone_number text,
  p_grade_level text,
  p_enrollment_id text,
  p_password_hash text,
  p_calling_user_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_student_id uuid;
  v_caller_role text;
BEGIN
  -- Verify the calling user is a librarian
  SELECT role INTO v_caller_role
  FROM user_profiles
  WHERE id = p_calling_user_id;

  IF v_caller_role IS NULL OR v_caller_role != 'librarian' THEN
    RAISE EXCEPTION 'Only librarians can create students';
  END IF;

  -- Insert the student (bypasses RLS because of SECURITY DEFINER)
  INSERT INTO students (name, email, phone_number, grade_level, enrollment_id, password_hash)
  VALUES (p_name, p_email, p_phone_number, p_grade_level, p_enrollment_id, p_password_hash)
  RETURNING id INTO v_student_id;

  RETURN v_student_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_student_member(text, text, text, text, text, text, uuid) TO authenticated;
