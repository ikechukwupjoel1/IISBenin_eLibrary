-- ============================================
-- COMPREHENSIVE FIX: Disable RLS for ALL Engagement Features
-- ============================================
-- Your app uses custom auth (students/staff tables, not Supabase Auth)
-- auth.uid() returns NULL for all users
-- Solution: Disable RLS on all tables and handle permissions in the app

-- ============================================
-- 1. REVIEWS SYSTEM
-- ============================================
ALTER TABLE reviews DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view all reviews" ON reviews;
DROP POLICY IF EXISTS "Authenticated users can create reviews" ON reviews;
DROP POLICY IF EXISTS "Users can update reviews" ON reviews;
DROP POLICY IF EXISTS "Users can delete reviews" ON reviews;

ALTER TABLE review_likes DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view review likes" ON review_likes;
DROP POLICY IF EXISTS "Users can like reviews" ON review_likes;
DROP POLICY IF EXISTS "Users can unlike reviews" ON review_likes;

ALTER TABLE review_reports DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view reports" ON review_reports;
DROP POLICY IF EXISTS "Users can report reviews" ON review_reports;

-- ============================================
-- 2. BOOK CLUBS SYSTEM
-- ============================================
ALTER TABLE book_clubs DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON book_clubs;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON book_clubs;
DROP POLICY IF EXISTS "Enable update for club admins" ON book_clubs;
DROP POLICY IF EXISTS "Enable delete for club admins" ON book_clubs;

ALTER TABLE book_club_members DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON book_club_members;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON book_club_members;
DROP POLICY IF EXISTS "Enable delete for members themselves" ON book_club_members;

ALTER TABLE club_discussions DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for club members" ON club_discussions;
DROP POLICY IF EXISTS "Enable insert for club members" ON club_discussions;
DROP POLICY IF EXISTS "Enable delete for message authors" ON club_discussions;

ALTER TABLE discussion_likes DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON discussion_likes;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON discussion_likes;
DROP POLICY IF EXISTS "Enable delete for users themselves" ON discussion_likes;

ALTER TABLE club_reading_list DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for club members" ON club_reading_list;
DROP POLICY IF EXISTS "Enable insert for club admins" ON club_reading_list;
DROP POLICY IF EXISTS "Enable update for club admins" ON club_reading_list;
DROP POLICY IF EXISTS "Enable delete for club admins" ON club_reading_list;

-- ============================================
-- 3. READING STREAKS & CHALLENGES
-- ============================================
ALTER TABLE reading_challenges DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view challenges" ON reading_challenges;
DROP POLICY IF EXISTS "Librarians can create challenges" ON reading_challenges;
DROP POLICY IF EXISTS "Librarians can update challenges" ON reading_challenges;

ALTER TABLE challenge_participants DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view participants" ON challenge_participants;
DROP POLICY IF EXISTS "Users can join challenges" ON challenge_participants;
DROP POLICY IF EXISTS "Users can update their progress" ON challenge_participants;

ALTER TABLE reading_progress DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their progress" ON reading_progress;
DROP POLICY IF EXISTS "System can track progress" ON reading_progress;

-- ============================================
-- 4. WAITING LIST SYSTEM
-- ============================================
ALTER TABLE book_waitlist DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view waitlist" ON book_waitlist;
DROP POLICY IF EXISTS "Users can join waitlist" ON book_waitlist;
DROP POLICY IF EXISTS "Users can leave waitlist" ON book_waitlist;
DROP POLICY IF EXISTS "Librarians can manage waitlist" ON book_waitlist;

-- ============================================
-- 5. NOTIFICATIONS SYSTEM
-- ============================================
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their notifications" ON notifications;
DROP POLICY IF EXISTS "System can create notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their notifications" ON notifications;

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 
  tablename,
  CASE WHEN rowsecurity THEN '❌ Enabled' ELSE '✅ Disabled' END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
  'reviews', 'review_likes', 'review_reports',
  'book_clubs', 'book_club_members', 'club_discussions', 'discussion_likes', 'club_reading_list',
  'reading_challenges', 'challenge_participants', 'reading_progress',
  'book_waitlist',
  'notifications'
)
ORDER BY tablename;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '✅ RLS DISABLED FOR ALL ENGAGEMENT FEATURES!';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📝 REVIEWS SYSTEM:';
  RAISE NOTICE '   ✓ reviews - RLS disabled';
  RAISE NOTICE '   ✓ review_likes - RLS disabled';
  RAISE NOTICE '   ✓ review_reports - RLS disabled';
  RAISE NOTICE '';
  RAISE NOTICE '👥 BOOK CLUBS SYSTEM:';
  RAISE NOTICE '   ✓ book_clubs - RLS disabled';
  RAISE NOTICE '   ✓ book_club_members - RLS disabled';
  RAISE NOTICE '   ✓ club_discussions - RLS disabled';
  RAISE NOTICE '   ✓ discussion_likes - RLS disabled';
  RAISE NOTICE '   ✓ club_reading_list - RLS disabled';
  RAISE NOTICE '';
  RAISE NOTICE '🏆 READING STREAKS & CHALLENGES:';
  RAISE NOTICE '   ✓ reading_challenges - RLS disabled';
  RAISE NOTICE '   ✓ challenge_participants - RLS disabled';
  RAISE NOTICE '   ✓ reading_progress - RLS disabled';
  RAISE NOTICE '';
  RAISE NOTICE '⏳ WAITING LIST SYSTEM:';
  RAISE NOTICE '   ✓ book_waitlist - RLS disabled';
  RAISE NOTICE '';
  RAISE NOTICE '🔔 NOTIFICATIONS SYSTEM:';
  RAISE NOTICE '   ✓ notifications - RLS disabled';
  RAISE NOTICE '';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '🔒 SECURITY NOTE:';
  RAISE NOTICE '   App-level permissions will handle all security checks';
  RAISE NOTICE '   User role (student/staff/librarian) checked in components';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '🚀 All engagement features should work now!';
  RAISE NOTICE '====================================================================';
END $$;
