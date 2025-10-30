-- Phase 2, Step 2: Activate and Apply RLS Policies (FIXED)
-- This script enables RLS on all tenant-specific tables and creates policies
-- to ensure that users can only access data belonging to their own institution.

DO $$
DECLARE
    table_name TEXT;
BEGIN
    -- List of tables to apply RLS policies to.
    FOREACH table_name IN ARRAY ARRAY[
        'books', 'students', 'staff', 'borrow_records', 'reading_progress',
        'book_reports', 'user_badges', 'notifications', 'reviews',
        'announcements', 'login_logs', 'user_profiles'
    ]
    LOOP
        -- Enable RLS on the table.
        EXECUTE format('ALTER TABLE IF EXISTS %I ENABLE ROW LEVEL SECURITY;', table_name);

        -- Policy: Allow users to SELECT their own institution's data.
        -- This is the primary read-access policy.
        EXECUTE format('
            CREATE POLICY "RLS: %s - Users can view their own institution data" 
            ON %I FOR SELECT
            USING (institution_id = public.get_current_institution_id());', table_name, table_name);

        -- Policy: Allow users to INSERT data only for their own institution.
        EXECUTE format('
            CREATE POLICY "RLS: %s - Users can insert data for their own institution" 
            ON %I FOR INSERT
            WITH CHECK (institution_id = public.get_current_institution_id());', table_name, table_name);

        -- Policy: Allow users to UPDATE their own institution's data.
        -- The USING clause ensures they can't update a record to change its institution_id
        -- to one they don't belong to.
        EXECUTE format('
            CREATE POLICY "RLS: %s - Users can update their own institution data" 
            ON %I FOR UPDATE
            USING (institution_id = public.get_current_institution_id())
            WITH CHECK (institution_id = public.get_current_institution_id());', table_name, table_name);

        -- Policy: Allow users to DELETE from their own institution.
        EXECUTE format('
            CREATE POLICY "RLLS: %s - Users can delete from their own institution" 
            ON %I FOR DELETE
            USING (institution_id = public.get_current_institution_id());', table_name, table_name);

    END LOOP;
END $$;