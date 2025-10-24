-- Migration: Add Book Reports System for Reading Verification
-- This ensures students actually read books before earning points on the leaderboard

-- Create book_reports table
CREATE TABLE IF NOT EXISTS book_reports (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  borrow_id uuid REFERENCES borrowing(id) ON DELETE CASCADE,
  book_id uuid REFERENCES books(id) ON DELETE CASCADE,
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  
  -- Report content
  title text NOT NULL,
  summary text NOT NULL, -- What the book was about (min 100 words)
  favorite_part text, -- What they liked most
  main_characters text, -- List main characters
  lessons_learned text, -- What they learned
  rating integer CHECK (rating >= 1 AND rating <= 5),
  
  -- Reading verification
  pages_read integer,
  time_spent_minutes integer, -- Estimated reading time
  completion_percentage integer DEFAULT 100 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  
  -- Approval workflow
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'revision_needed')),
  reviewed_by uuid REFERENCES user_profiles(id),
  reviewed_at timestamp with time zone,
  librarian_feedback text,
  
  -- Points system
  points_awarded integer DEFAULT 0,
  quality_score integer CHECK (quality_score >= 0 AND quality_score <= 100), -- Librarian's quality assessment
  
  -- Metadata
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  
  -- Ensure one report per borrow
  UNIQUE(borrow_id)
);

-- Create reading_questions table (optional quiz/comprehension check)
CREATE TABLE IF NOT EXISTS reading_questions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id uuid REFERENCES books(id) ON DELETE CASCADE,
  question text NOT NULL,
  question_type text DEFAULT 'open' CHECK (question_type IN ('open', 'multiple_choice')),
  correct_answer text, -- For multiple choice
  options jsonb, -- Array of options for multiple choice
  created_by uuid REFERENCES user_profiles(id),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Create reading_answers table (student answers to questions)
CREATE TABLE IF NOT EXISTS reading_answers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id uuid REFERENCES book_reports(id) ON DELETE CASCADE,
  question_id uuid REFERENCES reading_questions(id) ON DELETE CASCADE,
  answer text NOT NULL,
  is_correct boolean,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  
  UNIQUE(report_id, question_id)
);

-- Create reading_progress table (track reading sessions)
CREATE TABLE IF NOT EXISTS reading_progress (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  borrow_id uuid REFERENCES borrowing(id) ON DELETE CASCADE,
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  book_id uuid REFERENCES books(id) ON DELETE CASCADE,
  
  -- Progress tracking
  current_page integer DEFAULT 0,
  total_pages integer,
  percentage_complete integer DEFAULT 0 CHECK (percentage_complete >= 0 AND percentage_complete <= 100),
  
  -- Session tracking
  session_date date DEFAULT CURRENT_DATE,
  pages_read_today integer DEFAULT 0,
  time_spent_minutes integer DEFAULT 0,
  
  -- Metadata
  last_updated timestamp with time zone DEFAULT timezone('utc'::text, now()),
  
  UNIQUE(borrow_id, session_date)
);

-- Create report_reviewers table (track which staff can review reports)
CREATE TABLE IF NOT EXISTS report_reviewers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES user_profiles(id), -- Which librarian/admin granted permission
  can_review boolean DEFAULT true,
  review_scope text DEFAULT 'all' CHECK (review_scope IN ('all', 'subject_specific')), -- Can review all or just specific subjects
  subject_areas text[], -- Array of subjects they can review (e.g., ['Science', 'Mathematics'])
  notes text, -- Optional notes about why this staff has review access
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  
  UNIQUE(staff_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_book_reports_user_id ON book_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_book_reports_book_id ON book_reports(book_id);
CREATE INDEX IF NOT EXISTS idx_book_reports_status ON book_reports(status);
CREATE INDEX IF NOT EXISTS idx_book_reports_borrow_id ON book_reports(borrow_id);
CREATE INDEX IF NOT EXISTS idx_reading_questions_book_id ON reading_questions(book_id);
CREATE INDEX IF NOT EXISTS idx_reading_answers_report_id ON reading_answers(report_id);
CREATE INDEX IF NOT EXISTS idx_reading_progress_user_id ON reading_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_progress_borrow_id ON reading_progress(borrow_id);
CREATE INDEX IF NOT EXISTS idx_report_reviewers_staff_id ON report_reviewers(staff_id);

-- Enable RLS
ALTER TABLE book_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_reviewers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for book_reports

-- Students can view their own reports
CREATE POLICY "Students can view own reports"
  ON book_reports FOR SELECT
  USING (auth.uid() = user_id);

-- Librarians and admins can view all reports
CREATE POLICY "Librarians can view all reports"
  ON book_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('librarian', 'admin')
    )
  );

