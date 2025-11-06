-- FIX: Update enrollment_id mismatch for student Harichandana
-- Problem: students.enrollment_id = 'S0003' but user_profiles.enrollment_id = 'STU48789565'
-- Solution: Sync them to match

-- Step 1: Show the mismatch
SELECT 
    'BEFORE UPDATE' as status,
    s.enrollment_id as student_enrollment_id,
    up.enrollment_id as profile_enrollment_id,
    s.name,
    s.id as student_id
FROM students s
LEFT JOIN user_profiles up ON s.id = up.student_id
WHERE s.enrollment_id = 'S0003';

-- Step 2: Update user_profiles to match students table
UPDATE user_profiles
SET enrollment_id = 'S0003'
WHERE student_id = '24142e48-e76f-4265-86a6-03e3efe18a32'
  AND enrollment_id = 'STU48789565';

-- Step 3: Verify the fix
SELECT 
    'AFTER UPDATE' as status,
    s.enrollment_id as student_enrollment_id,
    up.enrollment_id as profile_enrollment_id,
    s.name,
    up.password_hash,
    s.id as student_id,
    up.id as profile_id
FROM students s
LEFT JOIN user_profiles up ON s.id = up.student_id
WHERE s.enrollment_id = 'S0003';

-- Step 4: Test if login will work
SELECT 
    'LOGIN TEST' as test,
    enrollment_id,
    role,
    password_hash,
    full_name,
    email,
    CASE 
        WHEN password_hash = '*Zy5C^LemK$6' THEN '✅ Password Matches'
        ELSE '❌ Password Does NOT Match'
    END as password_check
FROM user_profiles
WHERE enrollment_id = 'S0003'
  AND role = 'student';
