-- Comprehensive fix for reading progress errors
-- Run this in Supabase SQL Editor

-- Step 1: Drop and recreate reading_progress table with correct schema
DROP TABLE IF EXISTS reading_progress CASCADE;

CREATE TABLE reading_progress (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  borrow_record_id uuid REFERENCES borrow_records(id) ON DELETE CASCADE,
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
  
  UNIQUE(borrow_record_id, session_date)
);

-- Step 2: Drop and recreate user_reading_progress table
DROP TABLE IF EXISTS user_reading_progress CASCADE;

CREATE TABLE user_reading_progress (
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

-- Step 3: Create indexes
CREATE INDEX IF NOT EXISTS idx_reading_progress_user_id ON reading_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_progress_borrow_record ON reading_progress(borrow_record_id);
CREATE INDEX IF NOT EXISTS idx_reading_progress_session_date ON reading_progress(session_date);
CREATE INDEX IF NOT EXISTS idx_user_reading_progress_user_id ON user_reading_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_reading_progress_last_read ON user_reading_progress(last_read_date);

-- Step 4: Enable RLS on both tables
ALTER TABLE reading_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reading_progress ENABLE ROW LEVEL SECURITY;

-- Step 5: Drop any existing conflicting policies
DROP POLICY IF EXISTS "Users can view own reading progress" ON user_reading_progress;
DROP POLICY IF EXISTS "Users can insert own reading progress" ON user_reading_progress;
DROP POLICY IF EXISTS "Users can update own reading progress" ON user_reading_progress;
DROP POLICY IF EXISTS "Staff can view all reading progress" ON user_reading_progress;
DROP POLICY IF EXISTS "Users can view own sessions" ON reading_progress;
DROP POLICY IF EXISTS "Users can insert own sessions" ON reading_progress;
DROP POLICY IF EXISTS "Users can update own sessions" ON reading_progress;
DROP POLICY IF EXISTS "Staff can view all sessions" ON reading_progress;

-- Step 6: Create RLS policies for user_reading_progress
CREATE POLICY "Users can view own reading progress"
ON user_reading_progress FOR SELECT
USING (
  user_id IN (
    SELECT id FROM user_profiles WHERE auth_id = auth.uid()
  )
);

CREATE POLICY "Users can insert own reading progress"
ON user_reading_progress FOR INSERT
WITH CHECK (
  user_id IN (
    SELECT id FROM user_profiles WHERE auth_id = auth.uid()
  )
);

CREATE POLICY "Users can update own reading progress"
ON user_reading_progress FOR UPDATE
USING (
  user_id IN (
    SELECT id FROM user_profiles WHERE auth_id = auth.uid()
  )
)
WITH CHECK (
  user_id IN (
    SELECT id FROM user_profiles WHERE auth_id = auth.uid()
  )
);

CREATE POLICY "Staff can view all reading progress"
ON user_reading_progress FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE auth_id = auth.uid()
    AND role IN ('librarian', 'staff', 'super_admin')
  )
);

-- Step 7: Create RLS policies for reading_progress (session tracking)
CREATE POLICY "Users can view own sessions"
ON reading_progress FOR SELECT
USING (
  user_id IN (
    SELECT id FROM user_profiles WHERE auth_id = auth.uid()
  )
);

CREATE POLICY "Users can insert own sessions"
ON reading_progress FOR INSERT
WITH CHECK (
  user_id IN (
    SELECT id FROM user_profiles WHERE auth_id = auth.uid()
  )
);

CREATE POLICY "Users can update own sessions"
ON reading_progress FOR UPDATE
USING (
  user_id IN (
    SELECT id FROM user_profiles WHERE auth_id = auth.uid()
  )
)
WITH CHECK (
  user_id IN (
    SELECT id FROM user_profiles WHERE auth_id = auth.uid()
  )
);

CREATE POLICY "Staff can view all sessions"
ON reading_progress FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE auth_id = auth.uid()
    AND role IN ('librarian', 'staff', 'super_admin')
  )
);

-- Step 8: Verify everything was created
SELECT 
    '=== TABLES ===' as info,
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_name IN ('reading_progress', 'user_reading_progress')
ORDER BY table_name;

SELECT 
    '=== POLICIES ===' as info,
    tablename,
    policyname,
    cmd as operation
FROM pg_policies 
WHERE tablename IN ('reading_progress', 'user_reading_progress')
ORDER BY tablename, policyname;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Reading progress system configured successfully!';
    RAISE NOTICE '📊 reading_progress table: tracks individual reading sessions';
    RAISE NOTICE '🏆 user_reading_progress table: tracks overall user stats & achievements';
    RAISE NOTICE '🔐 RLS policies configured for both tables';
    RAISE NOTICE '🧪 TEST: Refresh your app and check Student Dashboard';
END $$;
