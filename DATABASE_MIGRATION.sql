-- ============================================
-- Database Migration Script - Student Engagement Features
-- ============================================
-- ⚠️ IMPORTANT: Run CRITICAL_DATABASE_FIX.sql FIRST!
-- That file fixes existing features (Reading Challenges, Reviews)
-- Then run this file for the new engagement features
-- ============================================
-- ============================================
-- PREREQUISITE: EXISTING FEATURES (run CRITICAL_DATABASE_FIX.sql first)
-- ============================================
-- This section assumes you've already run CRITICAL_DATABASE_FIX.sql
-- which creates: reading_challenges, challenge_participants, reviews

-- ============================================
-- READING PROGRESS & ACHIEVEMENTS
-- ============================================

-- Reading Progress Tracking Table
CREATE TABLE IF NOT EXISTS reading_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  books_read INT DEFAULT 0,
  current_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,
  reading_level VARCHAR(50) DEFAULT 'Beginner',
  total_pages_read INT DEFAULT 0,
  achievements TEXT[], -- Array of achievement IDs
  weekly_goal INT DEFAULT 3,
  last_read_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_reading_progress_user ON reading_progress(user_id);

-- Trigger to update books_read when borrows are returned
CREATE OR REPLACE FUNCTION update_reading_progress()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'returned' AND OLD.status != 'returned' THEN
    INSERT INTO reading_progress (user_id, books_read, last_read_date)
    VALUES (NEW.user_id, 1, CURRENT_DATE)
    ON CONFLICT (user_id)
    DO UPDATE SET
      books_read = reading_progress.books_read + 1,
      last_read_date = CURRENT_DATE,
      updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_reading_progress
AFTER UPDATE ON borrows
FOR EACH ROW
EXECUTE FUNCTION update_reading_progress();

-- ============================================
-- BOOK CLUBS & SOCIAL FEATURES
-- ============================================

-- Book Clubs Table
CREATE TABLE IF NOT EXISTS book_clubs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  created_by UUID REFERENCES user_profiles(id),
  is_private BOOLEAN DEFAULT false,
  current_book_id UUID REFERENCES books(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for category filtering
CREATE INDEX IF NOT EXISTS idx_book_clubs_category ON book_clubs(category);
CREATE INDEX IF NOT EXISTS idx_book_clubs_created_by ON book_clubs(created_by);

-- Club Members Table
CREATE TABLE IF NOT EXISTS book_club_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id UUID REFERENCES book_clubs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member', -- 'admin' or 'member'
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(club_id, user_id)
);

-- Indexes for member queries
CREATE INDEX IF NOT EXISTS idx_club_members_club ON book_club_members(club_id);
CREATE INDEX IF NOT EXISTS idx_club_members_user ON book_club_members(user_id);

-- Club Discussions Table
CREATE TABLE IF NOT EXISTS club_discussions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id UUID REFERENCES book_clubs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_profiles(id),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast discussion retrieval
CREATE INDEX IF NOT EXISTS idx_club_discussions_club ON club_discussions(club_id);
CREATE INDEX IF NOT EXISTS idx_club_discussions_created_at ON club_discussions(created_at DESC);

-- Discussion Likes Table
CREATE TABLE IF NOT EXISTS discussion_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  discussion_id UUID REFERENCES club_discussions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(discussion_id, user_id)
);

-- Index for like counting
CREATE INDEX IF NOT EXISTS idx_discussion_likes_discussion ON discussion_likes(discussion_id);

-- Club Reading List Table
CREATE TABLE IF NOT EXISTS club_reading_list (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id UUID REFERENCES book_clubs(id) ON DELETE CASCADE,
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  added_by UUID REFERENCES user_profiles(id),
  status VARCHAR(50) DEFAULT 'upcoming', -- 'upcoming', 'current', 'completed'
  added_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for reading list queries
CREATE INDEX IF NOT EXISTS idx_club_reading_list_club ON club_reading_list(club_id);
CREATE INDEX IF NOT EXISTS idx_club_reading_list_status ON club_reading_list(status);

-- ============================================
-- BOOK WAITING LIST
-- ============================================

-- Waiting List Table
CREATE TABLE IF NOT EXISTS book_waitlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'waiting', -- 'waiting', 'notified', 'cancelled'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  notified_at TIMESTAMPTZ
);

