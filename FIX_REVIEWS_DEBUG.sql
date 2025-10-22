-- ============================================
-- COMPREHENSIVE FIX: Reviews RLS Policies
-- ============================================

-- First, let's check what's in the user_profiles table
SELECT 
  id as profile_id,
  role,
  full_name,
  email
FROM user_profiles
LIMIT 5;

-- Drop ALL existing review policies
DROP POLICY IF EXISTS "Anyone can view approved reviews" ON reviews;
DROP POLICY IF EXISTS "Users can create reviews" ON reviews;
DROP POLICY IF EXISTS "Users can update own reviews" ON reviews;
DROP POLICY IF EXISTS "Users can delete own reviews" ON reviews;

-- CREATE SUPER PERMISSIVE POLICIES FOR TESTING

-- 1. Everyone can view ALL reviews (for debugging)
CREATE POLICY "Anyone can view all reviews"
  ON reviews FOR SELECT
  USING (true);

-- 2. Anyone authenticated can create reviews
CREATE POLICY "Authenticated users can create reviews"
  ON reviews FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 3. Users can update any review (for debugging)
CREATE POLICY "Users can update reviews"
  ON reviews FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- 4. Users can delete any review (for debugging)
CREATE POLICY "Users can delete reviews"
  ON reviews FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Show the new policies
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies 
WHERE tablename = 'reviews'
ORDER BY policyname;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE '✅ SUPER PERMISSIVE POLICIES APPLIED!';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '⚠️ These are for DEBUGGING ONLY';
  RAISE NOTICE '✓ All authenticated users can now:';
  RAISE NOTICE '  - View all reviews';
  RAISE NOTICE '  - Create reviews';
  RAISE NOTICE '  - Update reviews';
  RAISE NOTICE '  - Delete reviews';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '🚀 Try creating a review now!';
  RAISE NOTICE '⚠️ Remember to tighten security after testing!';
  RAISE NOTICE '==============================================';
END $$;
