-- Fixes the institution setup function to be more robust.
-- Instead of relying on JWT metadata, it looks up the user's institution
-- directly from the user_profiles table.

CREATE OR REPLACE FUNCTION public.update_institution_setup(new_name TEXT, new_tagline TEXT, new_logo_url TEXT)
RETURNS void AS $$
DECLARE
  current_institution_id UUID;
  current_user_role TEXT;
BEGIN
  -- Get the institution ID and role of the currently logged-in user directly from their profile
  SELECT institution_id, role INTO current_institution_id, current_user_role
  FROM public.user_profiles
  WHERE id = auth.uid();

  -- Ensure the user is actually a librarian
  IF current_user_role IS NULL OR current_user_role != 'librarian' THEN
    RAISE EXCEPTION 'Permission denied: You must be a librarian to perform this action.';
  END IF;

  -- Update the institution details
  UPDATE public.institutions
  SET 
    name = new_name,
    theme_settings = jsonb_build_object(
      'tagline', new_tagline,
      'logo_url', new_logo_url
    ),
    is_setup_complete = TRUE
  WHERE id = current_institution_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
