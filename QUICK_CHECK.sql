-- Quick diagnostic to see what we have
SELECT 
    id,
    name,
    enrollment_id,
    email,
    parent_email,
    grade_level,
    created_at
FROM students 
WHERE enrollment_id = 'STU47856843';

-- Also check what auth user exists
SELECT id, email, created_at, email_confirmed_at
FROM auth.users
WHERE email LIKE '%47856843%';
