-- Creates a function that can only be called by a super_admin to create a new institution.

CREATE OR REPLACE FUNCTION public.create_institution(new_name TEXT)
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

  -- Insert the new institution and return it
  RETURN QUERY
  INSERT INTO public.institutions (name)
  VALUES (new_name)
  RETURNING *;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
