-- Creates a function that can only be called by a super_admin to toggle an institution's active status.

CREATE OR REPLACE FUNCTION public.toggle_institution_status(target_institution_id UUID)
RETURNS SETOF institutions AS $$
DECLARE
  current_user_role TEXT;
BEGIN
  -- Get the role of the currently logged-in user
  SELECT role INTO current_user_role
  FROM public.user_profiles
  WHERE id = auth.uid();

  -- Ensure the user is a super_admin
  IF current_user_role IS NULL OR current_user_role != 'super_admin' THEN
    RAISE EXCEPTION 'Permission denied: You must be a super admin to perform this action.';
  END IF;

  -- Toggle the is_active flag for the specified institution and return its new state
  RETURN QUERY
  UPDATE public.institutions
  SET is_active = NOT is_active
  WHERE id = target_institution_id
  RETURNING *;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
