-- Fix existing staff members that don't have user profiles
-- This creates user_profiles for staff members that are missing them

-- First, let's see which staff members are missing profiles
SELECT 
  s.id as staff_id,
  s.name,
  s.email,
  s.enrollment_id,
  s.phone_number,
  up.id as profile_id
FROM staff s
LEFT JOIN user_profiles up ON up.staff_id = s.id
WHERE up.id IS NULL;

-- Now create user_profiles for staff members that don't have them
-- Note: Replace 'default_password' with the actual password you want to set
INSERT INTO user_profiles (id, email, full_name, role, enrollment_id, password_hash, staff_id, created_at, updated_at)
SELECT 
  s.id,                    -- Use staff table ID as profile ID
  s.email,                 -- Staff email
  s.name,                  -- Staff name
  'staff',                 -- Role
  s.enrollment_id,         -- Enrollment ID
  'qLsvR3WH',             -- Default password (replace with actual if different)
  s.id,                    -- Link to staff record
  NOW(),
  NOW()
FROM staff s
LEFT JOIN user_profiles up ON up.staff_id = s.id
WHERE up.id IS NULL;

-- Verify the fix
SELECT 
  s.id as staff_id,
  s.name,
  s.enrollment_id,
  up.id as profile_id,
  up.role,
  up.password_hash
FROM staff s
LEFT JOIN user_profiles up ON up.staff_id = s.id;
