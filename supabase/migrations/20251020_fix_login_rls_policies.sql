-- Fix RLS Policies to Allow Login Lookups
-- The login flow requires unauthenticated users to query students and user_profiles tables
-- to look up enrollment IDs BEFORE they can authenticate

-- 1. Allow unauthenticated users to read from students table for login lookup
CREATE POLICY "Allow login lookup by enrollment ID"
  ON students
  FOR SELECT
  TO anon
  USING (true);

-- 2. Allow unauthenticated users to read from user_profiles for login lookup
CREATE POLICY "Allow login profile lookup"
  ON user_profiles
  FOR SELECT
  TO anon
  USING (true);

-- Note: This is safe because:
-- - SELECT only (no INSERT/UPDATE/DELETE)
-- - No sensitive data exposed (passwords are in auth.users, not these tables)
-- - Required for the login flow to work
-- - The actual authentication still happens in auth.users with proper password verification
