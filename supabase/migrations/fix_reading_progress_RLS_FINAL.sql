-- Comprehensive fix for user_reading_progress RLS policies
-- Issue: INSERT is being blocked by RLS

-- Step 1: Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view own reading progress" ON user_reading_progress;
DROP POLICY IF EXISTS "Users can insert own reading progress" ON user_reading_progress;
DROP POLICY IF EXISTS "Users can update own reading progress" ON user_reading_progress;
DROP POLICY IF EXISTS "Staff can view all reading progress" ON user_reading_progress;

-- Step 2: Recreate policies with correct logic

-- SELECT policies (two separate policies: one for users, one for staff)
CREATE POLICY "Users can view own reading progress"
ON user_reading_progress FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Staff can view all reading progress"
ON user_reading_progress FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role IN ('librarian', 'staff', 'super_admin')
  )
);

-- INSERT policy (allow users to create their own records)
CREATE POLICY "Users can insert own reading progress"
ON user_reading_progress FOR INSERT
WITH CHECK (user_id = auth.uid());

-- UPDATE policy (allow users to update their own records)
CREATE POLICY "Users can update own reading progress"
ON user_reading_progress FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- DELETE policy (allow users to delete their own records - optional)
CREATE POLICY "Users can delete own reading progress"
ON user_reading_progress FOR DELETE
USING (user_id = auth.uid());

-- Step 3: Verify all policies
SELECT 
    '=== ALL POLICIES ===' as info,
    policyname,
    cmd as operation,
    CASE 
        WHEN cmd = 'SELECT' THEN pg_get_expr(qual, 'user_reading_progress'::regclass)
        WHEN cmd = 'INSERT' THEN pg_get_expr(with_check, 'user_reading_progress'::regclass)
        WHEN cmd = 'UPDATE' THEN pg_get_expr(qual, 'user_reading_progress'::regclass) || ' / ' || pg_get_expr(with_check, 'user_reading_progress'::regclass)
        WHEN cmd = 'DELETE' THEN pg_get_expr(qual, 'user_reading_progress'::regclass)
    END as policy_expression
FROM pg_policies
WHERE tablename = 'user_reading_progress'
ORDER BY cmd, policyname;

-- Step 4: Test INSERT
DO $$
DECLARE
    current_user_id uuid := auth.uid();
BEGIN
    -- First, try to delete if exists
    DELETE FROM user_reading_progress WHERE user_id = current_user_id;
    
    -- Now insert fresh
    INSERT INTO user_reading_progress (
        user_id,
        books_read,
        current_streak,
        longest_streak,
        reading_level,
        total_pages_read,
        achievements,
        weekly_goal
    ) VALUES (
        current_user_id,
        0,
        0,
        0,
        'Beginner',
        0,
        ARRAY[]::text[],
        3
    );
    
    RAISE NOTICE '✅ Successfully created reading progress for user %', current_user_id;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Insert failed: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    RAISE NOTICE 'Current user ID: %', current_user_id;
    RAISE NOTICE 'auth.uid(): %', auth.uid();
END $$;

-- Step 5: Verify
SELECT 
    '=== FINAL CHECK ===' as info,
    user_id,
    books_read,
    reading_level,
    weekly_goal,
    created_at
FROM user_reading_progress
WHERE user_id = auth.uid();
