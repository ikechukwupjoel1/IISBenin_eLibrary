-- IISBenin Library Management System - Complete Database Setup
-- Run this in your Supabase SQL Editor

-- Create books table
CREATE TABLE IF NOT EXISTS books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  author_publisher text NOT NULL,
  isbn text UNIQUE,
  category text,
  status text DEFAULT 'available' CHECK (status IN ('available', 'borrowed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create students table
CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone_number text,
  grade_level text NOT NULL,
  enrollment_id text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- Create staff table
CREATE TABLE IF NOT EXISTS staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  enrollment_id text NOT NULL UNIQUE,
  phone_number text,
  created_at timestamptz DEFAULT now()
);

-- Create borrow_records table
CREATE TABLE IF NOT EXISTS borrow_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  borrow_date timestamptz DEFAULT now(),
  due_date timestamptz NOT NULL,
  return_date timestamptz,
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'overdue')),
  created_at timestamptz DEFAULT now()
);

-- Create user_profiles table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('student', 'staff', 'librarian')),
  enrollment_id text,
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES staff(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);
CREATE INDEX IF NOT EXISTS idx_books_status ON books(status);
CREATE INDEX IF NOT EXISTS idx_students_enrollment ON students(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_staff_enrollment ON staff(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_borrow_records_book ON borrow_records(book_id);
CREATE INDEX IF NOT EXISTS idx_borrow_records_student ON borrow_records(student_id);
CREATE INDEX IF NOT EXISTS idx_borrow_records_status ON borrow_records(status);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_enrollment ON user_profiles(enrollment_id);

-- Enable RLS
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE borrow_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is a librarian
CREATE OR REPLACE FUNCTION is_librarian(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = user_id AND role = 'librarian'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies for books
DROP POLICY IF EXISTS "books_select_all" ON books;
CREATE POLICY "books_select_all" ON books FOR SELECT USING (true);

DROP POLICY IF EXISTS "books_insert_librarian" ON books;
CREATE POLICY "books_insert_librarian" ON books FOR INSERT 
  WITH CHECK (is_librarian(auth.uid()));

DROP POLICY IF EXISTS "books_update_librarian" ON books;
CREATE POLICY "books_update_librarian" ON books FOR UPDATE 
  USING (is_librarian(auth.uid()));

DROP POLICY IF EXISTS "books_delete_librarian" ON books;
CREATE POLICY "books_delete_librarian" ON books FOR DELETE 
  USING (is_librarian(auth.uid()));

-- RLS Policies for students
DROP POLICY IF EXISTS "students_select_all" ON students;
CREATE POLICY "students_select_all" ON students FOR SELECT USING (true);

DROP POLICY IF EXISTS "students_insert_librarian" ON students;
CREATE POLICY "students_insert_librarian" ON students FOR INSERT 
  WITH CHECK (is_librarian(auth.uid()));

DROP POLICY IF EXISTS "students_update_librarian" ON students;
CREATE POLICY "students_update_librarian" ON students FOR UPDATE 
  USING (is_librarian(auth.uid()));

DROP POLICY IF EXISTS "students_delete_librarian" ON students;
CREATE POLICY "students_delete_librarian" ON students FOR DELETE 
  USING (is_librarian(auth.uid()));

-- RLS Policies for staff
DROP POLICY IF EXISTS "staff_select_all" ON staff;
CREATE POLICY "staff_select_all" ON staff FOR SELECT USING (true);

DROP POLICY IF EXISTS "staff_insert_librarian" ON staff;
CREATE POLICY "staff_insert_librarian" ON staff FOR INSERT 
  WITH CHECK (is_librarian(auth.uid()));

DROP POLICY IF EXISTS "staff_update_librarian" ON staff;
CREATE POLICY "staff_update_librarian" ON staff FOR UPDATE 
  USING (is_librarian(auth.uid()));

DROP POLICY IF EXISTS "staff_delete_librarian" ON staff;
CREATE POLICY "staff_delete_librarian" ON staff FOR DELETE 
  USING (is_librarian(auth.uid()));

-- RLS Policies for borrow_records
DROP POLICY IF EXISTS "borrow_records_select_all" ON borrow_records;
CREATE POLICY "borrow_records_select_all" ON borrow_records FOR SELECT USING (true);

DROP POLICY IF EXISTS "borrow_records_insert_librarian" ON borrow_records;
CREATE POLICY "borrow_records_insert_librarian" ON borrow_records FOR INSERT 
  WITH CHECK (is_librarian(auth.uid()));

DROP POLICY IF EXISTS "borrow_records_update_librarian" ON borrow_records;
CREATE POLICY "borrow_records_update_librarian" ON borrow_records FOR UPDATE 
  USING (is_librarian(auth.uid()));

DROP POLICY IF EXISTS "borrow_records_delete_librarian" ON borrow_records;
CREATE POLICY "borrow_records_delete_librarian" ON borrow_records FOR DELETE 
  USING (is_librarian(auth.uid()));

-- RLS Policies for user_profiles
DROP POLICY IF EXISTS "users_select_own_profile" ON user_profiles;
CREATE POLICY "users_select_own_profile" ON user_profiles FOR SELECT 
  USING (auth.uid() = id OR is_librarian(auth.uid()));

DROP POLICY IF EXISTS "users_insert_own_profile" ON user_profiles;
CREATE POLICY "users_insert_own_profile" ON user_profiles FOR INSERT 
  WITH CHECK (auth.uid() = id OR is_librarian(auth.uid()));

DROP POLICY IF EXISTS "users_update_own_profile" ON user_profiles;
CREATE POLICY "users_update_own_profile" ON user_profiles FOR UPDATE 
  USING (auth.uid() = id OR is_librarian(auth.uid()));

-- Function to create student member
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

-- Function to create staff member
CREATE OR REPLACE FUNCTION create_staff_member(
  p_name text,
  p_email text,
  p_phone_number text,
  p_enrollment_id text,
  p_password_hash text,
  p_calling_user_id uuid
)
RETURNS uuid AS $$
DECLARE
  v_staff_id uuid;
BEGIN
  -- Check if caller is librarian
  IF NOT is_librarian(p_calling_user_id) THEN
    RAISE EXCEPTION 'Only librarians can create staff';
  END IF;

  -- Insert staff record
  INSERT INTO staff (name, email, phone_number, enrollment_id)
  VALUES (p_name, p_email, p_phone_number, p_enrollment_id)
  RETURNING id INTO v_staff_id;

  RETURN v_staff_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