-- Authorized staff can view reports (configurable by librarians)
CREATE POLICY "Authorized staff can view reports"
  ON book_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM report_reviewers
      WHERE staff_id = auth.uid()
      AND can_review = true
    )
  );

-- Students can create reports for their own borrows
CREATE POLICY "Students can create reports"
  ON book_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Students can update their pending/revision_needed reports
CREATE POLICY "Students can update own pending reports"
  ON book_reports FOR UPDATE
  USING (
    auth.uid() = user_id 
    AND status IN ('pending', 'revision_needed')
  );

-- Librarians can update any report (for approval/rejection)
CREATE POLICY "Librarians can update reports"
  ON book_reports FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('librarian', 'admin')
    )
  );

-- Authorized staff can update reports (for approval/rejection)
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

-- Everyone can view questions
CREATE POLICY "Anyone can view reading questions"
  ON reading_questions FOR SELECT
  USING (true);

-- Librarians can create questions
CREATE POLICY "Librarians can create questions"
  ON reading_questions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('librarian', 'admin')
    )
  );

-- Librarians can update/delete questions
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

-- Students can view their own answers
CREATE POLICY "Students can view own answers"
  ON reading_answers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM book_reports
      WHERE id = reading_answers.report_id
      AND user_id = auth.uid()
    )
  );

-- Librarians can view all answers
CREATE POLICY "Librarians can view all answers"
  ON reading_answers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('librarian', 'admin')
    )
  );

-- Students can submit answers
CREATE POLICY "Students can submit answers"
  ON reading_answers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM book_reports
      WHERE id = reading_answers.report_id
      AND user_id = auth.uid()
    )
  );

-- RLS Policies for reading_progress

-- Students can view their own progress
CREATE POLICY "Students can view own progress"
  ON reading_progress FOR SELECT
  USING (auth.uid() = user_id);

-- Librarians can view all progress
CREATE POLICY "Librarians can view all progress"
  ON reading_progress FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('librarian', 'admin')
    )
  );

-- Students can insert/update their own progress
CREATE POLICY "Students can track own progress"
  ON reading_progress FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for report_reviewers

-- Librarians and admins can view all reviewers
CREATE POLICY "Librarians can view all reviewers"
  ON report_reviewers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('librarian', 'admin')
    )
  );

-- Staff can view their own reviewer status
CREATE POLICY "Staff can view own reviewer status"
  ON report_reviewers FOR SELECT
  USING (auth.uid() = staff_id);

-- Only librarians and admins can manage reviewers
CREATE POLICY "Librarians can manage reviewers"
  ON report_reviewers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('librarian', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('librarian', 'admin')
    )
  );

-- Function to calculate reading points based on report quality
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
  -- Get report details
  SELECT * INTO report_record
  FROM book_reports
  WHERE id = report_id;
  
  -- Quality bonus (0-10 points based on librarian's quality score)
  IF report_record.quality_score IS NOT NULL THEN
    quality_bonus := (report_record.quality_score / 10);
  END IF;
  
  -- Completion bonus (0-5 points)
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

-- Function to approve report and award points
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
  -- Get report details
  SELECT * INTO report_record
  FROM book_reports
  WHERE id = report_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Report not found');
  END IF;
  
  -- Calculate points
  points_to_award := calculate_reading_points(report_id);
  
  -- Update report
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

-- Comments for documentation
COMMENT ON TABLE book_reports IS 'Students submit book reports after reading to verify actual reading and earn leaderboard points';
COMMENT ON TABLE reading_questions IS 'Optional comprehension questions librarians can add to books for additional verification';
COMMENT ON TABLE reading_answers IS 'Student answers to reading comprehension questions';
COMMENT ON TABLE reading_progress IS 'Track daily reading progress and sessions';
COMMENT ON TABLE report_reviewers IS 'Configurable list of staff who can review and approve book reports (managed by librarians)';
COMMENT ON FUNCTION calculate_reading_points IS 'Calculate points awarded based on report quality and completion';
COMMENT ON FUNCTION approve_book_report IS 'Approve a book report, assign quality score, and award points to student';
