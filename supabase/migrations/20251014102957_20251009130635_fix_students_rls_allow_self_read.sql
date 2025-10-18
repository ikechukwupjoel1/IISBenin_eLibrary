/*
  # Fix Students RLS - Allow Students to Read Their Own Record

  1. Changes
    - Add SELECT policy for students to view their own record
    - This is needed for the books class_specific filter to work
  
  2. Security
    - Students can only read their own student record
    - Uses student_id from user_profiles to match
*/

-- Allow students to read their own record
CREATE POLICY "Students can view their own record"
  ON students
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT student_id 
      FROM user_profiles 
      WHERE id = auth.uid() AND student_id IS NOT NULL
    )
  );