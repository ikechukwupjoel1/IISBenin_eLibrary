-- Fix RLS policies for staff table to allow librarians to UPDATE and DELETE

-- Drop existing policies
DROP POLICY IF EXISTS "staff_update_librarian" ON staff;
DROP POLICY IF EXISTS "staff_delete_librarian" ON staff;
DROP POLICY IF EXISTS "Librarians can update staff" ON staff;
DROP POLICY IF EXISTS "Librarians can delete staff" ON staff;

-- Create new policies with proper permissions
CREATE POLICY "Librarians can update staff"
  ON staff FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'librarian'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'librarian'
    )
  );

CREATE POLICY "Librarians can delete staff"
  ON staff FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'librarian'
    )
  );

-- Also verify the is_librarian function
CREATE OR REPLACE FUNCTION is_librarian(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = user_id AND role = 'librarian'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test query to verify current user's role
-- Run this after applying: SELECT role FROM user_profiles WHERE id = auth.uid();
