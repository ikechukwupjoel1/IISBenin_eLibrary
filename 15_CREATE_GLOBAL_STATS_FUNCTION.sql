-- Creates a function that can only be called by a super_admin to get platform-wide statistics.

CREATE OR REPLACE FUNCTION public.get_global_stats()
RETURNS JSON AS $$
DECLARE
  current_user_role TEXT;
  institution_count INT;
  student_count INT;
  staff_count INT;
  book_count INT;
BEGIN
  -- Get the role of the currently logged-in user
  SELECT role INTO current_user_role
  FROM public.user_profiles
  WHERE id = auth.uid();

  -- Ensure the user is a super_admin
  IF current_user_role IS NULL OR current_user_role != 'super_admin' THEN
    RAISE EXCEPTION 'Permission denied: You must be a super admin to perform this action.';
  END IF;

  -- If the check passes, run the counts across the entire tables
  SELECT count(*) INTO institution_count FROM public.institutions;
  SELECT count(*) INTO student_count FROM public.students;
  SELECT count(*) INTO staff_count FROM public.staff;
  SELECT count(*) INTO book_count FROM public.books;

  -- Return the results as a JSON object
  RETURN json_build_object(
    'institutions', institution_count,
    'students', student_count,
    'staff', staff_count,
    'books', book_count
  );

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
