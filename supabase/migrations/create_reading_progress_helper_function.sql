-- TEMPORARY FIX: Allow app to auto-create reading progress records
-- The issue: auth.uid() is null in SQL Editor, but works fine in the app
-- This adds a service role bypass so records can be created

-- Option 1: Add a permissive policy that allows service role to insert
CREATE POLICY "Service role can manage all reading progress"
ON user_reading_progress
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Option 2: Create a function to initialize user progress (called by app)
CREATE OR REPLACE FUNCTION initialize_user_reading_progress(p_user_id uuid)
RETURNS user_reading_progress
LANGUAGE plpgsql
SECURITY DEFINER -- This runs with elevated privileges
SET search_path = public
AS $$
DECLARE
  result user_reading_progress;
BEGIN
  -- Check if already exists
  SELECT * INTO result
  FROM user_reading_progress
  WHERE user_id = p_user_id;
  
  -- If not, create it
  IF NOT FOUND THEN
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
      p_user_id,
      0,
      0,
      0,
      'Beginner',
      0,
      ARRAY[]::text[],
      3
    )
    RETURNING * INTO result;
  END IF;
  
  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION initialize_user_reading_progress(uuid) TO authenticated;

-- Verify the function was created
SELECT 
  '=== FUNCTION CREATED ===' as info,
  proname as function_name,
  prosecdef as is_security_definer
FROM pg_proc
WHERE proname = 'initialize_user_reading_progress';

-- Test message
DO $$
BEGIN
  RAISE NOTICE '✅ Created helper function: initialize_user_reading_progress()';
  RAISE NOTICE '📝 The app will now call this function to create user reading progress';
  RAISE NOTICE '🔐 This function runs with SECURITY DEFINER to bypass RLS';
  RAISE NOTICE '';
  RAISE NOTICE 'Next step: Update the React component to call this function';
END $$;
