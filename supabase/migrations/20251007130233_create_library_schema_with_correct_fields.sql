/*
  # IISBenin Library Management System - Database Schema

  ## Overview
  This migration creates the complete database structure for the IISBenin Library Management System.

  ## New Tables

  ### 1. `books`
  Stores all library book records with cataloging information.
  - `id` (uuid, primary key) - Unique identifier for each book
  - `title` (text, required) - Book title
  - `author_publisher` (text, required) - Author and/or Publisher name
  - `isbn` (text, unique) - International Standard Book Number
  - `category` (text) - Book category/genre
  - `status` (text, default 'available') - Current availability status
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 2. `students`
  Manages student profiles and library privileges.
  - `id` (uuid, primary key) - Unique identifier for each student
  - `name` (text, required) - Student full name
  - `grade` (text, required) - Student's grade level
  - `admission_number` (text, required) - Student admission number
  - `date_of_birth` (date) - Student's date of birth
  - `created_at` (timestamptz) - Registration timestamp

  ### 3. `staff`
  Manages staff profiles and library access.
  - `id` (uuid, primary key) - Unique identifier for each staff member
  - `name` (text, required) - Staff full name
  - `email` (text) - Staff email address
  - `enrollment_id` (text, required, unique) - Staff enrollment ID
  - `phone_number` (text) - Staff phone number
  - `created_at` (timestamptz) - Registration timestamp

  ### 4. `borrow_records`
  Tracks all book lending transactions.
  - `id` (uuid, primary key) - Unique transaction identifier
  - `book_id` (uuid, foreign key) - References books table
  - `student_id` (uuid, foreign key) - References students table
  - `borrow_date` (timestamptz, default now) - When book was borrowed
  - `due_date` (timestamptz, required) - Expected return date
  - `return_date` (timestamptz, nullable) - Actual return date
  - `status` (text, default 'active') - Transaction status
  - `created_at` (timestamptz) - Record creation timestamp

  ## Security
  - Row Level Security (RLS) enabled on all tables
  - Authenticated users can perform all operations
  - Public access is restricted by default

  ## Indexes
  - Books: indexed on title, author_publisher, and status
  - Students: indexed on grade and admission_number
  - Staff: indexed on enrollment_id
  - Borrow records: indexed on status and due_date
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
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  borrow_date timestamptz DEFAULT now(),
  due_date timestamptz NOT NULL,
  return_date timestamptz,
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'overdue')),
  created_at timestamptz DEFAULT now()
);

-- Create indexes for efficient searching
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

-- RLS Policies for books table
CREATE POLICY "Authenticated users can view all books"
  ON books FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert books"
  ON books FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update books"
  ON books FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete books"
  ON books FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for students table
CREATE POLICY "Authenticated users can view all students"
  ON students FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert students"
  ON students FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update students"
  ON students FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete students"
  ON students FOR DELETE
  TO authenticated
  USING (true);

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

-- RLS Policies for borrow_records table
CREATE POLICY "Authenticated users can view all borrow records"
  ON borrow_records FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert borrow records"
  ON borrow_records FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update borrow records"
  ON borrow_records FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete borrow records"
  ON borrow_records FOR DELETE
  TO authenticated
  USING (true);
