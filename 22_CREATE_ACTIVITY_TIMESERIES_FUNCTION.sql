-- Creates a function to get time-series data for platform activity, callable only by a super_admin.

CREATE OR REPLACE FUNCTION public.get_activity_stats_timeseries(
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ
)
RETURNS JSON AS $$
DECLARE
  current_user_role TEXT;
BEGIN
  -- Permission Check
  SELECT role INTO current_user_role FROM public.user_profiles WHERE id = auth.uid();
  IF current_user_role IS NULL OR current_user_role != 'super_admin' THEN
    RAISE EXCEPTION 'Permission denied: You must be a super admin to perform this action.';
  END IF;

  -- Logic
  WITH days AS (
    SELECT generate_series(
      date_trunc('day', start_date),
      date_trunc('day', end_date),
      '1 day'::interval
    ) AS day
  ),
  daily_students AS (
    SELECT date_trunc('day', created_at) as day, count(id) as count
    FROM public.students
    WHERE created_at BETWEEN start_date AND end_date
    GROUP BY 1
  ),
  daily_staff AS (
    SELECT date_trunc('day', created_at) as day, count(id) as count
    FROM public.staff
    WHERE created_at BETWEEN start_date AND end_date
    GROUP BY 1
  ),
  daily_borrows AS (
    SELECT date_trunc('day', created_at) as day, count(id) as count
    FROM public.borrow_records
    WHERE created_at BETWEEN start_date AND end_date
    GROUP BY 1
  ),
  daily_reports AS (
    SELECT date_trunc('day', created_at) as day, count(id) as count
    FROM public.book_reports
    WHERE created_at BETWEEN start_date AND end_date
    GROUP BY 1
  )
  SELECT json_agg(t) FROM (
    SELECT
      to_char(days.day, 'YYYY-MM-DD') AS date,
      COALESCE(daily_students.count, 0) AS new_students,
      COALESCE(daily_staff.count, 0) AS new_staff,
      COALESCE(daily_borrows.count, 0) AS borrows,
      COALESCE(daily_reports.count, 0) AS book_reports
    FROM days
    LEFT JOIN daily_students ON days.day = daily_students.day
    LEFT JOIN daily_staff ON days.day = daily_staff.day
    LEFT JOIN daily_borrows ON days.day = daily_borrows.day
    LEFT JOIN daily_reports ON days.day = daily_reports.day
    ORDER BY days.day
  ) t;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
