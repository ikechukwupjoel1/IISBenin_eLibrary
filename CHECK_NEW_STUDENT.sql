-- Check the newly created student STU70419874
SELECT 
    'Student Record' as source,
    s.id as student_id,
    s.name,
    s.enrollment_id,
    s.email,
    s.grade_level,
    s.created_at
FROM students s
WHERE s.enrollment_id = 'STU70419874'

UNION ALL

SELECT 
    'User Profile' as source,
    up.id as student_id,
    up.full_name as name,
    up.enrollment_id,
    up.email,
    up.role as grade_level,
    up.created_at
FROM user_profiles up
WHERE up.enrollment_id = 'STU70419874'

UNION ALL

SELECT 
    'Auth User' as source,
    au.id,
    'N/A' as name,
    'N/A' as enrollment_id,
    au.email,
    'N/A' as grade_level,
    au.created_at
FROM auth.users au
WHERE au.email IN (
    SELECT email FROM students WHERE enrollment_id = 'STU70419874'
    UNION
    SELECT email FROM user_profiles WHERE enrollment_id = 'STU70419874'
);

-- Check if student_id is properly linked
SELECT 
    s.id AS student_id,
    s.name AS student_name,
    s.enrollment_id,
    s.email AS student_email,
    up.id AS profile_user_id,
    up.student_id AS profile_links_to,
    up.email AS profile_email,
    up.role,
    CASE 
        WHEN up.id IS NULL THEN '❌ No user_profile created'
        WHEN up.student_id IS NULL THEN '❌ Profile not linked to student'
        WHEN up.student_id != s.id THEN '❌ Profile linked to wrong student'
        ELSE '✅ Properly linked'
    END AS linkage_status
FROM students s
LEFT JOIN user_profiles up ON up.student_id = s.id
WHERE s.enrollment_id = 'STU70419874';
