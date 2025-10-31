-- Creates a function that can only be called by a super_admin to bulk delete institutions.

CREATE OR REPLACE FUNCTION public.bulk_delete_institutions(
  target_institution_ids UUID[]
)
RETURNS SETOF UUID AS $$
DECLARE
  current_user_role TEXT;
  deleted_ids UUID[];
BEGIN
  -- Permission Check
  SELECT role INTO current_user_role FROM public.user_profiles WHERE id = auth.uid();
  IF current_user_role IS NULL OR current_user_role != 'super_admin' THEN
    RAISE EXCEPTION 'Permission denied: You must be a super admin to perform this action.';
  END IF;

  -- Delete the institutions and return their IDs
  DELETE FROM public.institutions
  WHERE id = ANY(target_institution_ids)
  RETURNING id INTO deleted_ids;

  RETURN QUERY SELECT unnest(deleted_ids);

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
