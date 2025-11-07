-- Create user_reading_progress table for tracking overall user reading stats
-- This is separate from reading_progress which tracks individual reading sessions

CREATE TABLE IF NOT EXISTS user_reading_progress (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE UNIQUE,
  
  -- Overall statistics
  books_read integer DEFAULT 0,
  total_pages_read integer DEFAULT 0,
  
  -- Streak tracking
  current_streak integer DEFAULT 0,
  longest_streak integer DEFAULT 0,
  last_read_date date,
  
  -- Level and goals
  reading_level text DEFAULT 'Beginner',
  weekly_goal integer DEFAULT 3,
  
  -- Achievements
  achievements text[] DEFAULT '{}',
  
  -- Metadata
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_reading_progress_user_id ON user_reading_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_reading_progress_last_read ON user_reading_progress(last_read_date);

-- Enable RLS
ALTER TABLE user_reading_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own progress
CREATE POLICY "Users can view own reading progress"
ON user_reading_progress FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own progress
CREATE POLICY "Users can insert own reading progress"
ON user_reading_progress FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own progress
CREATE POLICY "Users can update own reading progress"
ON user_reading_progress FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Librarians and staff can view all progress
CREATE POLICY "Staff can view all reading progress"
ON user_reading_progress FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role IN ('librarian', 'staff', 'super_admin')
  )
);

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ user_reading_progress table created successfully!';
    RAISE NOTICE '📊 This table tracks overall user reading statistics';
    RAISE NOTICE '🔐 RLS policies configured for users and staff';
END $$;
