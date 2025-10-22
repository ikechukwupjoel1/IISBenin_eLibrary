-- Quick test to check if login_logs table exists and has data
-- Run this in Supabase SQL Editor

-- Check if table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public'
   AND table_name = 'login_logs'
) AS table_exists;

-- If table exists, check its structure
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'login_logs'
ORDER BY ordinal_position;

-- Check if there's any data
SELECT COUNT(*) AS record_count FROM login_logs;

-- Show last 5 records if any exist
SELECT * FROM login_logs 
ORDER BY login_at DESC 
LIMIT 5;
