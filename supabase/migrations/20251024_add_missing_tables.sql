-- Migration: Add Missing Tables from Book Reports System
-- This creates the 3 tables that were not created in the initial migration run

-- Create book_reports table (MAIN TABLE)
CREATE TABLE IF NOT EXISTS book_reports (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  borrow_record_id uuid REFERENCES borrow_records(id) ON DELETE CASCADE,
  book_id uuid REFERENCES books(id) ON DELETE CASCADE,
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  
  -- Report content
  title text NOT NULL,
  summary text NOT NULL,
  favorite_part text,
  main_characters text,
  lessons_learned text,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  
  -- Reading verification
  pages_read integer,
  time_spent_minutes integer,
  completion_percentage integer DEFAULT 100 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  
  -- Approval workflow
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'revision_needed')),
  reviewed_by uuid REFERENCES user_profiles(id),
  reviewed_at timestamp with time zone,
  librarian_feedback text,
  
  -- Points system
  points_awarded integer DEFAULT 0,
  quality_score integer CHECK (quality_score >= 0 AND quality_score <= 100),
  
  -- Metadata
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  
  UNIQUE(borrow_record_id)
);

-- Create reading_questions table
CREATE TABLE IF NOT EXISTS reading_questions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id uuid REFERENCES books(id) ON DELETE CASCADE,
  question text NOT NULL,
  question_type text DEFAULT 'open' CHECK (question_type IN ('open', 'multiple_choice')),
  correct_answer text,
  options jsonb,
  created_by uuid REFERENCES user_profiles(id),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Create reading_answers table
CREATE TABLE IF NOT EXISTS reading_answers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id uuid REFERENCES book_reports(id) ON DELETE CASCADE,
  question_id uuid REFERENCES reading_questions(id) ON DELETE CASCADE,
  answer text NOT NULL,
  is_correct boolean,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  
  UNIQUE(report_id, question_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_book_reports_user_id ON book_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_book_reports_book_id ON book_reports(book_id);
CREATE INDEX IF NOT EXISTS idx_book_reports_status ON book_reports(status);
CREATE INDEX IF NOT EXISTS idx_book_reports_borrow_record_id ON book_reports(borrow_record_id);
CREATE INDEX IF NOT EXISTS idx_reading_questions_book_id ON reading_questions(book_id);
CREATE INDEX IF NOT EXISTS idx_reading_answers_report_id ON reading_answers(report_id);

-- Enable RLS
ALTER TABLE book_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_answers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for book_reports
CREATE POLICY "Students can view own reports"
  ON book_reports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Librarians can view all reports"
  ON book_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('librarian', 'admin')
    )
  );

CREATE POLICY "Authorized staff can view reports"
  ON book_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM report_reviewers
      WHERE staff_id = auth.uid()
      AND can_review = true
    )
  );

CREATE POLICY "Students can create reports"
  ON book_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Students can update own pending reports"
  ON book_reports FOR UPDATE
  USING (
    auth.uid() = user_id 
    AND status IN ('pending', 'revision_needed')
  );

CREATE POLICY "Librarians can update reports"
  ON book_reports FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('librarian', 'admin')
    )
  );

CREATE POLICY "Authorized staff can update reports"
  ON book_reports FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM report_reviewers
      WHERE staff_id = auth.uid()
      AND can_review = true
    )
  );

-- RLS Policies for reading_questions
CREATE POLICY "Anyone can view reading questions"
  ON reading_questions FOR SELECT
  USING (true);

CREATE POLICY "Librarians can create questions"
  ON reading_questions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('librarian', 'admin')
    )
  );

CREATE POLICY "Librarians can manage questions"
  ON reading_questions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('librarian', 'admin')
    )
  );

-- RLS Policies for reading_answers
CREATE POLICY "Students can view own answers"
  ON reading_answers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM book_reports
      WHERE id = reading_answers.report_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Librarians can view all answers"
  ON reading_answers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('librarian', 'admin')
    )
  );

CREATE POLICY "Students can submit answers"
  ON reading_answers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM book_reports
      WHERE id = reading_answers.report_id
      AND user_id = auth.uid()
    )
  );

-- Add the helper functions
CREATE OR REPLACE FUNCTION calculate_reading_points(
  report_id uuid
) RETURNS integer AS $$
DECLARE
  base_points integer := 10;
  quality_bonus integer := 0;
  completion_bonus integer := 0;
  report_record RECORD;
  total_points integer;
BEGIN
  SELECT * INTO report_record
  FROM book_reports
  WHERE id = report_id;
  
  IF report_record.quality_score IS NOT NULL THEN
    quality_bonus := (report_record.quality_score / 10);
  END IF;
  
  IF report_record.completion_percentage = 100 THEN
    completion_bonus := 5;
  ELSIF report_record.completion_percentage >= 80 THEN
    completion_bonus := 3;
  ELSIF report_record.completion_percentage >= 50 THEN
    completion_bonus := 1;
  END IF;
  
  total_points := base_points + quality_bonus + completion_bonus;
  
  RETURN total_points;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION approve_book_report(
  report_id uuid,
  quality_score_param integer,
  feedback_param text DEFAULT NULL
) RETURNS json AS $$
DECLARE
  points_to_award integer;
  report_record RECORD;
  result json;
BEGIN
  SELECT * INTO report_record
  FROM book_reports
  WHERE id = report_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Report not found');
  END IF;
  
  points_to_award := calculate_reading_points(report_id);
  
  UPDATE book_reports
  SET 
    status = 'approved',
    reviewed_by = auth.uid(),
    reviewed_at = NOW(),
    librarian_feedback = feedback_param,
    quality_score = quality_score_param,
    points_awarded = points_to_award,
    updated_at = NOW()
  WHERE id = report_id;
  
  result := json_build_object(
    'success', true,
    'points_awarded', points_to_award,
    'quality_score', quality_score_param
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
