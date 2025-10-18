/*
  # IISBenin Library Management System - Base Schema

  ## Overview
  This migration creates the foundational database structure for the library system.

  ## New Tables

  ### 1. `books`
  Stores all library book records:
  - `id` (uuid, primary key) - Unique identifier
  - `title` (text, required) - Book title
  - `author_publisher` (text, required) - Author and/or Publisher
  - `isbn` (text, unique) - ISBN number
  - `category` (text) - Book category
  - `status` (text, default 'available') - Availability status
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Update timestamp

  ### 2. `students`
  Manages student profiles:
  - `id` (uuid, primary key) - Unique identifier
  - `name` (text, required) - Student name
  - `grade` (text, required) - Grade level
  - `admission_number` (text, required) - Admission number
  - `date_of_birth` (date) - Date of birth
  - `created_at` (timestamptz) - Registration timestamp

  ### 3. `staff`
  Manages staff profiles:
  - `id` (uuid, primary key) - Unique identifier
  - `name` (text, required) - Staff name
  - `email` (text) - Email address
  - `enrollment_id` (text, required, unique) - Enrollment ID
  - `phone_number` (text) - Phone number
  - `created_at` (timestamptz) - Registration timestamp

  ### 4. `borrow_records`
  Tracks borrowing transactions:
  - `id` (uuid, primary key) - Unique identifier
  - `book_id` (uuid, foreign key) - References books
  - `student_id` (uuid, nullable, foreign key) - References students
  - `borrow_date` (timestamptz) - Borrow date
  - `due_date` (timestamptz) - Due date
  - `return_date` (timestamptz, nullable) - Return date
  - `status` (text, default 'active') - Status
  - `created_at` (timestamptz) - Creation timestamp

  ## Security
  - RLS enabled on all tables
  - Basic authenticated user access
*/

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
  grade text NOT NULL,
  admission_number text NOT NULL,
  date_of_birth date,
  created_at timestamptz DEFAULT now(),
  UNIQUE(grade, admission_number)
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);
CREATE INDEX IF NOT EXISTS idx_books_author_publisher ON books(author_publisher);
CREATE INDEX IF NOT EXISTS idx_books_status ON books(status);
CREATE INDEX IF NOT EXISTS idx_students_grade ON students(grade);
CREATE INDEX IF NOT EXISTS idx_students_admission_number ON students(admission_number);
CREATE INDEX IF NOT EXISTS idx_staff_enrollment_id ON staff(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_borrow_records_status ON borrow_records(status);
CREATE INDEX IF NOT EXISTS idx_borrow_records_due_date ON borrow_records(due_date);

-- Enable Row Level Security
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE borrow_records ENABLE ROW LEVEL SECURITY;

-- Temporary permissive policies (will be updated with role-based access)
CREATE POLICY "Authenticated users can view all books"
  ON books FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage books"
  ON books FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view all students"
  ON students FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage students"
  ON students FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view all staff"
  ON staff FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage staff"
  ON staff FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view all borrow records"
  ON borrow_records FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage borrow records"
  ON borrow_records FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);