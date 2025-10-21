
-- Explicitly re-create the get_user_role function to ensure it exists.
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
  SELECT role INTO user_role 
  FROM user_profiles 
  WHERE id = user_uuid
  LIMIT 1;
  
  RETURN COALESCE(user_role, 'unknown');
END;
$$;

-- Ensure proper permissions
GRANT EXECUTE ON FUNCTION get_user_role(uuid) TO authenticated, anon;
