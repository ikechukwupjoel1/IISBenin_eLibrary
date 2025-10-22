-- ============================================
-- CRITICAL FIX: Missing Tables for Existing Features
-- Run this FIRST before using the engagement features
-- ============================================

-- ============================================
-- FIX 1: READING CHALLENGES TABLE
-- ============================================

-- Reading Challenges Table
CREATE TABLE IF NOT EXISTS reading_challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  target_books INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Challenge Participants Table
CREATE TABLE IF NOT EXISTS challenge_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_id UUID REFERENCES reading_challenges(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  books_read INT DEFAULT 0,
  completed_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(challenge_id, user_id)
);

-- Indexes for Reading Challenges
CREATE INDEX IF NOT EXISTS idx_reading_challenges_active ON reading_challenges(is_active);
CREATE INDEX IF NOT EXISTS idx_reading_challenges_dates ON reading_challenges(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_challenge_participants_challenge ON challenge_participants(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_participants_user ON challenge_participants(user_id);

-- RLS Policies for Reading Challenges
ALTER TABLE reading_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_participants ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view active challenges" ON reading_challenges;
DROP POLICY IF EXISTS "Librarians can create challenges" ON reading_challenges;
DROP POLICY IF EXISTS "Librarians can update challenges" ON reading_challenges;
DROP POLICY IF EXISTS "Users can view challenge participants" ON challenge_participants;
DROP POLICY IF EXISTS "Users can join challenges" ON challenge_participants;
DROP POLICY IF EXISTS "Users can update own participation" ON challenge_participants;

-- Everyone can view active challenges
CREATE POLICY "Anyone can view active challenges"
  ON reading_challenges FOR SELECT
  USING (is_active = true);

-- Librarians can create challenges
CREATE POLICY "Librarians can create challenges"
  ON reading_challenges FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('librarian', 'admin')
    )
  );

-- Librarians can update challenges
CREATE POLICY "Librarians can update challenges"
  ON reading_challenges FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('librarian', 'admin')
    )
  );

-- Users can view challenge participants
CREATE POLICY "Users can view challenge participants"
  ON challenge_participants FOR SELECT
  USING (true);

-- Users can join challenges
CREATE POLICY "Users can join challenges"
  ON challenge_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own participation
CREATE POLICY "Users can update own participation"
  ON challenge_participants FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- FIX 2: REVIEWS TABLE (Ensure it exists)
-- ============================================

-- Reviews Table (may already exist with different name)
-- First, check if 'book_reviews' exists and rename if needed
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'book_reviews') 
     AND NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reviews') THEN
    ALTER TABLE book_reviews RENAME TO reviews;
  END IF;
END $$;

-- Create reviews table if it doesn't exist
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'approved', -- 'pending', 'approved', 'rejected'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  moderated_at TIMESTAMPTZ,
  moderated_by UUID REFERENCES user_profiles(id)
);

-- Indexes for Reviews
CREATE INDEX IF NOT EXISTS idx_reviews_book ON reviews(book_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);

-- RLS Policies for Reviews
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view approved reviews" ON reviews;
DROP POLICY IF EXISTS "Users can create reviews" ON reviews;
DROP POLICY IF EXISTS "Users can update own reviews" ON reviews;
DROP POLICY IF EXISTS "Users can delete own reviews" ON reviews;
DROP POLICY IF EXISTS "Librarians can view all reviews" ON reviews;
DROP POLICY IF EXISTS "Librarians can moderate reviews" ON reviews;
DROP POLICY IF EXISTS "Librarians can delete reviews" ON reviews;

-- Everyone can view approved reviews
CREATE POLICY "Anyone can view approved reviews"
  ON reviews FOR SELECT
  USING (status = 'approved' OR user_id = auth.uid());

-- Users can create reviews
CREATE POLICY "Users can create reviews"
  ON reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update own reviews (before approval)
CREATE POLICY "Users can update own reviews"
  ON reviews FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete own reviews
CREATE POLICY "Users can delete own reviews"
  ON reviews FOR DELETE
  USING (auth.uid() = user_id);

-- Librarians can view all reviews
CREATE POLICY "Librarians can view all reviews"
  ON reviews FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('librarian', 'admin')
    )
  );

-- Librarians can moderate reviews
CREATE POLICY "Librarians can moderate reviews"
  ON reviews FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('librarian', 'admin')
    )
  );

-- Librarians can delete reviews
CREATE POLICY "Librarians can delete reviews"
  ON reviews FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('librarian', 'admin')
    )
  );

-- ============================================
-- FIX 3: ENSURE BOOKS TABLE HAS REQUIRED COLUMNS
-- ============================================

-- Add author_publisher column if it doesn't exist
DO $$
DECLARE
  has_author BOOLEAN;
  has_publisher BOOLEAN;
BEGIN
  -- Check if author_publisher already exists
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'books' 
    AND column_name = 'author_publisher'
  ) THEN
    -- Check what columns we have
    SELECT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'books' 
      AND column_name = 'author'
    ) INTO has_author;
    
    SELECT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'books' 
      AND column_name = 'publisher'
    ) INTO has_publisher;
    
    -- Add the column
    ALTER TABLE books ADD COLUMN author_publisher TEXT;
    
    -- Populate based on what we have
    IF has_author AND has_publisher THEN
      -- We have both columns, combine them
      UPDATE books SET author_publisher = 
        CASE 
          WHEN publisher IS NOT NULL AND publisher != '' 
          THEN CONCAT(author, ' (', publisher, ')')
          ELSE author
        END;
    ELSIF has_author THEN
      -- Only have author column
      UPDATE books SET author_publisher = author;
    ELSE
      -- No author or publisher columns, leave empty for manual entry
      RAISE NOTICE 'ℹ️ author_publisher column created but empty. Please populate manually.';
    END IF;
  END IF;
END $$;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify tables exist
DO $$
DECLARE
  missing_tables TEXT[] := ARRAY[]::TEXT[];
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reading_challenges') THEN
    missing_tables := array_append(missing_tables, 'reading_challenges');
  END IF;
  
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'challenge_participants') THEN
    missing_tables := array_append(missing_tables, 'challenge_participants');
  END IF;
  
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reviews') THEN
    missing_tables := array_append(missing_tables, 'reviews');
  END IF;

  IF array_length(missing_tables, 1) > 0 THEN
    RAISE NOTICE '❌ Missing tables: %', array_to_string(missing_tables, ', ');
  ELSE
    RAISE NOTICE '✅ All critical tables exist!';
  END IF;
END $$;

-- List all tables for verification
SELECT 
  table_name,
  CASE 
    WHEN table_name IN ('reading_challenges', 'challenge_participants', 'reviews', 'books') 
    THEN '✅ Critical'
    ELSE '📋 Other'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY status DESC, table_name;

-- Check RLS is enabled
SELECT 
  tablename,
  CASE WHEN rowsecurity THEN '✅ Enabled' ELSE '❌ Disabled' END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('reading_challenges', 'challenge_participants', 'reviews')
ORDER BY tablename;

-- Show column info for books table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'books'
ORDER BY ordinal_position;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE '✅ CRITICAL FIXES APPLIED SUCCESSFULLY';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '✓ Reading Challenges table created';
  RAISE NOTICE '✓ Challenge Participants table created';
  RAISE NOTICE '✓ Reviews table verified/created';
  RAISE NOTICE '✓ Books table columns verified';
  RAISE NOTICE '✓ All RLS policies configured';
  RAISE NOTICE '✓ Performance indexes added';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '🚀 Your application should now work correctly!';
  RAISE NOTICE '==============================================';
END $$;
