/*
  # Security and Inventory Improvements

  ## Security Changes
  1. Remove password_hash columns from students and staff tables
     - Passwords are managed by Supabase Auth, no need to store separately
     - Improves security by removing plain text password storage

  ## Inventory Management
  2. Add inventory tracking to books table:
     - `total_copies` - Total number of copies owned
     - `available_copies` - Currently available copies
     - `condition` - Physical condition of the book
     - `location` - Shelf/section location
     - `barcode` - Barcode for scanning

  ## Renewal System
  3. Add renewal tracking to borrow_records:
     - `renewal_count` - Number of times renewed
     - `max_renewals` - Maximum allowed renewals

  4. Create renewal_history table:
     - Track all renewal actions
     - Store old and new due dates
     - Link to user who performed renewal

  ## Security
  - All tables maintain RLS policies
  - Only authorized users can access data
*/

-- Remove password_hash columns (security improvement)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'students' AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE students DROP COLUMN password_hash;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'staff' AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE staff DROP COLUMN password_hash;
  END IF;
END $$;

-- Add inventory management columns to books
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'books' AND column_name = 'total_copies'
  ) THEN
    ALTER TABLE books ADD COLUMN total_copies INTEGER DEFAULT 1 CHECK (total_copies > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'books' AND column_name = 'available_copies'
  ) THEN
    ALTER TABLE books ADD COLUMN available_copies INTEGER DEFAULT 1 CHECK (available_copies >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'books' AND column_name = 'condition'
  ) THEN
    ALTER TABLE books ADD COLUMN condition TEXT DEFAULT 'good' CHECK (condition IN ('new', 'good', 'fair', 'poor', 'damaged'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'books' AND column_name = 'location'
  ) THEN
    ALTER TABLE books ADD COLUMN location TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'books' AND column_name = 'barcode'
  ) THEN
    ALTER TABLE books ADD COLUMN barcode TEXT UNIQUE;
  END IF;
END $$;

-- Add renewal columns to borrow_records
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'borrow_records' AND column_name = 'renewal_count'
  ) THEN
    ALTER TABLE borrow_records ADD COLUMN renewal_count INTEGER DEFAULT 0 CHECK (renewal_count >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'borrow_records' AND column_name = 'max_renewals'
  ) THEN
    ALTER TABLE borrow_records ADD COLUMN max_renewals INTEGER DEFAULT 2 CHECK (max_renewals >= 0);
  END IF;
END $$;

-- Create renewal_history table
CREATE TABLE IF NOT EXISTS renewal_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  borrow_record_id UUID NOT NULL REFERENCES borrow_records(id) ON DELETE CASCADE,
  renewed_by UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  old_due_date TIMESTAMPTZ NOT NULL,
  new_due_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on renewal_history
ALTER TABLE renewal_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for renewal_history
CREATE POLICY "Librarians and staff can view renewal history"
  ON renewal_history FOR SELECT
  TO authenticated
  USING (
    COALESCE(get_user_role(auth.uid()), '') IN ('librarian', 'staff')
  );

CREATE POLICY "Librarians and staff can insert renewal history"
  ON renewal_history FOR INSERT
  TO authenticated
  WITH CHECK (
    COALESCE(get_user_role(auth.uid()), '') IN ('librarian', 'staff')
  );

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_renewal_history_borrow_record ON renewal_history(borrow_record_id);
CREATE INDEX IF NOT EXISTS idx_books_barcode ON books(barcode);
CREATE INDEX IF NOT EXISTS idx_books_location ON books(location);

-- Update the create_student_member function to not use password_hash
CREATE OR REPLACE FUNCTION create_student_member(
  p_name text,
  p_email text,
  p_phone_number text,
  p_grade_level text,
  p_enrollment_id text,
  p_password_hash text,
  p_calling_user_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_student_id uuid;
  v_caller_role text;
BEGIN
  -- Verify the calling user is a librarian
  SELECT role INTO v_caller_role
  FROM user_profiles
  WHERE id = p_calling_user_id;

  IF v_caller_role IS NULL OR v_caller_role != 'librarian' THEN
    RAISE EXCEPTION 'Only librarians can create students';
  END IF;

  -- Insert the student (no password_hash)
  INSERT INTO students (name, grade_level, admission_number, enrollment_id)
  VALUES (p_name, p_grade_level, p_enrollment_id, p_enrollment_id)
  RETURNING id INTO v_student_id;

  RETURN v_student_id;
END;
$$;

-- Update the create_staff_member function to not use password_hash
CREATE OR REPLACE FUNCTION create_staff_member(
  p_name text,
  p_email text,
  p_phone_number text,
  p_enrollment_id text,
  p_password_hash text,
  p_calling_user_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_staff_id uuid;
  v_caller_role text;
BEGIN
  -- Verify the calling user is a librarian
  SELECT role INTO v_caller_role
  FROM user_profiles
  WHERE id = p_calling_user_id;

  IF v_caller_role IS NULL OR v_caller_role != 'librarian' THEN
    RAISE EXCEPTION 'Only librarians can create staff members';
  END IF;

  -- Insert the staff member (no password_hash)
  INSERT INTO staff (name, email, phone_number, enrollment_id)
  VALUES (p_name, p_email, p_phone_number, p_enrollment_id)
  RETURNING id INTO v_staff_id;

  RETURN v_staff_id;
END;
$$;

-- Add comment to books table for clarity
COMMENT ON COLUMN books.total_copies IS 'Total number of physical copies owned by the library';
COMMENT ON COLUMN books.available_copies IS 'Number of copies currently available for borrowing';
COMMENT ON COLUMN books.condition IS 'Physical condition of the book';
COMMENT ON COLUMN books.location IS 'Physical location in library (shelf/section)';
