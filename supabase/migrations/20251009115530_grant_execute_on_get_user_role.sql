/*
  # Grant Execute Permission on get_user_role Function

  ## Issue
  RLS policies may be failing because the get_user_role function doesn't have proper grants.

  ## Changes
  1. Grant EXECUTE permission on get_user_role to authenticated and anon roles
  2. Ensure the function has proper SECURITY DEFINER attribute

  ## Security
  - Function remains SECURITY DEFINER to bypass RLS when checking roles
  - Only returns role information, not sensitive data
*/

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_role(uuid) TO anon;

-- Ensure the function is stable and secure
ALTER FUNCTION get_user_role(uuid) STABLE;
ALTER FUNCTION get_user_role(uuid) SECURITY DEFINER;
