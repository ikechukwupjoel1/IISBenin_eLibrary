-- ============================================
-- CREATE INITIAL ADMIN/LIBRARIAN ACCOUNT
-- ============================================
-- Run this in Supabase SQL Editor AFTER creating
-- the auth user in Supabase Auth UI
--
-- Steps:
-- 1. Supabase Dashboard → Authentication → Users
-- 2. Click "Add user" → "Create new user"
-- 3. Email: admin@iisbenin.edu.ng
-- 4. Password: AdminLib2025! (or your choice - 10+ chars)
-- 5. Auto Confirm User: ✅ CHECK THIS
-- 6. Copy the user's UUID after creation
-- 7. Come back here and replace 'YOUR_AUTH_USER_UUID' below
-- 8. Run this entire script
-- ============================================

DO $$
DECLARE
  v_staff_id uuid;
  v_enrollment_id text;
  v_auth_user_id uuid;
BEGIN
  -- Replace this with the UUID from Supabase Auth → Users
  v_auth_user_id := 'YOUR_AUTH_USER_UUID'::uuid;  -- ⚠️ REPLACE THIS!
  
  RAISE NOTICE 'Creating admin account...';
  
  -- Generate enrollment ID
  v_enrollment_id := 'STA' || to_char(now(), 'HHMMSS') || floor(random() * 100)::text;
  
  -- Step 1: Create staff record
  INSERT INTO staff (enrollment_id, name, email, phone_number)
  VALUES (
    v_enrollment_id,
    'IIS Benin Administrator',
    'admin@iisbenin.edu.ng',
    '+2290153077528'
  )
  RETURNING id INTO v_staff_id;
  
  RAISE NOTICE 'Staff record created with ID: %', v_staff_id;
  RAISE NOTICE 'Enrollment ID: %', v_enrollment_id;
  
  -- Step 2: Create user profile
  INSERT INTO user_profiles (id, email, full_name, role, enrollment_id, staff_id)
  VALUES (
    v_auth_user_id,
    'admin@iisbenin.edu.ng',
    'IIS Benin Administrator',
    'staff',
    v_enrollment_id,
    v_staff_id
  );
  
  RAISE NOTICE 'User profile created successfully!';
  RAISE NOTICE '';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '✅ ADMIN ACCOUNT CREATED SUCCESSFULLY!';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE 'Email: admin@iisbenin.edu.ng';
  RAISE NOTICE 'Enrollment ID: %', v_enrollment_id;
  RAISE NOTICE 'Staff ID: %', v_staff_id;
  RAISE NOTICE '';
  RAISE NOTICE 'You can now login with:';
  RAISE NOTICE '  Email: admin@iisbenin.edu.ng';
  RAISE NOTICE '  Password: (the one you set in Supabase Auth)';
  RAISE NOTICE '====================================================================';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error creating admin account: %', SQLERRM;
END $$;
