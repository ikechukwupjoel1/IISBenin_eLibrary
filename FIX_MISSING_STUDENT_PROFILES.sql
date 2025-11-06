-- Fix students without user_profiles
-- Creates missing user_profiles for 5 students who can't log in

-- Step 1: Show students without profiles
SELECT 
    s.enrollment_id,
    s.name,
    s.email,
    s.grade_level,
    s.institution_id,
    s.id as student_id,
    'No Profile' as status
FROM students s
LEFT JOIN user_profiles up ON s.id = up.student_id
WHERE up.id IS NULL
ORDER BY s.created_at DESC;

-- Step 2: Create missing user_profiles with default passwords
-- NOTE: These students will need to change their passwords
INSERT INTO user_profiles (
    id,
    email,
    full_name,
    role,
    enrollment_id,
    student_id,
    institution_id,
    password_hash,
    created_at
)
SELECT 
    s.id,  -- Use same ID as student for consistency
    COALESCE(s.email, s.parent_email, LOWER(s.enrollment_id) || '@temp.com'),
    s.name,
    'student',
    s.enrollment_id,
    s.id,
    s.institution_id,
    'TempPass123!',  -- Default password - students should change this
    NOW()
FROM students s
LEFT JOIN user_profiles up ON s.id = up.student_id
WHERE up.id IS NULL;

-- Step 3: Verify all students now have profiles
SELECT 
    COUNT(*) as total_students,
    COUNT(up.id) as students_with_profiles,
    COUNT(*) - COUNT(up.id) as students_without_profiles
FROM students s
LEFT JOIN user_profiles up ON s.id = up.student_id;

-- Step 4: Show the newly created profiles with their credentials
SELECT 
    'NEWLY CREATED PROFILES' as info,
    up.enrollment_id,
    up.full_name,
    up.email,
    up.password_hash as default_password,
    up.created_at
FROM user_profiles up
WHERE up.created_at > NOW() - INTERVAL '1 minute'
  AND up.role = 'student'
ORDER BY up.created_at DESC;
