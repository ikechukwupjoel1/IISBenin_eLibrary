/*
  # Role-Based Access Control and New Features

  ## Overview
  Adds RBAC with three roles (librarian, staff, student) and new features.

  ## New Tables

  ### 1. user_profiles
  Links auth users to roles and library entities:
  - `id` (uuid, foreign key) - Links to auth.users
  - `email` (text, required) - User email
  - `full_name` (text, required) - Full name
  - `role` (text, required) - Role: librarian, staff, or student
  - `student_id` (uuid, nullable) - Links to students if student role
  - `staff_id` (uuid, nullable) - Links to staff if staff role

  ### 2. reservations
  Book reservation system:
  - `id` (uuid, primary key)
  - `book_id` (uuid, foreign key) - References books
  - `user_id` (uuid, foreign key) - References user_profiles
  - `status` (text) - pending, fulfilled, cancelled, expired
  - `reserved_at` (timestamptz)
  - `expires_at` (timestamptz)
  - `fulfilled_at` (timestamptz, nullable)

  ### 3. reviews
  Book reviews and ratings:
  - `id` (uuid, primary key)
  - `book_id` (uuid, foreign key)
  - `user_id` (uuid, foreign key)
  - `rating` (integer, 1-5)
  - `review_text` (text)

  ### 4. reading_challenges
  Reading challenges created by librarians:
  - `id` (uuid, primary key)
  - `title` (text, required)
  - `description` (text)
  - `target_books` (integer)
  - `start_date` (date)
  - `end_date` (date)
  - `created_by` (uuid)
  - `is_active` (boolean)

  ### 5. challenge_participants
  Tracks user participation in challenges:
  - `id` (uuid, primary key)
  - `challenge_id` (uuid, foreign key)
  - `user_id` (uuid, foreign key)
  - `books_read` (integer)
  - `joined_at` (timestamptz)
  - `completed_at` (timestamptz, nullable)

  ## Updates
  - Adds `staff_id` to borrow_records for staff borrowing
  - Updates all RLS policies for role-based access
  - Librarians: full access
  - Staff: can manage books, borrow for longer periods
  - Students: limited to their own data and reservations

  ## Security
  - RLS enabled on all tables
  - Role-based policies using get_user_role() function
  - Users can only access data appropriate for their role
*/

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('librarian', 'staff', 'student')),
  student_id uuid REFERENCES students(id) ON DELETE SET NULL,
  staff_id uuid REFERENCES staff(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create reservations table
CREATE TABLE IF NOT EXISTS reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'fulfilled', 'cancelled', 'expired')),
  reserved_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  fulfilled_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(book_id, user_id)
);

-- Create reading_challenges table
CREATE TABLE IF NOT EXISTS reading_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  target_books integer NOT NULL CHECK (target_books > 0),
  start_date date NOT NULL,
  end_date date NOT NULL,
  created_by uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  CHECK (end_date > start_date)
);

-- Create challenge_participants table
CREATE TABLE IF NOT EXISTS challenge_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES reading_challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  books_read integer DEFAULT 0 CHECK (books_read >= 0),
  joined_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  UNIQUE(challenge_id, user_id)
);

-- Add staff support to borrow_records
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'borrow_records' AND column_name = 'staff_id'
  ) THEN
    ALTER TABLE borrow_records ADD COLUMN staff_id uuid REFERENCES staff(id) ON DELETE CASCADE;
    ALTER TABLE borrow_records DROP CONSTRAINT IF EXISTS borrower_check;
    ALTER TABLE borrow_records ADD CONSTRAINT borrower_check 
      CHECK ((student_id IS NOT NULL AND staff_id IS NULL) OR (student_id IS NULL AND staff_id IS NOT NULL));
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_reservations_user_id ON reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_reservations_book_id ON reservations(book_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reviews_book_id ON reviews(book_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_challenge_participants_user_id ON challenge_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_challenge_participants_challenge_id ON challenge_participants(challenge_id);
CREATE INDEX IF NOT EXISTS idx_borrow_records_staff_id ON borrow_records(staff_id);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_participants ENABLE ROW LEVEL SECURITY;

-- Helper function to get user role
CREATE OR REPLACE FUNCTION get_user_role(user_uuid uuid)
RETURNS text AS $$
  SELECT role FROM user_profiles WHERE id = user_uuid;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view their own profile and librarians see all"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR get_user_role(auth.uid()) = 'librarian');

CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = (SELECT role FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Anyone can insert their profile on signup"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "Only librarians can delete user profiles"
  ON user_profiles FOR DELETE
  TO authenticated
  USING (get_user_role(auth.uid()) = 'librarian');

-- RLS Policies for reservations
CREATE POLICY "Users can view relevant reservations"
  ON reservations FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR get_user_role(auth.uid()) IN ('librarian', 'staff'));

CREATE POLICY "Users can create reservations"
  ON reservations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users and librarians can update reservations"
  ON reservations FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR get_user_role(auth.uid()) = 'librarian')
  WITH CHECK (user_id = auth.uid() OR get_user_role(auth.uid()) = 'librarian');

CREATE POLICY "Users and librarians can cancel reservations"
  ON reservations FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR get_user_role(auth.uid()) = 'librarian');

