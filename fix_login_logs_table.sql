-- Check login_logs table structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'login_logs'
ORDER BY ordinal_position;

-- Add user_id column if it doesn't exist
DO $$ 
BEGIN
    -- Check and add user_id column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'login_logs' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE login_logs ADD COLUMN user_id UUID;
        
        -- Add foreign key constraint
        ALTER TABLE login_logs 
        ADD CONSTRAINT fk_login_logs_user_profiles 
        FOREIGN KEY (user_id) 
        REFERENCES user_profiles(id) 
        ON DELETE SET NULL;
        
        RAISE NOTICE 'user_id column added to login_logs table';
    ELSE
        RAISE NOTICE 'user_id column already exists in login_logs table';
    END IF;
    
    -- Try to populate user_id from enrollment_id for existing records
    -- Match students first
    UPDATE login_logs ll
    SET user_id = up.id
    FROM user_profiles up
    WHERE ll.user_id IS NULL
    AND up.enrollment_id = ll.enrollment_id
    AND up.role = 'student';
    
    -- Then match staff
    UPDATE login_logs ll
    SET user_id = up.id
    FROM user_profiles up
    WHERE ll.user_id IS NULL
    AND up.enrollment_id = ll.enrollment_id
    AND up.role = 'staff';
    
    -- Match librarians
    UPDATE login_logs ll
    SET user_id = up.id
    FROM user_profiles up
    WHERE ll.user_id IS NULL
    AND (up.enrollment_id = ll.enrollment_id OR up.email = ll.enrollment_id)
    AND up.role = 'librarian';
    
    RAISE NOTICE 'Existing login logs updated with user_id where possible';
END $$;

-- Enable RLS if not enabled
ALTER TABLE login_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Librarians can view all login logs" ON login_logs;
DROP POLICY IF EXISTS "Anyone can insert login logs" ON login_logs;
DROP POLICY IF EXISTS "Public can insert login logs" ON login_logs;

-- Allow librarians to view all login logs
CREATE POLICY "Librarians can view all login logs"
ON login_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'librarian'
  )
);

-- Allow anyone (including unauthenticated) to insert login logs
-- This is necessary because students/staff are not authenticated via Supabase auth
CREATE POLICY "Public can insert login logs"
ON login_logs
FOR INSERT
TO public
WITH CHECK (true);

-- Verify the structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'login_logs'
ORDER BY ordinal_position;

-- Verify policies
SELECT 
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE tablename = 'login_logs'
ORDER BY cmd;

-- Show sample logs with user info
SELECT 
    ll.id,
    ll.enrollment_id,
    ll.user_id,
    ll.login_at,
    ll.success,
    up.full_name,
    up.role
FROM login_logs ll
LEFT JOIN user_profiles up ON ll.user_id = up.id
ORDER BY ll.login_at DESC
LIMIT 20;
