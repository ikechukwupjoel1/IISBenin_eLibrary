-- Check what columns exist in reading_progress table
SELECT 
    table_name,
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'reading_progress'
ORDER BY ordinal_position;

-- Check if the table exists at all
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'reading_progress'
) as table_exists;
