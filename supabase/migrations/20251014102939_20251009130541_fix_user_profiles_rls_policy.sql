/*
  # Fix User Profiles RLS Policy

  1. Changes
    - Drop and recreate the SELECT policy on user_profiles
    - Simplify to allow users to read their own profile immediately
    - Allow librarians and staff to read other profiles using SECURITY DEFINER function
  
  2. Security
    - Users can always read their own profile (no function call needed)
    - Librarians can read all profiles via get_user_role function
    - Staff can read student and staff profiles via get_user_role function
*/

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view their own profile and librarians see all" ON user_profiles;

-- Create new simplified SELECT policy
CREATE POLICY "Users can view their own profile and librarians see all"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() 
    OR get_user_role(auth.uid()) = 'librarian'
    OR (get_user_role(auth.uid()) = 'staff' AND role IN ('student', 'staff'))
  );