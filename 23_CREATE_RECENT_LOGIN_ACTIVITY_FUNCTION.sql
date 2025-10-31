-- Creates a function that can only be called by a super_admin to get recent login activity.

CREATE OR REPLACE FUNCTION public.get_recent_login_activity(
  _limit INT DEFAULT 10
)
RETURNS TABLE (
  login_at TIMESTAMPTZ,
  enrollment_id TEXT,
  status TEXT,
  role TEXT,
  full_name TEXT,
  institution_id UUID
) AS $$
DECLARE
  current_user_role TEXT;
BEGIN
  -- Permission Check
  SELECT role INTO current_user_role FROM public.user_profiles WHERE id = auth.uid();
  IF current_user_role IS NULL OR current_user_role != 'super_admin' THEN
    RAISE EXCEPTION 'Permission denied: You must be a super admin to perform this action.';
  END IF;

  -- Return recent login logs
  RETURN QUERY
  SELECT
    ll.login_at,
    ll.enrollment_id,
    ll.status,
    ll.role,
    ll.full_name,
    ll.institution_id
  FROM public.login_logs ll
  ORDER BY ll.login_at DESC
  LIMIT _limit;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
