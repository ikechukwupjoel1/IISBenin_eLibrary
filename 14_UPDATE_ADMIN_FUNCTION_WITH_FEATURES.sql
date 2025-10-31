-- Updates the super_admin_update_institution function to also accept a JSONB object for feature flags.

CREATE OR REPLACE FUNCTION public.super_admin_update_institution(
  target_institution_id UUID,
  new_name TEXT,
  new_tagline TEXT,
  new_logo_url TEXT,
  new_favicon_url TEXT,
  new_feature_flags JSONB
)
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

  -- Update the specified institution and return its new state
  RETURN QUERY
  UPDATE public.institutions
  SET 
    name = new_name,
    feature_flags = new_feature_flags,
    theme_settings = jsonb_build_object(
      'tagline', new_tagline,
      'logo_url', new_logo_url,
      'favicon_url', new_favicon_url
    )
  WHERE id = target_institution_id
  RETURNING *;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
