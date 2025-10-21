-- Fix user_profiles table to allow staff and students without auth users
-- Remove the foreign key constraint that requires id to exist in auth.users

-- First, check if the constraint exists and drop it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'user_profiles'
    AND constraint_name LIKE '%auth%users%'
  ) THEN
    ALTER TABLE user_profiles DROP CONSTRAINT user_profiles_id_fkey;
  END IF;
END $$;

-- Make email nullable for students/staff who might not have email
ALTER TABLE user_profiles ALTER COLUMN email DROP NOT NULL;

-- Add enrollment_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'enrollment_id'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN enrollment_id text;
  END IF;
END $$;

-- Add password_hash column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN password_hash text;
  END IF;
END $$;

-- Create index on enrollment_id
CREATE INDEX IF NOT EXISTS idx_user_profiles_enrollment_id ON user_profiles(enrollment_id);

-- Update RLS policies to allow service role operations and non-auth users
DROP POLICY IF EXISTS "users_select_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "users_insert_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "users_update_own_profile" ON user_profiles;

-- New policies that work for both auth and non-auth users
CREATE POLICY "user_profiles_select_policy" ON user_profiles FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() OR
    get_user_role(auth.uid()) = 'librarian'
  );

-- Allow service role (Edge Functions) to insert profiles for students/staff
CREATE POLICY "user_profiles_insert_policy" ON user_profiles FOR INSERT
  WITH CHECK (
    auth.uid() = id OR
    get_user_role(auth.uid()) = 'librarian' OR
    (auth.role() = 'service_role')
  );

CREATE POLICY "user_profiles_update_policy" ON user_profiles FOR UPDATE
  TO authenticated
  USING (
    id = auth.uid() OR
    get_user_role(auth.uid()) = 'librarian'
  )
  WITH CHECK (
    id = auth.uid() OR
    get_user_role(auth.uid()) = 'librarian'
  );