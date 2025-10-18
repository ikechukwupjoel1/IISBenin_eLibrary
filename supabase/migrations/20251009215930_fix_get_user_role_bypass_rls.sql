/*
  # Fix get_user_role to Bypass RLS

  1. Problem
    - The get_user_role() function queries user_profiles table
    - The user_profiles RLS policy calls get_user_role()
    - This creates a circular dependency causing infinite loop
  
  2. Solution
    - Replace the function with a version that explicitly bypasses RLS
    - Use plpgsql and SECURITY DEFINER
    - The SET clause helps ensure proper execution context

  3. Security
    - Function runs with definer privileges (bypasses RLS)
    - Only returns role field, no sensitive data exposed
    - Granted to authenticated and anon for login flow
*/

-- Replace the function (OR REPLACE doesn't require CASCADE)
CREATE OR REPLACE FUNCTION get_user_role(user_uuid uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
BEGIN
  -- This runs with SECURITY DEFINER privileges, bypassing RLS
  SELECT role INTO user_role 
  FROM user_profiles 
  WHERE id = user_uuid
  LIMIT 1;
  
  RETURN user_role;
END;
$$;

-- Ensure proper permissions
GRANT EXECUTE ON FUNCTION get_user_role(uuid) TO authenticated, anon;
