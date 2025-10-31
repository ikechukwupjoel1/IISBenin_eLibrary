-- Creates a function that can only be called by a super_admin to get platform-wide statistics.

CREATE OR REPLACE FUNCTION public.get_global_stats(
  start_date TIMESTAMPTZ DEFAULT NULL,
  end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  current_user_role TEXT;
  -- Lifetime Stats
  institution_count INT;
  active_institution_count INT;
  suspended_institution_count INT;
  setup_complete_count INT;
  setup_pending_count INT;
  total_student_count INT;
  total_staff_count INT;
  total_book_count INT;
  -- Range Stats
  range_student_count INT;
  range_staff_count INT;
  range_borrow_count INT;
  range_report_count INT;
BEGIN
  -- Get the role of the currently logged-in user
  SELECT role INTO current_user_role
  FROM public.user_profiles
  WHERE id = auth.uid();

  -- Ensure the user is a super_admin
  IF current_user_role IS NULL OR current_user_role != 'super_admin' THEN
    RAISE EXCEPTION 'Permission denied: You must be a super admin to perform this action.';
  END IF;

  -- === Lifetime Stats (not affected by date range) ===
  SELECT count(*) INTO institution_count FROM public.institutions;
  SELECT count(*) INTO active_institution_count FROM public.institutions WHERE is_active = TRUE;
  SELECT count(*) INTO suspended_institution_count FROM public.institutions WHERE is_active = FALSE;
  SELECT count(*) INTO setup_complete_count FROM public.institutions WHERE is_setup_complete = TRUE;
  SELECT count(*) INTO setup_pending_count FROM public.institutions WHERE is_setup_complete = FALSE;
  SELECT count(*) INTO total_book_count FROM public.books;
  SELECT count(*) INTO total_student_count FROM public.students;
  SELECT count(*) INTO total_staff_count FROM public.staff;

  -- === Date-Range Stats ===
  -- Use COALESCE to default to all-time if dates are NULL
  SELECT count(*) INTO range_student_count FROM public.students 
    WHERE created_at >= COALESCE(start_date, '1970-01-01') AND created_at <= COALESCE(end_date, NOW());
  SELECT count(*) INTO range_staff_count FROM public.staff 
    WHERE created_at >= COALESCE(start_date, '1970-01-01') AND created_at <= COALESCE(end_date, NOW());
  SELECT count(*) INTO range_borrow_count FROM public.borrow_records 
    WHERE created_at >= COALESCE(start_date, '1970-01-01') AND created_at <= COALESCE(end_date, NOW());
  SELECT count(*) INTO range_report_count FROM public.book_reports 
    WHERE created_at >= COALESCE(start_date, '1970-01-01') AND created_at <= COALESCE(end_date, NOW());

  -- Return the results as a nested JSON object
  RETURN json_build_object(
    'lifetime', json_build_object(
      'institutions', institution_count,
      'active_institutions', active_institution_count,
      'suspended_institutions', suspended_institution_count,
      'setup_complete_institutions', setup_complete_count,
      'setup_pending_institutions', setup_pending_count,
      'students', total_student_count,
      'staff', total_staff_count,
      'books', total_book_count
    ),
    'range', json_build_object(
      'new_students', range_student_count,
      'new_staff', range_staff_count,
      'borrows', range_borrow_count,
      'book_reports', range_report_count
    )
  );

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
