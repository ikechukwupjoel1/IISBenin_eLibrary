-- Check actual students table columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'students' 
ORDER BY ordinal_position;

-- Check actual staff table columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'staff' 
ORDER BY ordinal_position;

-- Sample student data to see what columns have values
SELECT * FROM students LIMIT 1;

-- Sample staff data to see what columns have values
SELECT * FROM staff LIMIT 1;
