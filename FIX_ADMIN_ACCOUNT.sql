-- ============================================
-- FIX EXISTING ADMIN ACCOUNT
-- ============================================
-- This script updates an existing auth user to be an admin/librarian
-- Run this in Supabase SQL Editor
-- ============================================

DO $$
DECLARE
  v_staff_id uuid;
  v_enrollment_id text;
  v_auth_user_id uuid;
  v_existing_profile_id uuid;
BEGIN
  -- The UUID from Supabase Auth → Users
  v_auth_user_id := 'ca537c87-c247-42e0-9332-e1903490d8c3'::uuid;
  
  RAISE NOTICE 'Checking existing records...';
  
  -- Check if user profile already exists
  SELECT id INTO v_existing_profile_id
  FROM user_profiles
  WHERE id = v_auth_user_id;
  
  IF v_existing_profile_id IS NOT NULL THEN
    RAISE NOTICE 'User profile already exists, checking staff record...';
    
    -- Check if staff record exists for this email
    SELECT id, enrollment_id INTO v_staff_id, v_enrollment_id
    FROM staff
    WHERE email = 'librarian@iisbenin.com';
    
    IF v_staff_id IS NULL THEN
      -- Create staff record
      RAISE NOTICE 'Creating new staff record...';
      v_enrollment_id := 'STA' || to_char(now(), 'HHMMSS') || floor(random() * 100)::text;
      
      INSERT INTO staff (enrollment_id, name, email, phone_number)
      VALUES (
        v_enrollment_id,
        'IIS Benin Administrator',
        'librarian@iisbenin.com',
        '+2290153077528'
      )
      RETURNING id INTO v_staff_id;
      
      RAISE NOTICE 'Staff record created with ID: %', v_staff_id;
    ELSE
      RAISE NOTICE 'Staff record already exists with ID: %', v_staff_id;
    END IF;
    
    -- Update the existing user profile to link to staff
    UPDATE user_profiles
    SET 
      email = 'librarian@iisbenin.com',
      full_name = 'IIS Benin Administrator',
      role = 'staff',
      enrollment_id = v_enrollment_id,
      staff_id = v_staff_id
    WHERE id = v_auth_user_id;
    
    RAISE NOTICE 'User profile updated successfully!';
    
  ELSE
    -- Create new profile (shouldn't happen but just in case)
    RAISE NOTICE 'Creating new user profile...';
    v_enrollment_id := 'STA' || to_char(now(), 'HHMMSS') || floor(random() * 100)::text;
    
    INSERT INTO staff (enrollment_id, name, email, phone_number)
    VALUES (
      v_enrollment_id,
      'IIS Benin Administrator',
      'librarian@iisbenin.com',
      '+2290153077528'
    )
    RETURNING id INTO v_staff_id;
    
    INSERT INTO user_profiles (id, email, full_name, role, enrollment_id, staff_id)
    VALUES (
      v_auth_user_id,
      'librarian@iisbenin.com',
      'IIS Benin Administrator',
      'staff',
      v_enrollment_id,
      v_staff_id
    );
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '✅ ADMIN ACCOUNT SETUP COMPLETED!';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE 'Email: librarian@iisbenin.com';
  RAISE NOTICE 'Enrollment ID: %', v_enrollment_id;
  RAISE NOTICE 'Staff ID: %', v_staff_id;
  RAISE NOTICE '';
  RAISE NOTICE 'You can now login with:';
  RAISE NOTICE '  Email: librarian@iisbenin.com';
  RAISE NOTICE '  Password: AdminLib2025! (or the password you set)';
  RAISE NOTICE '';
  RAISE NOTICE 'Try logging in at your app URL!';
  RAISE NOTICE '====================================================================';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error setting up admin account: %', SQLERRM;
END $$;
