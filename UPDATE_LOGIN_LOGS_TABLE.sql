-- ============================================
-- UPDATE LOGIN_LOGS TABLE WITH NEW COLUMNS
-- ============================================
-- Adds: location, user_agent, ip_address, full_name
-- for enhanced login tracking
-- ============================================

-- Add location column (city, country from IP)
ALTER TABLE login_logs 
ADD COLUMN IF NOT EXISTS location TEXT;

-- Add user_agent column (browser/device info)
ALTER TABLE login_logs 
ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- Add ip_address column
ALTER TABLE login_logs 
ADD COLUMN IF NOT EXISTS ip_address TEXT;

-- Add full_name column (for display)
ALTER TABLE login_logs 
ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_login_logs_login_at ON login_logs(login_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_logs_status ON login_logs(status);
CREATE INDEX IF NOT EXISTS idx_login_logs_role ON login_logs(role);

-- Verify columns exist
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'login_logs'
ORDER BY ordinal_position;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '✅ LOGIN_LOGS TABLE UPDATED SUCCESSFULLY!';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 New Columns Added:';
  RAISE NOTICE '   ✓ location - City, Country from IP address';
  RAISE NOTICE '   ✓ user_agent - Browser and device information';
  RAISE NOTICE '   ✓ ip_address - User IP address';
  RAISE NOTICE '   ✓ full_name - User full name for display';
  RAISE NOTICE '';
  RAISE NOTICE '⚡ Indexes Added:';
  RAISE NOTICE '   ✓ idx_login_logs_login_at - For date sorting';
  RAISE NOTICE '   ✓ idx_login_logs_status - For status filtering';
  RAISE NOTICE '   ✓ idx_login_logs_role - For role filtering';
  RAISE NOTICE '';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '🚀 Login tracking is now fully functional!';
  RAISE NOTICE '====================================================================';
END $$;
