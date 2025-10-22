-- ============================================
-- FIX: Review RLS Policy for INSERT
-- ============================================

-- Drop and recreate the INSERT policy with proper check
DROP POLICY IF EXISTS "Users can create reviews" ON reviews;

-- Users can create reviews - simplified check
CREATE POLICY "Users can create reviews"
  ON reviews FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    user_id = auth.uid()
  );

-- Verify the policy was created
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'reviews'
AND policyname = 'Users can create reviews';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE '✅ REVIEW INSERT POLICY FIXED!';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '✓ Simplified INSERT policy';
  RAISE NOTICE '✓ Users can now create reviews';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '🚀 Try submitting a review now!';
  RAISE NOTICE '==============================================';
END $$;
