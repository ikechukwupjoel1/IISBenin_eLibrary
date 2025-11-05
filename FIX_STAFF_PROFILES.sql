-- Fix missing user_profiles for staff members
-- Create user_profiles for all staff who don't have accounts

-- Check which staff don't have user_profiles
SELECT 
  s.id as staff_id,
  s.name,
  s.enrollment_id,
  s.email,
  up.id as profile_id
FROM staff s
LEFT JOIN user_profiles up ON s.enrollment_id = up.enrollment_id
WHERE up.id IS NULL;

-- Create user_profiles for staff without accounts
-- Default password: StaffPass123!

INSERT INTO user_profiles (
  id,
  enrollment_id,
  full_name,
  email,
  role,
  institution_id,
  password_hash,
  created_at
)
SELECT 
  gen_random_uuid() as id,
  s.enrollment_id,
  s.name,
  s.email,
  'staff' as role,
  s.institution_id,
  'StaffPass123!' as password_hash,
  now() as created_at
FROM staff s
LEFT JOIN user_profiles up ON s.enrollment_id = up.enrollment_id
WHERE up.id IS NULL
  AND s.enrollment_id IS NOT NULL;

-- Verify the creation
SELECT 
  up.enrollment_id,
  up.full_name,
  up.email,
  up.role,
  up.password_hash,
  up.created_at
FROM user_profiles up
WHERE up.role = 'staff'
  AND up.enrollment_id IN (
    SELECT enrollment_id FROM staff
  )
ORDER BY up.created_at DESC;

-- Count total staff with and without profiles
SELECT 
  COUNT(*) as total_staff,
  COUNT(up.id) as staff_with_profiles,
  COUNT(*) - COUNT(up.id) as staff_without_profiles
FROM staff s
LEFT JOIN user_profiles up ON s.enrollment_id = up.enrollment_id;
