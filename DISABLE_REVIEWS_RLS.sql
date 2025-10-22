-- ============================================
-- FINAL FIX: Disable RLS for Reviews Table
-- ============================================
-- Your app uses custom auth (not Supabase Auth)
-- so auth.uid() returns NULL
-- Solution: Disable RLS and handle permissions in the app

-- Disable RLS on reviews table
ALTER TABLE reviews DISABLE ROW LEVEL SECURITY;

-- Drop all policies (they won't be used anyway)
DROP POLICY IF EXISTS "Anyone can view all reviews" ON reviews;
DROP POLICY IF EXISTS "Authenticated users can create reviews" ON reviews;
DROP POLICY IF EXISTS "Users can update reviews" ON reviews;
DROP POLICY IF EXISTS "Users can delete reviews" ON reviews;

-- Verify RLS is disabled
SELECT 
  tablename,
  CASE WHEN rowsecurity THEN '❌ Enabled' ELSE '✅ Disabled' END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'reviews';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE '✅ RLS DISABLED FOR REVIEWS!';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '✓ Row Level Security disabled';
  RAISE NOTICE '✓ All policies removed';
  RAISE NOTICE '✓ App-level permissions will handle security';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '🚀 Reviews should work now!';
  RAISE NOTICE '==============================================';
END $$;
