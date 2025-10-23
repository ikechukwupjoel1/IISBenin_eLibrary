-- ============================================
-- FIX: Update admin role to 'librarian'
-- ============================================
-- The is_librarian() function checks for role = 'librarian'
-- but we created the account with role = 'staff'
-- This updates it to 'librarian'
-- ============================================

UPDATE user_profiles
SET role = 'librarian'
WHERE email = 'librarian@iisbenin.com';

-- Verify the update
SELECT id, email, full_name, role, enrollment_id
FROM user_profiles
WHERE email = 'librarian@iisbenin.com';
