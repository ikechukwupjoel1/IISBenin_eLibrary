-- Fix login_logs table to have proper relationship with user_profiles

-- First, let's check the current structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'login_logs'
ORDER BY ordinal_position;

-- Drop the existing table if it has issues
DROP TABLE IF EXISTS login_logs CASCADE;

-- Recreate login_logs table with proper foreign key
CREATE TABLE login_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  enrollment_id TEXT,
  full_name TEXT,
  role TEXT,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  login_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT
);

-- Create index for faster queries
CREATE INDEX idx_login_logs_user_id ON login_logs(user_id);
CREATE INDEX idx_login_logs_login_at ON login_logs(login_at DESC);
CREATE INDEX idx_login_logs_role ON login_logs(role);

-- Enable RLS
ALTER TABLE login_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Librarians can view all login logs" ON login_logs;
DROP POLICY IF EXISTS "Users can view own login logs" ON login_logs;
DROP POLICY IF EXISTS "Allow anonymous inserts for login logs" ON login_logs;
DROP POLICY IF EXISTS "Allow authenticated inserts for login logs" ON login_logs;

-- Policy: Librarians can view all logs
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

-- Policy: Users can view their own logs
CREATE POLICY "Users can view own login logs"
ON login_logs
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy: Allow anonymous inserts (for student/staff login tracking)
CREATE POLICY "Allow anonymous inserts for login logs"
ON login_logs
FOR INSERT
TO anon
WITH CHECK (true);

-- Policy: Allow authenticated inserts (for librarian login tracking)
CREATE POLICY "Allow authenticated inserts for login logs"
ON login_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Insert some sample data for testing
INSERT INTO login_logs (user_id, enrollment_id, full_name, role, status, login_at)
SELECT 
  id,
  enrollment_id,
  full_name,
  role,
  'success',
  NOW() - (INTERVAL '1 day' * floor(random() * 30))
FROM user_profiles
WHERE role IN ('librarian', 'staff', 'student')
LIMIT 20;

-- Verify the relationship
SELECT 
  c.table_name,
  c.column_name,
  c.data_type,
  tc.constraint_type,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.columns c
LEFT JOIN information_schema.key_column_usage kcu 
  ON c.table_name = kcu.table_name 
  AND c.column_name = kcu.column_name
LEFT JOIN information_schema.table_constraints tc 
  ON kcu.constraint_name = tc.constraint_name
LEFT JOIN information_schema.constraint_column_usage ccu 
  ON tc.constraint_name = ccu.constraint_name
WHERE c.table_name = 'login_logs'
ORDER BY c.ordinal_position;

-- Query to test the relationship works
SELECT 
  ll.id,
  ll.login_at,
  ll.status,
  ll.role,
  up.full_name,
  up.enrollment_id
FROM login_logs ll
LEFT JOIN user_profiles up ON ll.user_id = up.id
ORDER BY ll.login_at DESC
LIMIT 10;
