-- Fix RLS policy to allow anonymous users to read staff records during login
-- This is needed because users need to look up their staff record BEFORE they're authenticated

-- Drop the existing temporary policy
DROP POLICY IF EXISTS "Authenticated users can view all staff (TEMP)" ON staff;

-- Create a new policy that allows both authenticated AND anonymous users to SELECT
-- This is safe because staff records only contain non-sensitive data (name, email, enrollment_id)
CREATE POLICY "Anyone can view staff for login verification"
  ON staff FOR SELECT
  USING (true);

-- Verify the policy was created
SELECT 
  policyname,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'staff' AND cmd = 'SELECT';
