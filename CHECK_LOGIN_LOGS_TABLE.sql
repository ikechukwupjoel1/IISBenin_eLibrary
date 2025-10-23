-- Check login_logs table structure and permissions

-- 1. Check if table exists and its structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'login_logs'
ORDER BY ordinal_position;

-- 2. Check RLS policies
SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'login_logs';

-- 3. Check if RLS is enabled
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'login_logs';

-- 4. Try to insert a test log
INSERT INTO login_logs (
  enrollment_id,
  status,
  role,
  login_at,
  user_agent,
  ip_address,
  location
) VALUES (
  'TEST123',
  'success',
  'test',
  NOW(),
  'Test User Agent',
  '127.0.0.1',
  'Test Location'
) RETURNING *;

-- 5. Count total records
SELECT COUNT(*) as total_login_logs FROM login_logs;

-- 6. Show recent logs (if any)
SELECT * FROM login_logs ORDER BY login_at DESC LIMIT 5;
