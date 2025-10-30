-- Phase 1, Step 3: Add institution_id to all tenant-specific tables
-- This script alters existing tables to include a foreign key to the institutions table.
-- It then backfills this new column with the ID of the default institution.

-- Step 1: Declare a variable for the institution ID to avoid repeated subqueries.
DO $$
DECLARE
    default_institution_id UUID;
BEGIN
    -- Step 2: Get the ID of the default institution.
    SELECT id INTO default_institution_id FROM institutions WHERE name = 'IISBenin Library' LIMIT 1;

    -- If the institution doesn't exist, raise an error.
    IF default_institution_id IS NULL THEN
        RAISE EXCEPTION 'Default institution "IISBenin Library" not found. Please run 01_INSERT_DEFAULT_INSTITUTION.sql first.';
    END IF;

    -- Step 3: Add the institution_id column to all relevant tables if it doesn't already exist.
    -- We use `IF NOT EXISTS` to make the script safely re-runnable.

    ALTER TABLE IF EXISTS books ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES institutions(id);
    ALTER TABLE IF EXISTS students ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES institutions(id);
    ALTER TABLE IF EXISTS staff ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES institutions(id);
    ALTER TABLE IF EXISTS borrow_records ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES institutions(id);
    ALTER TABLE IF EXISTS reading_progress ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES institutions(id);
    ALTER TABLE IF EXISTS book_reports ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES institutions(id);
    ALTER TABLE IF EXISTS user_badges ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES institutions(id);
    ALTER TABLE IF EXISTS notifications ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES institutions(id);
    ALTER TABLE IF EXISTS reviews ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES institutions(id);
    ALTER TABLE IF EXISTS announcements ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES institutions(id);
    ALTER TABLE IF EXISTS login_logs ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES institutions(id);
    ALTER TABLE IF EXISTS user_profiles ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES institutions(id);

    -- Step 4: Backfill the new institution_id column for all existing records.
    -- We only update rows where the institution_id is currently NULL.

    UPDATE books SET institution_id = default_institution_id WHERE institution_id IS NULL;
    UPDATE students SET institution_id = default_institution_id WHERE institution_id IS NULL;
    UPDATE staff SET institution_id = default_institution_id WHERE institution_id IS NULL;
    UPDATE borrow_records SET institution_id = default_institution_id WHERE institution_id IS NULL;
    UPDATE reading_progress SET institution_id = default_institution_id WHERE institution_id IS NULL;
    UPDATE book_reports SET institution_id = default_institution_id WHERE institution_id IS NULL;
    UPDATE user_badges SET institution_id = default_institution_id WHERE institution_id IS NULL;
    UPDATE notifications SET institution_id = default_institution_id WHERE institution_id IS NULL;
    UPDATE reviews SET institution_id = default_institution_id WHERE institution_id IS NULL;
    UPDATE announcements SET institution_id = default_institution_id WHERE institution_id IS NULL;
    UPDATE login_logs SET institution_id = default_institution_id WHERE institution_id IS NULL;
    UPDATE user_profiles SET institution_id = default_institution_id WHERE institution_id IS NULL;

    -- Step 5: Alter the columns to be NOT NULL now that they are backfilled.
    -- This enforces that all new data must have an institution associated.

    ALTER TABLE IF EXISTS books ALTER COLUMN institution_id SET NOT NULL;
    ALTER TABLE IF EXISTS students ALTER COLUMN institution_id SET NOT NULL;
    ALTER TABLE IF EXISTS staff ALTER COLUMN institution_id SET NOT NULL;
    ALTER TABLE IF EXISTS borrow_records ALTER COLUMN institution_id SET NOT NULL;
    ALTER TABLE IF EXISTS reading_progress ALTER COLUMN institution_id SET NOT NULL;
    ALTER TABLE IF EXISTS book_reports ALTER COLUMN institution_id SET NOT NULL;
    ALTER TABLE IF EXISTS user_badges ALTER COLUMN institution_id SET NOT NULL;
    ALTER TABLE IF EXISTS notifications ALTER COLUMN institution_id SET NOT NULL;
    ALTER TABLE IF EXISTS reviews ALTER COLUMN institution_id SET NOT NULL;
    ALTER TABLE IF EXISTS announcements ALTER COLUMN institution_id SET NOT NULL;
    ALTER TABLE IF EXISTS login_logs ALTER COLUMN institution_id SET NOT NULL;
    ALTER TABLE IF EXISTS user_profiles ALTER COLUMN institution_id SET NOT NULL;

END $$;
