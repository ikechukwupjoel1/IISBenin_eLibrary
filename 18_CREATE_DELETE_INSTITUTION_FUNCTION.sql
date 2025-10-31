-- Creates a function that can only be called by a super_admin to delete an institution.

CREATE OR REPLACE FUNCTION public.delete_institution(target_institution_id UUID)
RETURNS UUID AS $$
DECLARE
  current_user_role TEXT;
  deleted_id UUID;
BEGIN
  -- Get the role of the currently logged-in user
  SELECT role INTO current_user_role
  FROM public.user_profiles
  WHERE id = auth.uid();

  -- Ensure the user is a super_admin
  IF current_user_role IS NULL OR current_user_role != 'super_admin' THEN
    RAISE EXCEPTION 'Permission denied: You must be a super admin to perform this action.';
  END IF;

  -- Delete the institution and return its id
  DELETE FROM public.institutions
  WHERE id = target_institution_id
  RETURNING id INTO deleted_id;

  RETURN deleted_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
