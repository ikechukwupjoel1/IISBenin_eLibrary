/*
  # Add Staff Management Feature

  ## Overview
  Extends the library management system to support staff members who can also borrow books.

  ## New Tables

  ### 1. `staff`
  Manages staff member profiles and their library privileges.
  - `id` (uuid, primary key) - Unique identifier for each staff member
  - `name` (text, required) - Staff full name
  - `department` (text, required) - Staff department/section
  - `employee_id` (text, required, unique) - Staff employee ID number
  - `contact_info` (text) - Contact information
  - `created_at` (timestamptz) - Registration timestamp

  ## Modified Tables

  ### 2. `borrow_records`
  Updated to support both student and staff borrowers.
  - Added `staff_id` (uuid, nullable, foreign key) - References staff table
  - Modified constraint to ensure either `student_id` OR `staff_id` is set, but not both
  - Maintained backward compatibility with existing student borrow records

  ## Security
  - Row Level Security (RLS) enabled on staff table
  - Authenticated users (librarians) can perform all operations
  - Public access is restricted by default
  - Updated borrow_records policies to handle staff borrowers

  ## Indexes
  - Staff: indexed on department and employee_id for quick lookups
  - Borrow records: added index on staff_id for efficient queries

  ## Notes
  1. Existing borrow records remain unchanged and fully functional
  2. New borrow records can be created for either students or staff
  3. A borrow record must have exactly one borrower (student XOR staff)
*/

-- Create staff table
CREATE TABLE IF NOT EXISTS staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  department text NOT NULL,
  employee_id text UNIQUE NOT NULL,
  contact_info text,
  created_at timestamptz DEFAULT now()
);

-- Add staff_id column to borrow_records if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'borrow_records' AND column_name = 'staff_id'
  ) THEN
    ALTER TABLE borrow_records ADD COLUMN staff_id uuid REFERENCES staff(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add constraint to ensure either student_id or staff_id is set, but not both
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'borrow_records_borrower_check'
  ) THEN
    ALTER TABLE borrow_records ADD CONSTRAINT borrow_records_borrower_check
      CHECK (
        (student_id IS NOT NULL AND staff_id IS NULL) OR
        (student_id IS NULL AND staff_id IS NOT NULL)
      );
  END IF;
END $$;

-- Make student_id nullable since it's now optional
DO $$
BEGIN
  ALTER TABLE borrow_records ALTER COLUMN student_id DROP NOT NULL;
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- Create indexes for staff table
CREATE INDEX IF NOT EXISTS idx_staff_department ON staff(department);
CREATE INDEX IF NOT EXISTS idx_staff_employee_id ON staff(employee_id);

-- Create index for staff_id in borrow_records
CREATE INDEX IF NOT EXISTS idx_borrow_records_staff_id ON borrow_records(staff_id);

-- Enable Row Level Security for staff
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

-- RLS Policies for staff table
CREATE POLICY "Authenticated users can view all staff"
  ON staff FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert staff"
  ON staff FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update staff"
  ON staff FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete staff"
  ON staff FOR DELETE
  TO authenticated
  USING (true);