-- RLS Policies for reviews
CREATE POLICY "Anyone can view reviews"
  ON reviews FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create reviews"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own reviews"
  ON reviews FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users and librarians can delete reviews"
  ON reviews FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR get_user_role(auth.uid()) = 'librarian');

-- RLS Policies for reading_challenges
CREATE POLICY "Anyone can view active challenges"
  ON reading_challenges FOR SELECT
  TO authenticated
  USING (is_active = true OR created_by = auth.uid() OR get_user_role(auth.uid()) = 'librarian');

CREATE POLICY "Librarians can create challenges"
  ON reading_challenges FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role(auth.uid()) = 'librarian' AND created_by = auth.uid());

CREATE POLICY "Librarians can update challenges"
  ON reading_challenges FOR UPDATE
  TO authenticated
  USING (get_user_role(auth.uid()) = 'librarian')
  WITH CHECK (get_user_role(auth.uid()) = 'librarian');

CREATE POLICY "Librarians can delete challenges"
  ON reading_challenges FOR DELETE
  TO authenticated
  USING (get_user_role(auth.uid()) = 'librarian');

-- RLS Policies for challenge_participants
CREATE POLICY "Users can view challenge participants"
  ON challenge_participants FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can join challenges"
  ON challenge_participants FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users and librarians can update participation"
  ON challenge_participants FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR get_user_role(auth.uid()) = 'librarian')
  WITH CHECK (user_id = auth.uid() OR get_user_role(auth.uid()) = 'librarian');

CREATE POLICY "Users and librarians can delete participation"
  ON challenge_participants FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR get_user_role(auth.uid()) = 'librarian');

-- Update RLS policies for books
DROP POLICY IF EXISTS "Authenticated users can manage books" ON books;

CREATE POLICY "Librarians and staff can insert books"
  ON books FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role(auth.uid()) IN ('librarian', 'staff'));

CREATE POLICY "Librarians and staff can update books"
  ON books FOR UPDATE
  TO authenticated
  USING (get_user_role(auth.uid()) IN ('librarian', 'staff'))
  WITH CHECK (get_user_role(auth.uid()) IN ('librarian', 'staff'));

CREATE POLICY "Only librarians can delete books"
  ON books FOR DELETE
  TO authenticated
  USING (get_user_role(auth.uid()) = 'librarian');

-- Update RLS policies for students
DROP POLICY IF EXISTS "Authenticated users can manage students" ON students;

CREATE POLICY "Librarians can insert students"
  ON students FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role(auth.uid()) = 'librarian');

CREATE POLICY "Librarians can update students"
  ON students FOR UPDATE
  TO authenticated
  USING (get_user_role(auth.uid()) = 'librarian')
  WITH CHECK (get_user_role(auth.uid()) = 'librarian');

CREATE POLICY "Librarians can delete students"
  ON students FOR DELETE
  TO authenticated
  USING (get_user_role(auth.uid()) = 'librarian');

-- Update RLS policies for staff
DROP POLICY IF EXISTS "Authenticated users can manage staff" ON staff;

CREATE POLICY "Librarians can insert staff"
  ON staff FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role(auth.uid()) = 'librarian');

CREATE POLICY "Librarians can update staff"
  ON staff FOR UPDATE
  TO authenticated
  USING (get_user_role(auth.uid()) = 'librarian')
  WITH CHECK (get_user_role(auth.uid()) = 'librarian');

CREATE POLICY "Librarians can delete staff"
  ON staff FOR DELETE
  TO authenticated
  USING (get_user_role(auth.uid()) = 'librarian');

-- Update RLS policies for borrow_records
DROP POLICY IF EXISTS "Authenticated users can manage borrow records" ON borrow_records;

CREATE POLICY "Librarians and staff can insert borrow records"
  ON borrow_records FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role(auth.uid()) IN ('librarian', 'staff'));

CREATE POLICY "Librarians and staff can update borrow records"
  ON borrow_records FOR UPDATE
  TO authenticated
  USING (get_user_role(auth.uid()) IN ('librarian', 'staff'))
  WITH CHECK (get_user_role(auth.uid()) IN ('librarian', 'staff'));

CREATE POLICY "Only librarians can delete borrow records"
  ON borrow_records FOR DELETE
  TO authenticated
  USING (get_user_role(auth.uid()) = 'librarian');