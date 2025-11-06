-- ========================================
-- FIX ANNOUNCEMENTS AND INVITATIONS SYSTEM
-- ========================================

-- ========================================
-- PART 1: CHECK CURRENT STATUS
-- ========================================

-- 1. Check if announcements table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'announcements'
) as announcements_table_exists;

-- 2. Check if get_user_role function exists
SELECT EXISTS (
  SELECT FROM information_schema.routines 
  WHERE routine_schema = 'public' 
  AND routine_name = 'get_user_role'
) as get_user_role_exists;

-- 3. Check if librarian_invitations table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'librarian_invitations'
) as librarian_invitations_exists;

-- 4. Check if create_librarian_invitation function exists
SELECT EXISTS (
  SELECT FROM information_schema.routines 
  WHERE routine_schema = 'public' 
  AND routine_name = 'create_librarian_invitation'
) as create_librarian_invitation_exists;

-- ========================================
-- PART 2: FIX ANNOUNCEMENTS (IF NEEDED)
-- ========================================

-- Just ensure get_user_role function exists (don't drop it - it's used by many policies)
CREATE OR REPLACE FUNCTION get_user_role(user_uuid uuid)
RETURNS text AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role
  FROM user_profiles
  WHERE id = user_uuid;
  RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create announcements table if missing
CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  message text NOT NULL,
  created_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  institution_id uuid REFERENCES institutions(id) ON DELETE CASCADE,
  target_audience text NOT NULL CHECK (target_audience IN ('all', 'staff', 'students', 'grade_1', 'grade_2', 'grade_3', 'grade_4', 'grade_5', 'grade_6', 'grade_7', 'grade_8', 'grade_9', 'grade_10', 'grade_11', 'grade_12'))
);

-- Add institution_id column if missing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'announcements' 
    AND column_name = 'institution_id'
  ) THEN
    ALTER TABLE announcements ADD COLUMN institution_id uuid REFERENCES institutions(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "announcements_select_for_users" ON announcements;
DROP POLICY IF EXISTS "announcements_insert_by_role" ON announcements;
DROP POLICY IF EXISTS "announcements_delete_own" ON announcements;

-- Create NEW policies that work
CREATE POLICY "announcements_select_for_users" ON announcements
FOR SELECT
USING (
  -- Super admins see all
  get_user_role(auth.uid()) = 'super_admin'
  OR
  -- Users see announcements from their institution
  (
    institution_id IN (
      SELECT institution_id FROM user_profiles WHERE id = auth.uid()
    )
    AND (
      target_audience = 'all' 
      OR (target_audience = 'staff' AND get_user_role(auth.uid()) IN ('staff', 'librarian'))
      OR (target_audience = 'students' AND get_user_role(auth.uid()) = 'student')
    )
  )
);

CREATE POLICY "announcements_insert_by_role" ON announcements
FOR INSERT
WITH CHECK (
  -- Librarians and super admins can create announcements
  get_user_role(auth.uid()) IN ('librarian', 'super_admin')
  AND
  -- Must be for their own institution (or any for super admin)
  (
    get_user_role(auth.uid()) = 'super_admin'
    OR
    institution_id IN (SELECT institution_id FROM user_profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "announcements_update_own" ON announcements
FOR UPDATE
USING (
  created_by = auth.uid() 
  OR 
  get_user_role(auth.uid()) IN ('librarian', 'super_admin')
);

CREATE POLICY "announcements_delete_own" ON announcements
FOR DELETE
USING (
  created_by = auth.uid() 
  OR 
  get_user_role(auth.uid()) IN ('librarian', 'super_admin')
);

-- ========================================
-- PART 3: FIX LIBRARIAN INVITATIONS
-- ========================================

-- Create librarian_invitations table if missing
CREATE TABLE IF NOT EXISTS librarian_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  created_user_id UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked'))
);

-- Enable RLS
ALTER TABLE librarian_invitations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Super admins full access" ON librarian_invitations;
DROP POLICY IF EXISTS "Public can view by token" ON librarian_invitations;

-- Create NEW policies
CREATE POLICY "super_admins_full_access" ON librarian_invitations
FOR ALL
TO authenticated
USING (
  get_user_role(auth.uid()) = 'super_admin'
);

CREATE POLICY "public_view_by_token" ON librarian_invitations
FOR SELECT
TO anon
USING (status = 'pending' AND expires_at > NOW());

-- Create indexes if missing
CREATE INDEX IF NOT EXISTS idx_librarian_invitations_token ON librarian_invitations(token);
CREATE INDEX IF NOT EXISTS idx_librarian_invitations_email ON librarian_invitations(email);
CREATE INDEX IF NOT EXISTS idx_librarian_invitations_status ON librarian_invitations(status);

-- Drop and recreate the invitation function with correct return type
DROP FUNCTION IF EXISTS create_librarian_invitation(uuid, text);

CREATE OR REPLACE FUNCTION create_librarian_invitation(
  target_institution_id UUID,
  invitee_email TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token TEXT;
  v_caller_role TEXT;
BEGIN
  -- Get caller's role
  SELECT role INTO v_caller_role
  FROM user_profiles
  WHERE id = auth.uid();

  -- Check if caller is super admin
  IF v_caller_role != 'super_admin' THEN
    RAISE EXCEPTION 'Only super admins can create invitations';
  END IF;

  -- Generate secure random token
  v_token := encode(gen_random_bytes(32), 'base64');
  v_token := replace(replace(replace(v_token, '/', '_'), '+', '-'), '=', '');

  -- Revoke any existing pending invitations
  UPDATE librarian_invitations
  SET status = 'revoked'
  WHERE institution_id = target_institution_id
    AND email = invitee_email
    AND status = 'pending';

  -- Create new invitation
  INSERT INTO librarian_invitations (
    institution_id,
    email,
    token,
    invited_by
  )
  VALUES (
    target_institution_id,
    invitee_email,
    v_token,
    auth.uid()
  );

  -- Return the token
  RETURN v_token;
END;
$$;

-- ========================================
-- PART 4: VERIFY FIX
-- ========================================

-- Test announcement creation (replace with your actual user ID and institution ID)
-- INSERT INTO announcements (message, created_by, institution_id, target_audience)
-- VALUES (
--   'Test announcement - System is working!',
--   'YOUR_USER_ID_HERE',
--   'YOUR_INSTITUTION_ID_HERE',
--   'all'
-- );

-- Check if everything is set up correctly
SELECT 
  'Announcements table' as component,
  CASE WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'announcements') 
    THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
SELECT 
  'Librarian invitations table',
  CASE WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'librarian_invitations') 
    THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT 
  'get_user_role function',
  CASE WHEN EXISTS (SELECT FROM information_schema.routines WHERE routine_name = 'get_user_role') 
    THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT 
  'create_librarian_invitation function',
  CASE WHEN EXISTS (SELECT FROM information_schema.routines WHERE routine_name = 'create_librarian_invitation') 
    THEN '✅ EXISTS' ELSE '❌ MISSING' END;

-- Show RLS policies for announcements
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd
FROM pg_policies 
WHERE tablename = 'announcements';

