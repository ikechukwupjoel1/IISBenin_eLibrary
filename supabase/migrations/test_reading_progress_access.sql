-- Test reading progress table access
-- Run this to verify RLS policies are working correctly

-- 1. Check if user_reading_progress table exists
SELECT 
    'Table exists?' as check_type,
    EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'user_reading_progress'
    ) as result;

-- 2. Check RLS is enabled
SELECT 
    'RLS enabled?' as check_type,
    relrowsecurity as result
FROM pg_class
WHERE relname = 'user_reading_progress';

-- 3. List all policies
SELECT 
    'Policies:' as check_type,
    policyname,
    cmd as operation,
    qual as using_expression
FROM pg_policies
WHERE tablename = 'user_reading_progress';

-- 4. Try to select as current user (this simulates what the app does)
SELECT 
    'Current user can read?' as check_type,
    COUNT(*) as record_count
FROM user_reading_progress;

-- 5. Check current auth user
SELECT 
    'Current auth.uid():' as check_type,
    auth.uid() as user_id;

-- 6. Try to insert a test record (will auto-create for current user)
-- This simulates what the app should do
DO $$
DECLARE
    current_user_id uuid := auth.uid();
BEGIN
    -- Check if record exists
    IF NOT EXISTS (
        SELECT 1 FROM user_reading_progress 
        WHERE user_id = current_user_id
    ) THEN
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
        RAISE NOTICE 'Created reading progress record for user %', current_user_id;
    ELSE
        RAISE NOTICE 'Reading progress record already exists for user %', current_user_id;
    END IF;
END $$;

-- 7. Verify the record was created/exists
SELECT 
    '=== USER READING PROGRESS ===' as info,
    user_id,
    books_read,
    current_streak,
    reading_level,
    weekly_goal,
    created_at
FROM user_reading_progress
WHERE user_id = auth.uid();
