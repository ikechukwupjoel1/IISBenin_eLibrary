-- Fix students table structure
-- Run this in your Supabase SQL Editor

-- First, let's check what columns exist and add missing ones
DO $$ 
BEGIN
  -- Add enrollment_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'students' AND column_name = 'enrollment_id'
  ) THEN
    ALTER TABLE students ADD COLUMN enrollment_id text;
  END IF;

  -- Add email if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'students' AND column_name = 'email'
  ) THEN
    ALTER TABLE students ADD COLUMN email text;
  END IF;

  -- Add phone_number if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'students' AND column_name = 'phone_number'
  ) THEN
    ALTER TABLE students ADD COLUMN phone_number text;
  END IF;

  -- Add grade_level if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'students' AND column_name = 'grade_level'
  ) THEN
    ALTER TABLE students ADD COLUMN grade_level text;
  END IF;

  -- Remove old columns if they exist
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'students' AND column_name = 'grade'
  ) THEN
    -- Copy data from grade to grade_level if grade_level is null
    UPDATE students SET grade_level = grade WHERE grade_level IS NULL;
    ALTER TABLE students DROP COLUMN grade;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'students' AND column_name = 'admission_number'
  ) THEN
    -- Copy data from admission_number to enrollment_id if enrollment_id is null
    UPDATE students SET enrollment_id = admission_number WHERE enrollment_id IS NULL;
    ALTER TABLE students DROP COLUMN admission_number;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'students' AND column_name = 'date_of_birth'
  ) THEN
    ALTER TABLE students DROP COLUMN date_of_birth;
  END IF;
END $$;

-- Make enrollment_id NOT NULL and UNIQUE after data migration
ALTER TABLE students ALTER COLUMN enrollment_id SET NOT NULL;
ALTER TABLE students ALTER COLUMN grade_level SET NOT NULL;

-- Drop the old unique constraint if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'students_grade_admission_number_key'
  ) THEN
    ALTER TABLE students DROP CONSTRAINT students_grade_admission_number_key;
  END IF;
END $$;

-- Create unique constraint on enrollment_id
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'students_enrollment_id_key'
  ) THEN
    ALTER TABLE students ADD CONSTRAINT students_enrollment_id_key UNIQUE (enrollment_id);
  END IF;
END $$;

-- Recreate the create_student_member function
CREATE OR REPLACE FUNCTION create_student_member(
  p_name text,
  p_email text,
  p_phone_number text,
  p_grade_level text,
  p_enrollment_id text,
  p_password_hash text,
  p_calling_user_id uuid
)
RETURNS uuid AS $$
DECLARE
  v_student_id uuid;
BEGIN
  -- Check if caller is librarian
  IF NOT is_librarian(p_calling_user_id) THEN
    RAISE EXCEPTION 'Only librarians can create students';
  END IF;

  -- Insert student record
  INSERT INTO students (name, email, phone_number, grade_level, enrollment_id)
  VALUES (p_name, p_email, p_phone_number, p_grade_level, p_enrollment_id)
  RETURNING id INTO v_student_id;

  RETURN v_student_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
