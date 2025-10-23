-- Check the login_logs table schema
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'login_logs'
ORDER BY ordinal_position;

-- Check sample data
SELECT 
  id,
  user_id,
  login_at,
  ip_address,
  user_agent,
  location,
  device_type,
  browser,
  os,
  city,
  country,
  status
FROM login_logs
ORDER BY login_at DESC
LIMIT 5;

-- Count non-null values
SELECT 
  COUNT(*) as total_logs,
  COUNT(ip_address) as has_ip,
  COUNT(user_agent) as has_user_agent,
  COUNT(location) as has_location,
  COUNT(device_type) as has_device_type,
  COUNT(browser) as has_browser,
  COUNT(os) as has_os,
  COUNT(city) as has_city,
  COUNT(country) as has_country
FROM login_logs;
