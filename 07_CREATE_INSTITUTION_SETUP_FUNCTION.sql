-- A security-definer function that allows a librarian to update their own institution's details.

CREATE OR REPLACE FUNCTION public.update_institution_setup(new_name TEXT, new_tagline TEXT, new_logo_url TEXT)
RETURNS void AS $$
DECLARE
  current_institution_id UUID;
BEGIN
  -- Get the institution ID of the currently logged-in user
  current_institution_id := public.get_current_institution_id();

  -- Ensure the user is actually a librarian
  IF NOT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'librarian' AND institution_id = current_institution_id
  ) THEN
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
