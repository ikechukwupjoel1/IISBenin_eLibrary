-- ============================================
-- FIX: Disable RLS for Book Clubs Tables
-- ============================================
-- Same issue as reviews - custom auth means auth.uid() returns NULL
-- Solution: Disable RLS on all book club related tables

-- Disable RLS on book_clubs table
ALTER TABLE book_clubs DISABLE ROW LEVEL SECURITY;

-- Disable RLS on book_club_members table
ALTER TABLE book_club_members DISABLE ROW LEVEL SECURITY;

-- Disable RLS on club_discussions table
ALTER TABLE club_discussions DISABLE ROW LEVEL SECURITY;

-- Disable RLS on discussion_likes table (if exists)
ALTER TABLE IF EXISTS discussion_likes DISABLE ROW LEVEL SECURITY;

-- Disable RLS on club_reading_list table
ALTER TABLE club_reading_list DISABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Enable read access for all users" ON book_clubs;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON book_clubs;
DROP POLICY IF EXISTS "Enable update for club admins" ON book_clubs;
DROP POLICY IF EXISTS "Enable delete for club admins" ON book_clubs;

DROP POLICY IF EXISTS "Enable read access for all users" ON book_club_members;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON book_club_members;
DROP POLICY IF EXISTS "Enable delete for members themselves" ON book_club_members;

DROP POLICY IF EXISTS "Enable read access for club members" ON club_discussions;
DROP POLICY IF EXISTS "Enable insert for club members" ON club_discussions;
DROP POLICY IF EXISTS "Enable delete for message authors" ON club_discussions;

DROP POLICY IF EXISTS "Enable read access for all users" ON discussion_likes;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON discussion_likes;
DROP POLICY IF EXISTS "Enable delete for users themselves" ON discussion_likes;

DROP POLICY IF EXISTS "Enable read access for club members" ON club_reading_list;
DROP POLICY IF EXISTS "Enable insert for club admins" ON club_reading_list;
DROP POLICY IF EXISTS "Enable update for club admins" ON club_reading_list;
DROP POLICY IF EXISTS "Enable delete for club admins" ON club_reading_list;

-- Verify RLS is disabled
SELECT 
  tablename,
  CASE WHEN rowsecurity THEN '❌ Enabled' ELSE '✅ Disabled' END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('book_clubs', 'book_club_members', 'club_discussions', 'discussion_likes', 'club_reading_list')
ORDER BY tablename;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE '✅ RLS DISABLED FOR BOOK CLUBS!';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '✓ book_clubs - RLS disabled';
  RAISE NOTICE '✓ book_club_members - RLS disabled';
  RAISE NOTICE '✓ club_discussions - RLS disabled';
  RAISE NOTICE '✓ discussion_likes - RLS disabled';
  RAISE NOTICE '✓ club_reading_list - RLS disabled';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'App-level permissions will handle security';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '🚀 Book clubs should work now!';
  RAISE NOTICE '==============================================';
END $$;
