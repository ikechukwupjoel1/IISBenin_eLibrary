-- Fix INSERT policy for user_reading_progress
-- The issue: Users can't create their own reading progress records

-- Drop and recreate the INSERT policy with correct logic
DROP POLICY IF EXISTS "Users can insert own reading progress" ON user_reading_progress;

CREATE POLICY "Users can insert own reading progress"
ON user_reading_progress FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Also ensure the user_id column default is set correctly
-- (This helps when inserting without explicitly setting user_id)

-- Verify the fix
SELECT 
    '=== INSERT POLICY ===' as info,
    policyname,
    cmd as operation,
    with_check as check_expression
FROM pg_policies
WHERE tablename = 'user_reading_progress'
AND cmd = 'INSERT';

-- Test: Try to insert a record for current user
DO $$
DECLARE
    current_user_id uuid := auth.uid();
    test_result text;
BEGIN
    -- Delete any existing test record first
    DELETE FROM user_reading_progress WHERE user_id = current_user_id;
    
    -- Try to insert
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
        '{}',
        3
    );
    
    RAISE NOTICE '✅ SUCCESS: Created reading progress record for user %', current_user_id;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ ERROR: % - %', SQLERRM, SQLSTATE;
END $$;

-- Verify the record exists
SELECT 
    '=== VERIFICATION ===' as info,
    user_id,
    books_read,
    reading_level,
    weekly_goal,
    created_at
FROM user_reading_progress
WHERE user_id = auth.uid();
