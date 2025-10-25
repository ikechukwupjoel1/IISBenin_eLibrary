-- Migration: Compact Sequential ID System
-- Changes enrollment IDs from timestamp-based (STU85043294, STAFF5043294) 
-- to compact sequential format (S0001, T001)
-- Date: 2025-10-25

-- Step 1: Create id_counters table to track sequential numbers
CREATE TABLE IF NOT EXISTS id_counters (
  counter_type TEXT PRIMARY KEY CHECK (counter_type IN ('student', 'staff')),
  current_value INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies for id_counters (only admins/system can modify)
ALTER TABLE id_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only authenticated users can read counters"
  ON id_counters FOR SELECT
  TO authenticated
  USING (true);

-- Step 2: Initialize counters based on existing records
INSERT INTO id_counters (counter_type, current_value) 
VALUES 
  ('student', (SELECT COALESCE(COUNT(*), 0) FROM students)),
  ('staff', (SELECT COALESCE(COUNT(*), 0) FROM staff))
ON CONFLICT (counter_type) 
DO UPDATE SET current_value = EXCLUDED.current_value;

-- Step 3: Create function to get next sequential enrollment ID
CREATE OR REPLACE FUNCTION get_next_enrollment_id(role_type TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_value INTEGER;
  new_id TEXT;
BEGIN
  -- Validate input
  IF role_type NOT IN ('student', 'staff') THEN
    RAISE EXCEPTION 'Invalid role_type: %. Must be student or staff', role_type;
  END IF;

  -- Lock row and increment counter atomically
  UPDATE id_counters 
  SET 
    current_value = current_value + 1,
    updated_at = NOW()
  WHERE counter_type = role_type
  RETURNING current_value INTO next_value;
  
  -- Check if update succeeded
  IF next_value IS NULL THEN
    RAISE EXCEPTION 'Failed to get next ID for role_type: %', role_type;
  END IF;
  
  -- Format ID: S0001 for students, T001 for staff
  IF role_type = 'student' THEN
    new_id := 'S' || LPAD(next_value::TEXT, 4, '0');
  ELSIF role_type = 'staff' THEN
    new_id := 'T' || LPAD(next_value::TEXT, 3, '0');
  END IF;
  
  RETURN new_id;
END;
$$;


-- Use a temporary table to assign row numbers, then update
CREATE TEMP TABLE tmp_numbered_students AS
  SELECT id, 'S' || LPAD(ROW_NUMBER() OVER (ORDER BY created_at, id)::TEXT, 4, '0') AS new_enrollment_id
  FROM students
  WHERE enrollment_id IS NOT NULL 
    AND (enrollment_id LIKE 'STU%' OR LENGTH(enrollment_id) > 5);

UPDATE students s
SET enrollment_id = tns.new_enrollment_id
FROM tmp_numbered_students tns
WHERE s.id = tns.id;

DROP TABLE tmp_numbered_students;

-- Step 5: Migrate existing staff records to new format

-- Use a temporary table to assign row numbers, then update
CREATE TEMP TABLE tmp_numbered_staff AS
  SELECT id, 'T' || LPAD(ROW_NUMBER() OVER (ORDER BY created_at, id)::TEXT, 3, '0') AS new_enrollment_id
  FROM staff
  WHERE enrollment_id IS NOT NULL 
    AND (enrollment_id LIKE 'STAFF%' OR LENGTH(enrollment_id) > 4);

UPDATE staff s
SET enrollment_id = tns.new_enrollment_id
FROM tmp_numbered_staff tns
WHERE s.id = tns.id;

DROP TABLE tmp_numbered_staff;

-- Step 6: Update counters to reflect migrated records
UPDATE id_counters 
SET 
  current_value = (SELECT COUNT(*) FROM students WHERE enrollment_id LIKE 'S%'),
  updated_at = NOW()
WHERE counter_type = 'student';

UPDATE id_counters 
SET 
  current_value = (SELECT COUNT(*) FROM staff WHERE enrollment_id LIKE 'T%'),
  updated_at = NOW()
WHERE counter_type = 'staff';

-- Step 7: Add helpful comments
COMMENT ON TABLE id_counters IS 'Tracks sequential counters for student (S0001) and staff (T001) enrollment IDs';
COMMENT ON FUNCTION get_next_enrollment_id(TEXT) IS 'Generates next sequential enrollment ID: S0001 for students, T001 for staff';

-- Step 8: Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_next_enrollment_id(TEXT) TO authenticated;

-- Verification queries (run manually to check migration)
-- SELECT * FROM id_counters;
-- SELECT enrollment_id, name, created_at FROM students ORDER BY enrollment_id;
-- SELECT enrollment_id, name, created_at FROM staff ORDER BY enrollment_id;
