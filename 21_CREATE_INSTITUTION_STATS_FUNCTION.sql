-- Creates a function that can only be called by a super_admin to get statistics for a specific institution.

CREATE OR REPLACE FUNCTION public.get_institution_stats(target_institution_id UUID)
RETURNS JSON AS $$
DECLARE
  current_user_role TEXT;
  student_count INT;
  staff_count INT;
  book_count INT;
  borrow_count INT;
  report_count INT;
BEGIN
  -- Get the role of the currently logged-in user
  SELECT role INTO current_user_role
  FROM public.user_profiles
  WHERE id = auth.uid();

  -- Ensure the user is a super_admin
  IF current_user_role IS NULL OR current_user_role != 'super_admin' THEN
    RAISE EXCEPTION 'Permission denied: You must be a super admin to perform this action.';
  END IF;

  -- Run counts for the specified institution
  SELECT count(*) INTO student_count FROM public.students WHERE institution_id = target_institution_id;
  SELECT count(*) INTO staff_count FROM public.staff WHERE institution_id = target_institution_id;
  SELECT count(*) INTO book_count FROM public.books WHERE institution_id = target_institution_id;
  SELECT count(*) INTO borrow_count FROM public.borrow_records WHERE institution_id = target_institution_id;
  SELECT count(*) INTO report_count FROM public.book_reports WHERE institution_id = target_institution_id;

  -- Return the results as a JSON object
  RETURN json_build_object(
    'students', student_count,
    'staff', staff_count,
    'books', book_count,
    'borrows', borrow_count,
    'reports', report_count
  );

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
