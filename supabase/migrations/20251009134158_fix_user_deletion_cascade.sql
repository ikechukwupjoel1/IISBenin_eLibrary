/*
  # Fix User Deletion with Proper CASCADE

  1. Changes
    - Drop existing FK constraints on user_profiles
    - Recreate with CASCADE DELETE
    - When a student/staff is deleted, their user_profile is also deleted
    - When a user_profile is deleted, the auth user should be handled separately
  
  2. Security
    - Maintains RLS policies
    - Ensures clean deletion without orphaned records
*/

-- Drop existing foreign key constraints
ALTER TABLE user_profiles 
  DROP CONSTRAINT IF EXISTS user_profiles_student_id_fkey;

ALTER TABLE user_profiles 
  DROP CONSTRAINT IF EXISTS user_profiles_staff_id_fkey;

-- Recreate with CASCADE DELETE
ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_student_id_fkey
  FOREIGN KEY (student_id)
  REFERENCES students(id)
  ON DELETE CASCADE;

ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_staff_id_fkey
  FOREIGN KEY (staff_id)
  REFERENCES staff(id)
  ON DELETE CASCADE;
