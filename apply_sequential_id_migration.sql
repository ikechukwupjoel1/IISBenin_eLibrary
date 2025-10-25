-- ============================================
-- APPLY COMPACT SEQUENTIAL ID MIGRATION
-- Run this in Supabase SQL Editor
-- ============================================

-- This will:
-- 1. Create id_counters table
-- 2. Create get_next_enrollment_id() function
-- 3. Migrate existing students: STU85043294 → S0001
-- 4. Migrate existing staff: STAFF5043294 → T001
-- 5. Set up counters to continue from current count

\i supabase/migrations/20251025_compact_sequential_ids.sql

-- After running, verify with these queries:

-- Check counters
SELECT * FROM id_counters ORDER BY counter_type;

-- Check migrated students
SELECT enrollment_id, name, created_at 
FROM students 
ORDER BY enrollment_id;

-- Check migrated staff
SELECT enrollment_id, name, created_at 
FROM staff 
ORDER BY enrollment_id;

-- Test function (DO NOT RUN IN PRODUCTION - just for verification)
-- SELECT get_next_enrollment_id('student');  -- Should return next S number
-- SELECT get_next_enrollment_id('staff');    -- Should return next T number
