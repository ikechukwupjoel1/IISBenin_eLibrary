-- ============================================
-- FIX: Reviews Not Showing After Submission
-- ============================================

-- Ensure default status is 'approved' for reviews
ALTER TABLE reviews ALTER COLUMN status SET DEFAULT 'approved';

-- Drop and recreate RLS policies for better visibility
DROP POLICY IF EXISTS "Anyone can view approved reviews" ON reviews;
DROP POLICY IF EXISTS "Users can create reviews" ON reviews;
DROP POLICY IF EXISTS "Users can update own reviews" ON reviews;
DROP POLICY IF EXISTS "Users can delete own reviews" ON reviews;
DROP POLICY IF EXISTS "Librarians can view all reviews" ON reviews;
DROP POLICY IF EXISTS "Librarians can moderate reviews" ON reviews;
DROP POLICY IF EXISTS "Librarians can delete reviews" ON reviews;

-- Everyone can view approved reviews OR their own reviews (any status)
CREATE POLICY "Anyone can view approved reviews"
  ON reviews FOR SELECT
  USING (
    status = 'approved' OR user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('librarian', 'admin')
    )
  );

-- Users can create reviews (will default to 'approved')
CREATE POLICY "Users can create reviews"
  ON reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own reviews (but not change status unless librarian)
CREATE POLICY "Users can update own reviews"
  ON reviews FOR UPDATE
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('librarian', 'admin')
    )
  );

-- Users can delete their own reviews
CREATE POLICY "Users can delete own reviews"
  ON reviews FOR DELETE
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('librarian', 'admin')
    )
  );

-- Update any existing reviews with NULL status to 'approved'
UPDATE reviews SET status = 'approved' WHERE status IS NULL;

-- Verification: Check review policies
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
  RAISE NOTICE '✅ REVIEW VISIBILITY FIXED!';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '✓ Default status set to approved';
  RAISE NOTICE '✓ RLS policies updated for better visibility';
  RAISE NOTICE '✓ Existing NULL statuses updated';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '🚀 Reviews should now appear after submission!';
  RAISE NOTICE '==============================================';
END $$;
