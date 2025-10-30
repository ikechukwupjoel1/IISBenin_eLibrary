-- Phase 2: Implement Row Level Security (RLS) - FIXED
-- This script creates a helper function in the PUBLIC schema to securely get the institution_id
-- from the currently authenticated user's JWT.

CREATE OR REPLACE FUNCTION public.get_current_institution_id()
RETURNS UUID AS $$
BEGIN
  -- Supabase stores custom claims in the 'raw_user_meta_data' field of the auth.users table.
  -- We expect the institution_id to be set as a custom claim during the login process.
  RETURN (SELECT raw_user_meta_data->>'institution_id' FROM auth.users WHERE id = auth.uid())::uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_current_institution_id IS 'A security-definer function to securely get the institution_id from the current user''s JWT claims.';