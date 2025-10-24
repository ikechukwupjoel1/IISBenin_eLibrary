-- Test Student Report Viewing RLS
-- Run this as a student user to test if they can see their own reports

-- First, check if the student can see their own reports directly
SELECT id, title, status, points_awarded, created_at
FROM book_reports
WHERE user_id = auth.uid()
ORDER BY created_at DESC;

-- Check if the join query works (like in MyBooks component)
SELECT 
  br.id as borrow_id,
  br.status as borrow_status,
  b.title as book_title,
  rep.id as report_id,
  rep.status as report_status,
  rep.points_awarded
FROM borrow_records br
LEFT JOIN books b ON br.book_id = b.id
LEFT JOIN book_reports rep ON rep.borrow_record_id = br.id
WHERE (br.student_id = (SELECT student_id FROM user_profiles WHERE id = auth.uid())
   OR br.staff_id = (SELECT staff_id FROM user_profiles WHERE id = auth.uid()))
AND br.status = 'completed'
ORDER BY br.return_date DESC
LIMIT 10;

-- Check if RLS policies exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'book_reports'
ORDER BY policyname;

-- Check current user context
SELECT 
  auth.uid() as current_user_id,
  auth.role() as current_role;

-- Verify user_profiles record
SELECT id, full_name, role, student_id, staff_id
FROM user_profiles
WHERE id = auth.uid();
