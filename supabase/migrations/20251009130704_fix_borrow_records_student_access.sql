/*
  # Fix Borrow Records RLS - Allow Students to View Their Own Records

  1. Changes
    - Add SELECT policy for students to view their own borrow records
    - Students need to see their borrowed books in MyBooks component
  
  2. Security
    - Students can only read borrow records where they are the borrower
    - Uses student_id from user_profiles to match
*/

-- Allow students to view their own borrow records
CREATE POLICY "Students can view their own borrow records"
  ON borrow_records
  FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT student_id 
      FROM user_profiles 
      WHERE id = auth.uid() AND student_id IS NOT NULL
    )
  );
