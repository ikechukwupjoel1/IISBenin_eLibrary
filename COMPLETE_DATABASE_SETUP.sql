-- =====================================================
-- COMPLETE DATABASE SETUP - RUN THIS SCRIPT FIRST
-- =====================================================
-- This script fixes all database issues in one go

-- =====================================================
-- 1. CREATE LIBRARY_SETTINGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS library_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL CHECK (key IN ('category', 'shelf')),
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(key, value)
);

-- Enable RLS
ALTER TABLE library_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Librarians can manage settings" ON library_settings;
DROP POLICY IF EXISTS "Everyone can view settings" ON library_settings;

-- Allow everyone to view settings
CREATE POLICY "Everyone can view settings"
ON library_settings
FOR SELECT
USING (true);

-- Allow librarians to manage settings
CREATE POLICY "Librarians can manage settings"
ON library_settings
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'librarian'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'librarian'
  )
);

-- Insert default categories
INSERT INTO library_settings (key, value) VALUES
  ('category', 'Fiction'),
  ('category', 'Non-Fiction'),
  ('category', 'Science'),
  ('category', 'Mathematics'),
  ('category', 'History'),
  ('category', 'Geography'),
  ('category', 'Literature'),
  ('category', 'English Language'),
  ('category', 'Biology'),
  ('category', 'Chemistry'),
  ('category', 'Physics'),
  ('category', 'Computer Science'),
  ('category', 'Reference'),
  ('category', 'eBook'),
  ('category', 'Electronic Material')
ON CONFLICT (key, value) DO NOTHING;

-- Insert default shelves
INSERT INTO library_settings (key, value) VALUES
  ('shelf', 'Shelf A1'),
  ('shelf', 'Shelf A2'),
  ('shelf', 'Shelf B1'),
  ('shelf', 'Shelf B2'),
  ('shelf', 'Section C'),
  ('shelf', 'Reference Section'),
  ('shelf', 'Digital Storage')
ON CONFLICT (key, value) DO NOTHING;

-- =====================================================
-- 2. FIX LOGIN_LOGS TABLE WITH PROPER FOREIGN KEY
-- =====================================================
-- Drop existing table to recreate properly
DROP TABLE IF EXISTS login_logs CASCADE;

-- Recreate with proper foreign key relationship
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

-- Create indexes for performance
CREATE INDEX idx_login_logs_user_id ON login_logs(user_id);
CREATE INDEX idx_login_logs_login_at ON login_logs(login_at DESC);
CREATE INDEX idx_login_logs_role ON login_logs(role);

-- Enable RLS
ALTER TABLE login_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
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

-- Policy: Allow anonymous inserts (for student/staff login)
CREATE POLICY "Allow anonymous inserts for login logs"
ON login_logs
FOR INSERT
TO anon
WITH CHECK (true);

-- Policy: Allow authenticated inserts (for librarian login)
CREATE POLICY "Allow authenticated inserts for login logs"
ON login_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- =====================================================
-- 3. AUTO-CONFIRM LIBRARIAN EMAILS
-- =====================================================
-- This function auto-confirms librarian emails after creation
CREATE OR REPLACE FUNCTION auto_confirm_librarian_email()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- If the new user is a librarian, auto-confirm their email
  IF EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = NEW.id 
    AND role = 'librarian'
  ) THEN
    -- Update auth.users to set email_confirmed_at only (confirmed_at is auto-generated)
    UPDATE auth.users
    SET email_confirmed_at = NOW()
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_auto_confirm_librarian ON auth.users;

-- Create trigger on auth.users insert
CREATE TRIGGER trigger_auto_confirm_librarian
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION auto_confirm_librarian_email();

-- =====================================================
-- 4. FIX EXISTING UNCONFIRMED LIBRARIAN ACCOUNTS
-- =====================================================
-- Auto-confirm all existing librarian accounts (only update email_confirmed_at)
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE id IN (
  SELECT id FROM user_profiles WHERE role = 'librarian'
)
AND email_confirmed_at IS NULL;

-- =====================================================
-- 5. VERIFICATION QUERIES
-- =====================================================

-- Check library_settings table
SELECT 'library_settings table created' AS status, COUNT(*) AS record_count 
FROM library_settings;

-- Check login_logs table structure
SELECT 'login_logs foreign key exists' AS status
FROM information_schema.table_constraints 
WHERE table_name = 'login_logs' 
AND constraint_type = 'FOREIGN KEY';

-- Check librarian email confirmations
SELECT 
  'Confirmed librarians' AS status,
  COUNT(*) AS count
FROM auth.users au
JOIN user_profiles up ON au.id = up.id
WHERE up.role = 'librarian'
AND au.email_confirmed_at IS NOT NULL;

-- Show all librarians with their confirmation status
SELECT 
  up.full_name,
  au.email,
  up.enrollment_id,
  CASE 
    WHEN au.email_confirmed_at IS NOT NULL THEN 'Confirmed'
    ELSE 'Not Confirmed'
  END AS email_status
FROM user_profiles up
JOIN auth.users au ON up.id = au.id
WHERE up.role = 'librarian'
ORDER BY up.created_at DESC;

-- =====================================================
-- SCRIPT COMPLETE
-- =====================================================
SELECT '✅ All database fixes applied successfully!' AS message;
