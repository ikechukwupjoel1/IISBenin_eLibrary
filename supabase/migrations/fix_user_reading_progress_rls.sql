-- Fix RLS policies for user_reading_progress table
-- The issue: auth.uid() doesn't directly match user_profiles.id

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own reading progress" ON user_reading_progress;
DROP POLICY IF EXISTS "Users can insert own reading progress" ON user_reading_progress;
DROP POLICY IF EXISTS "Users can update own reading progress" ON user_reading_progress;
DROP POLICY IF EXISTS "Staff can view all reading progress" ON user_reading_progress;

-- Recreate policies with correct logic
-- Users can view their own progress (match via user_profiles)
CREATE POLICY "Users can view own reading progress"
ON user_reading_progress FOR SELECT
USING (
  user_id IN (
    SELECT id FROM user_profiles WHERE auth_id = auth.uid()
  )
);

-- Users can insert their own progress
CREATE POLICY "Users can insert own reading progress"
ON user_reading_progress FOR INSERT
WITH CHECK (
  user_id IN (
    SELECT id FROM user_profiles WHERE auth_id = auth.uid()
  )
);

-- Users can update their own progress
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

-- Librarians and staff can view all progress
CREATE POLICY "Staff can view all reading progress"
ON user_reading_progress FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE auth_id = auth.uid()
    AND role IN ('librarian', 'staff', 'super_admin')
  )
);

-- Verify policies were created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as operation
FROM pg_policies 
WHERE tablename = 'user_reading_progress'
ORDER BY policyname;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ RLS policies fixed for user_reading_progress!';
    RAISE NOTICE '🔐 Policies now correctly match auth.uid() to user_profiles.auth_id';
    RAISE NOTICE '📝 4 policies created: SELECT, INSERT, UPDATE, and staff view all';
END $$;
