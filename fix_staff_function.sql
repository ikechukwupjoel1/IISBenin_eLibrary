-- Fix the create_staff_member function
-- This ensures it properly inserts into the staff table

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
  v_caller_is_librarian boolean;
BEGIN
  -- Check if caller is librarian using the is_librarian function
  SELECT is_librarian(p_calling_user_id) INTO v_caller_is_librarian;

  IF NOT v_caller_is_librarian THEN
    RAISE EXCEPTION 'Only librarians can create staff members';
  END IF;

  -- Generate new UUID for staff
  v_staff_id := gen_random_uuid();

  -- Insert staff record directly
  INSERT INTO staff (id, name, email, phone_number, enrollment_id)
  VALUES (v_staff_id, p_name, p_email, p_phone_number, p_enrollment_id);

  -- Return the staff ID
  RETURN v_staff_id;
END;
$$;