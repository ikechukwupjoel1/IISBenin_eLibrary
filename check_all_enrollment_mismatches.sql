-- Check for ALL enrollment_id mismatches between students and user_profiles
-- This will help identify any other broken accounts

SELECT 
    s.enrollment_id as student_table_id,
    up.enrollment_id as profile_table_id,
    s.name,
    s.email,
    s.id as student_id,
    CASE 
        WHEN s.enrollment_id = up.enrollment_id THEN '✅ Match'
        WHEN up.enrollment_id IS NULL THEN '❌ No Profile'
        ELSE '❌ Mismatch'
    END as status
FROM students s
LEFT JOIN user_profiles up ON s.id = up.student_id
WHERE s.enrollment_id != up.enrollment_id 
   OR up.enrollment_id IS NULL
ORDER BY s.created_at DESC;

-- Count mismatches
SELECT 
    COUNT(*) as total_students,
    COUNT(up.id) as students_with_profiles,
    COUNT(*) - COUNT(up.id) as students_without_profiles,
    SUM(CASE WHEN s.enrollment_id != up.enrollment_id THEN 1 ELSE 0 END) as mismatched_ids
FROM students s
LEFT JOIN user_profiles up ON s.id = up.student_id;