-- Indexes for waitlist queries
CREATE INDEX IF NOT EXISTS idx_waitlist_book ON book_waitlist(book_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_user ON book_waitlist(user_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_status ON book_waitlist(status);
CREATE INDEX IF NOT EXISTS idx_waitlist_created_at ON book_waitlist(created_at);

-- ============================================
-- REVIEW SYSTEM & MODERATION
-- ============================================

-- Book Reviews Table (may already exist - modify if needed)
CREATE TABLE IF NOT EXISTS book_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  moderated_at TIMESTAMPTZ,
  moderated_by UUID REFERENCES user_profiles(id)
);

-- Indexes for review queries
CREATE INDEX IF NOT EXISTS idx_reviews_book ON book_reviews(book_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON book_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON book_reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON book_reviews(created_at DESC);

-- Review Likes Table
CREATE TABLE IF NOT EXISTS review_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id UUID REFERENCES book_reviews(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(review_id, user_id)
);

-- Index for like counting
CREATE INDEX IF NOT EXISTS idx_review_likes_review ON review_likes(review_id);

-- Review Reports Table
CREATE TABLE IF NOT EXISTS review_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id UUID REFERENCES book_reviews(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(review_id, user_id)
);

-- Index for report counting
CREATE INDEX IF NOT EXISTS idx_review_reports_review ON review_reports(review_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all new tables
ALTER TABLE reading_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_club_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_reading_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_reports ENABLE ROW LEVEL SECURITY;

-- Reading Progress Policies
CREATE POLICY "Users can view own reading progress"
  ON reading_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own reading progress"
  ON reading_progress FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reading progress"
  ON reading_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Book Clubs Policies
CREATE POLICY "Public clubs are viewable by all"
  ON book_clubs FOR SELECT
  USING (is_private = false OR created_by = auth.uid());

CREATE POLICY "Users can create clubs"
  ON book_clubs FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Club creators can update their clubs"
  ON book_clubs FOR UPDATE
  USING (auth.uid() = created_by);

-- Club Members Policies
CREATE POLICY "Club members can view members"
  ON book_club_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM book_club_members bcm
      WHERE bcm.club_id = club_id AND bcm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can join clubs"
  ON book_club_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave clubs"
  ON book_club_members FOR DELETE
  USING (auth.uid() = user_id);

-- Club Discussions Policies
CREATE POLICY "Club members can view discussions"
  ON club_discussions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM book_club_members
      WHERE club_id = club_discussions.club_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Club members can post discussions"
  ON club_discussions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM book_club_members
      WHERE club_id = club_discussions.club_id AND user_id = auth.uid()
    )
  );

-- Discussion Likes Policies
CREATE POLICY "Users can like discussions"
  ON discussion_likes FOR ALL
  USING (auth.uid() = user_id);

-- Waitlist Policies
CREATE POLICY "Users can view own waitlist"
  ON book_waitlist FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can join waitlist"
  ON book_waitlist FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own waitlist"
  ON book_waitlist FOR UPDATE
  USING (auth.uid() = user_id);

-- Review Policies
CREATE POLICY "Approved reviews are public"
  ON book_reviews FOR SELECT
  USING (status = 'approved' OR user_id = auth.uid());

CREATE POLICY "Users can create reviews"
  ON book_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reviews"
  ON book_reviews FOR UPDATE
  USING (auth.uid() = user_id);

-- Review Likes Policies
CREATE POLICY "Users can like reviews"
  ON review_likes FOR ALL
  USING (auth.uid() = user_id);

-- Review Reports Policies
CREATE POLICY "Users can report reviews"
  ON review_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own reports"
  ON review_reports FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================
-- LIBRARIAN POLICIES (Admin Access)
-- ============================================

-- Librarians can view all reviews
CREATE POLICY "Librarians can view all reviews"
  ON book_reviews FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('librarian', 'admin')
    )
  );

-- Librarians can moderate reviews
CREATE POLICY "Librarians can moderate reviews"
  ON book_reviews FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('librarian', 'admin')
    )
  );

-- Librarians can delete reviews
CREATE POLICY "Librarians can delete reviews"
  ON book_reviews FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('librarian', 'admin')
    )
  );

-- Librarians can view all waitlists
CREATE POLICY "Librarians can view all waitlists"
  ON book_waitlist FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('librarian', 'admin')
    )
  );

-- Librarians can manage waitlists
CREATE POLICY "Librarians can update waitlists"
  ON book_waitlist FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('librarian', 'admin')
    )
  );

-- ============================================
-- NOTIFICATION SYSTEM (Optional Enhancement)
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'book_available', 'achievement_unlocked', 'club_message', etc.
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB, -- Additional data like book_id, achievement_id, etc.
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================

-- Insert sample book club categories
-- (These are just for reference, not actual insertions)
/*
Example Categories:
- General
- Fiction
- Non-Fiction
- Science
- History
- Technology
- Arts
- Business
*/

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Run these to verify tables were created successfully:

-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'reading_progress',
  'book_clubs',
  'book_club_members',
  'club_discussions',
  'discussion_likes',
  'club_reading_list',
  'book_waitlist',
  'book_reviews',
  'review_likes',
  'review_reports',
  'notifications'
);

-- Check indexes exist
SELECT indexname FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN (
  'reading_progress',
  'book_clubs',
  'book_club_members',
  'club_discussions',
  'book_waitlist',
  'book_reviews'
);

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
  'reading_progress',
  'book_clubs',
  'book_club_members',
  'club_discussions',
  'book_waitlist',
  'book_reviews'
);

-- ============================================
-- COMPLETION MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Database migration completed successfully!';
  RAISE NOTICE '📊 Created 10+ tables for engagement features';
  RAISE NOTICE '🔒 Configured Row Level Security policies';
  RAISE NOTICE '⚡ Added performance indexes';
  RAISE NOTICE '🎯 Ready for production use!';
END $$;

-- ============================================
-- ROLLBACK SCRIPT (if needed - use with caution)
-- ============================================
-- Use with caution - this will delete all engagement feature data
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS review_reports CASCADE;
DROP TABLE IF EXISTS review_likes CASCADE;
DROP TABLE IF EXISTS club_reading_list CASCADE;
DROP TABLE IF EXISTS discussion_likes CASCADE;
DROP TABLE IF EXISTS club_discussions CASCADE;
DROP TABLE IF EXISTS book_club_members CASCADE;
DROP TABLE IF EXISTS book_clubs CASCADE;
DROP TABLE IF EXISTS book_waitlist CASCADE;
DROP TABLE IF EXISTS reading_progress CASCADE;

-- Only drop if you created book_reviews table
-- DROP TABLE IF EXISTS book_reviews CASCADE;

DROP FUNCTION IF EXISTS update_reading_progress() CASCADE;
```

## Notes

- Run this script in Supabase SQL Editor
- Execute in a single transaction if possible
- Backup database before migration
- Test in development environment first
- Monitor for any constraint violations
- Verify application connections work after migration
