-- Creates a function that can only be called by a super_admin to get platform-wide statistics.

CREATE OR REPLACE FUNCTION public.get_global_stats()
RETURNS JSON AS $$
DECLARE
  current_user_role TEXT;
  institution_count INT;
  active_institution_count INT;
  suspended_institution_count INT;
  setup_complete_count INT;
  setup_pending_count INT;
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

  -- Run all counts across the tables
  SELECT count(*) INTO institution_count FROM public.institutions;
  SELECT count(*) INTO active_institution_count FROM public.institutions WHERE is_active = TRUE;
  SELECT count(*) INTO suspended_institution_count FROM public.institutions WHERE is_active = FALSE;
  SELECT count(*) INTO setup_complete_count FROM public.institutions WHERE is_setup_complete = TRUE;
  SELECT count(*) INTO setup_pending_count FROM public.institutions WHERE is_setup_complete = FALSE;
  SELECT count(*) INTO student_count FROM public.students;
  SELECT count(*) INTO staff_count FROM public.staff;
  SELECT count(*) INTO book_count FROM public.books;
  SELECT count(*) INTO borrow_count FROM public.borrow_records;
  SELECT count(*) INTO report_count FROM public.book_reports;

  -- Return the results as a JSON object
  RETURN json_build_object(
    'institutions', institution_count,
    'active_institutions', active_institution_count,
    'suspended_institutions', suspended_institution_count,
    'setup_complete_institutions', setup_complete_count,
    'setup_pending_institutions', setup_pending_count,
    'students', student_count,
    'staff', staff_count,
    'books', book_count,
    'total_borrows', borrow_count,
    'total_book_reports', report_count
  );

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
