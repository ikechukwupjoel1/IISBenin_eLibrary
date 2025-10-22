-- Check books table structure and data
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'books'
ORDER BY ordinal_position;

-- Check if there are any ebooks or electronic materials
SELECT 
    id,
    title,
    author,
    category,
    status,
    material_type,
    class_specific,
    created_at
FROM books
WHERE material_type IN ('ebook', 'electronic_material')
LIMIT 10;

-- Check login_logs table structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'login_logs'
ORDER BY ordinal_position;

-- Check if there are any login logs
SELECT 
    COUNT(*) as total_logs,
    COUNT(CASE WHEN success = true THEN 1 END) as successful_logs,
    COUNT(CASE WHEN success = false THEN 1 END) as failed_logs
FROM login_logs;

-- Sample login logs with user profiles
SELECT 
    ll.id,
    ll.enrollment_id,
    ll.login_at,
    ll.success,
    up.full_name,
    up.role
FROM login_logs ll
LEFT JOIN user_profiles up ON ll.user_id = up.id
ORDER BY ll.login_at DESC
LIMIT 10;
