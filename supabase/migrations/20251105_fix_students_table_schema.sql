-- Migration: Fix Students Table Schema
-- Date: 2025-11-05
-- Purpose: Add missing columns and rename grade to grade_level to match application code

-- Add missing columns to students table
DO $$
BEGIN
  -- Rename grade column to grade_level
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'students' AND column_name = 'grade'
  ) THEN
    ALTER TABLE students RENAME COLUMN grade TO grade_level;
  END IF;

  -- Add enrollment_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'students' AND column_name = 'enrollment_id'
  ) THEN
    ALTER TABLE students ADD COLUMN enrollment_id text UNIQUE;
  END IF;

  -- Add parent_email column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'students' AND column_name = 'parent_email'
  ) THEN
    ALTER TABLE students ADD COLUMN parent_email text;
  END IF;

  -- Add email column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'students' AND column_name = 'email'
  ) THEN
    ALTER TABLE students ADD COLUMN email text;
  END IF;

  -- Add phone_number column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'students' AND column_name = 'phone_number'
  ) THEN
    ALTER TABLE students ADD COLUMN phone_number text;
  END IF;

  -- Add institution_id column if it doesn't exist (for multi-tenant support)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'students' AND column_name = 'institution_id'
  ) THEN
    ALTER TABLE students ADD COLUMN institution_id uuid REFERENCES institutions(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Update indexes to use grade_level instead of grade
DROP INDEX IF EXISTS idx_students_grade;
CREATE INDEX IF NOT EXISTS idx_students_grade_level ON students(grade_level);

-- Add index for enrollment_id
CREATE INDEX IF NOT EXISTS idx_students_enrollment_id ON students(enrollment_id);

-- Add index for institution_id
CREATE INDEX IF NOT EXISTS idx_students_institution_id ON students(institution_id);

-- Update unique constraint to use grade_level
DO $$
BEGIN
  -- Drop old constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'students_grade_admission_number_key'
  ) THEN
    ALTER TABLE students DROP CONSTRAINT students_grade_admission_number_key;
  END IF;

  -- Add new constraint with grade_level
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'students_grade_level_admission_number_key'
  ) THEN
    ALTER TABLE students ADD CONSTRAINT students_grade_level_admission_number_key 
      UNIQUE(grade_level, admission_number);
  END IF;
END $$;

-- Update RLS policies if needed (maintain existing policies)
-- Policies should automatically work with the updated schema

-- Comment on changes
COMMENT ON COLUMN students.grade_level IS 'Student grade level (e.g., JSS1, SS2)';
COMMENT ON COLUMN students.enrollment_id IS 'Unique enrollment ID for student login (e.g., S0001)';
COMMENT ON COLUMN students.parent_email IS 'Parent/guardian email address';
COMMENT ON COLUMN students.institution_id IS 'Institution the student belongs to (multi-tenant support)';
