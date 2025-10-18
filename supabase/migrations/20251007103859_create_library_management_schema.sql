/*
  # Library Management System - Core Schema

  ## Overview
  This migration creates the foundational database structure for the Indian International School Library Management System MVP.

  ## New Tables

  ### 1. `books`
  Stores all library book records with essential cataloging information.
  - `id` (uuid, primary key) - Unique identifier for each book
  - `title` (text, required) - Book title
  - `author` (text, required) - Book author
  - `isbn` (text, unique) - International Standard Book Number
  - `category` (text) - Book category/genre
  - `status` (text, default 'available') - Current availability status
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 2. `students`
  Manages student/member profiles and their library privileges.
  - `id` (uuid, primary key) - Unique identifier for each student
  - `name` (text, required) - Student full name
  - `class` (text, required) - Student's class/grade level
  - `roll_number` (text, required) - Student roll number
  - `contact_info` (text) - Contact information
  - `created_at` (timestamptz) - Registration timestamp

  ### 3. `borrow_records`
  Tracks all book lending transactions and their lifecycle.
  - `id` (uuid, primary key) - Unique transaction identifier
  - `book_id` (uuid, foreign key) - References books table
  - `student_id` (uuid, foreign key) - References students table
  - `borrow_date` (timestamptz, default now) - When book was borrowed
  - `due_date` (timestamptz, required) - Expected return date
  - `return_date` (timestamptz, nullable) - Actual return date (null if not returned)
  - `status` (text, default 'active') - Transaction status (active/completed/overdue)
  - `created_at` (timestamptz) - Record creation timestamp

  ## Security
  - Row Level Security (RLS) enabled on all tables
  - Authenticated users (librarians) can perform all operations
  - Public access is restricted by default

  ## Indexes
  - Books: indexed on title, author, and status for efficient searching
  - Students: indexed on class and roll_number for quick lookups
  - Borrow records: indexed on status and due_date for overdue tracking
*/

-- Create books table
CREATE TABLE IF NOT EXISTS books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  author text NOT NULL,
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
  class text NOT NULL,
  roll_number text NOT NULL,
  contact_info text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(class, roll_number)
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
CREATE INDEX IF NOT EXISTS idx_books_author ON books(author);
CREATE INDEX IF NOT EXISTS idx_books_status ON books(status);
CREATE INDEX IF NOT EXISTS idx_students_class ON students(class);
CREATE INDEX IF NOT EXISTS idx_students_roll_number ON students(roll_number);
CREATE INDEX IF NOT EXISTS idx_borrow_records_status ON borrow_records(status);
CREATE INDEX IF NOT EXISTS idx_borrow_records_due_date ON borrow_records(due_date);

-- Enable Row Level Security
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
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
