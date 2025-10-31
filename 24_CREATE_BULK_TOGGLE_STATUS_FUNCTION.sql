-- Creates a function that can only be called by a super_admin to bulk toggle the active status of institutions.

CREATE OR REPLACE FUNCTION public.bulk_toggle_institution_status(
  target_institution_ids UUID[],
  new_status BOOLEAN
)
RETURNS SETOF UUID AS $$
DECLARE
  current_user_role TEXT;
  updated_ids UUID[];
BEGIN
  -- Permission Check
  SELECT role INTO current_user_role FROM public.user_profiles WHERE id = auth.uid();
  IF current_user_role IS NULL OR current_user_role != 'super_admin' THEN
    RAISE EXCEPTION 'Permission denied: You must be a super admin to perform this action.';
  END IF;

  -- Update the institutions and return their IDs
  UPDATE public.institutions
  SET is_active = new_status
  WHERE id = ANY(target_institution_ids)
  RETURNING id INTO updated_ids;

  RETURN QUERY SELECT unnest(updated_ids);

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
