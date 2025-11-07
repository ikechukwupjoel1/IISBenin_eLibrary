-- Bulk Operations Module
-- This migration creates infrastructure for bulk operations on users, books, institutions, and announcements

-- =============================================================================
-- PART 1: Bulk Operation Jobs Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS bulk_operation_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Job metadata
  operation_type TEXT NOT NULL, -- 'role_change', 'institution_activation', 'book_import', 'book_update', 'announcement_send', 'user_deletion'
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'cancelled'
  
  -- Initiated by
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Operation details
  target_count INTEGER DEFAULT 0, -- Total items to process
  processed_count INTEGER DEFAULT 0, -- Items processed so far
  success_count INTEGER DEFAULT 0, -- Successful operations
  error_count INTEGER DEFAULT 0, -- Failed operations
  
  -- Operation parameters (JSON for flexibility)
  parameters JSONB NOT NULL, -- {action, filters, values, etc.}
  
  -- Results
  results JSONB, -- Detailed results for each item
  errors JSONB, -- Error details
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Progress tracking
  progress_percentage INTEGER DEFAULT 0,
  estimated_completion TIMESTAMPTZ,
  
  CONSTRAINT valid_operation_type CHECK (operation_type IN (
    'role_change', 
    'institution_activation', 
    'institution_deactivation',
    'book_import', 
    'book_update', 
    'book_deletion',
    'announcement_send',
    'user_deletion',
    'user_suspension',
    'password_reset'
  )),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  CONSTRAINT valid_progress CHECK (progress_percentage >= 0 AND progress_percentage <= 100)
);

-- =============================================================================
-- PART 2: Bulk Operation Logs Table (Detailed History)
-- =============================================================================

CREATE TABLE IF NOT EXISTS bulk_operation_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID REFERENCES bulk_operation_jobs(id) ON DELETE CASCADE NOT NULL,
  
  -- Log entry details
  item_id UUID, -- ID of the affected item (user_id, book_id, etc.)
  item_type TEXT, -- 'user', 'book', 'institution', etc.
  
  -- Operation result
  status TEXT NOT NULL, -- 'success', 'error', 'skipped'
  
  -- Details
  action_performed TEXT, -- Description of what was done
  old_value TEXT, -- Previous value (for updates)
  new_value TEXT, -- New value (for updates)
  
  -- Error info
  error_message TEXT,
  error_details JSONB,
  
  -- Metadata
  metadata JSONB, -- Additional context
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_log_status CHECK (status IN ('success', 'error', 'skipped'))
);

-- =============================================================================
-- PART 3: Indexes
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_bulk_jobs_status 
  ON bulk_operation_jobs(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bulk_jobs_created_by 
  ON bulk_operation_jobs(created_by, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bulk_jobs_type 
  ON bulk_operation_jobs(operation_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bulk_logs_job 
  ON bulk_operation_logs(job_id, created_at);

CREATE INDEX IF NOT EXISTS idx_bulk_logs_item 
  ON bulk_operation_logs(item_type, item_id);

CREATE INDEX IF NOT EXISTS idx_bulk_logs_status 
  ON bulk_operation_logs(status);

-- =============================================================================
-- PART 4: Bulk Operation Functions
-- =============================================================================

-- Create a bulk operation job
CREATE OR REPLACE FUNCTION create_bulk_operation_job(
  p_operation_type TEXT,
  p_parameters JSONB,
  p_target_ids UUID[] DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job_id UUID;
  v_target_count INTEGER;
BEGIN
  -- Count targets
  v_target_count := COALESCE(array_length(p_target_ids, 1), 0);
  
  -- Create job
  INSERT INTO bulk_operation_jobs (
    operation_type,
    created_by,
    parameters,
    target_count,
    status
  ) VALUES (
    p_operation_type,
    auth.uid(),
    p_parameters || jsonb_build_object('target_ids', COALESCE(p_target_ids, ARRAY[]::UUID[])),
    v_target_count,
    'pending'
  ) RETURNING id INTO v_job_id;
  
  RETURN v_job_id;
END;
$$;

-- Process bulk role change
CREATE OR REPLACE FUNCTION process_bulk_role_change(p_job_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job RECORD;
  v_user_id UUID;
  v_new_role TEXT;
  v_old_role TEXT;
  v_success_count INTEGER := 0;
  v_error_count INTEGER := 0;
BEGIN
  -- Get job details
  SELECT * INTO v_job FROM bulk_operation_jobs WHERE id = p_job_id;
  
  IF v_job IS NULL THEN
    RAISE EXCEPTION 'Job not found';
  END IF;
  
  -- Update job status
  UPDATE bulk_operation_jobs
  SET status = 'processing', started_at = NOW()
  WHERE id = p_job_id;
  
  -- Extract parameters
  v_new_role := v_job.parameters->>'new_role';
  
  -- Process each user
  FOR v_user_id IN 
    SELECT unnest(ARRAY(SELECT jsonb_array_elements_text(v_job.parameters->'target_ids'))::UUID[])
  LOOP
    BEGIN
      -- Get old role
      SELECT role INTO v_old_role FROM user_profiles WHERE id = v_user_id;
      
      -- Update role
      UPDATE user_profiles
      SET role = v_new_role, updated_at = NOW()
      WHERE id = v_user_id;
      
      -- Log success
      INSERT INTO bulk_operation_logs (
        job_id, item_id, item_type, status, action_performed, old_value, new_value
      ) VALUES (
        p_job_id, v_user_id, 'user', 'success', 'Role changed', v_old_role, v_new_role
      );
      
      v_success_count := v_success_count + 1;
      
    EXCEPTION WHEN OTHERS THEN
      -- Log error
      INSERT INTO bulk_operation_logs (
        job_id, item_id, item_type, status, action_performed, error_message
      ) VALUES (
        p_job_id, v_user_id, 'user', 'error', 'Role change failed', SQLERRM
      );
      
      v_error_count := v_error_count + 1;
    END;
    
    -- Update progress
    UPDATE bulk_operation_jobs
    SET 
      processed_count = v_success_count + v_error_count,
      success_count = v_success_count,
      error_count = v_error_count,
      progress_percentage = ((v_success_count + v_error_count)::DECIMAL / v_job.target_count * 100)::INTEGER
    WHERE id = p_job_id;
  END LOOP;
  
  -- Mark job as completed
  UPDATE bulk_operation_jobs
  SET status = 'completed', completed_at = NOW()
  WHERE id = p_job_id;
  
  RETURN true;
END;
$$;

-- Process bulk institution activation/deactivation
CREATE OR REPLACE FUNCTION process_bulk_institution_toggle(p_job_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job RECORD;
  v_institution_id UUID;
  v_activate BOOLEAN;
  v_success_count INTEGER := 0;
  v_error_count INTEGER := 0;
BEGIN
  -- Get job details
  SELECT * INTO v_job FROM bulk_operation_jobs WHERE id = p_job_id;
  
  IF v_job IS NULL THEN
    RAISE EXCEPTION 'Job not found';
  END IF;
  
  -- Update job status
  UPDATE bulk_operation_jobs
  SET status = 'processing', started_at = NOW()
  WHERE id = p_job_id;
  
  -- Determine action
  v_activate := (v_job.operation_type = 'institution_activation');
  
  -- Process each institution
  FOR v_institution_id IN 
    SELECT unnest(ARRAY(SELECT jsonb_array_elements_text(v_job.parameters->'target_ids'))::UUID[])
  LOOP
    BEGIN
      -- Update institution status
      UPDATE institutions
      SET is_active = v_activate, updated_at = NOW()
      WHERE id = v_institution_id;
      
      -- Log success
      INSERT INTO bulk_operation_logs (
        job_id, item_id, item_type, status, action_performed, new_value
      ) VALUES (
        p_job_id, v_institution_id, 'institution', 'success',
        CASE WHEN v_activate THEN 'Activated' ELSE 'Deactivated' END,
        v_activate::TEXT
      );
      
      v_success_count := v_success_count + 1;
      
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO bulk_operation_logs (
        job_id, item_id, item_type, status, error_message
      ) VALUES (
        p_job_id, v_institution_id, 'institution', 'error', SQLERRM
      );
      
      v_error_count := v_error_count + 1;
    END;
    
    -- Update progress
    UPDATE bulk_operation_jobs
    SET 
      processed_count = v_success_count + v_error_count,
      success_count = v_success_count,
      error_count = v_error_count,
      progress_percentage = ((v_success_count + v_error_count)::DECIMAL / v_job.target_count * 100)::INTEGER
    WHERE id = p_job_id;
  END LOOP;
  
  -- Mark job as completed
  UPDATE bulk_operation_jobs
  SET status = 'completed', completed_at = NOW()
  WHERE id = p_job_id;
  
  RETURN true;
END;
$$;

-- Process bulk book update
CREATE OR REPLACE FUNCTION process_bulk_book_update(p_job_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job RECORD;
  v_book_id UUID;
  v_updates JSONB;
  v_success_count INTEGER := 0;
  v_error_count INTEGER := 0;
  v_update_query TEXT;
BEGIN
  -- Get job details
  SELECT * INTO v_job FROM bulk_operation_jobs WHERE id = p_job_id;
  
  IF v_job IS NULL THEN
    RAISE EXCEPTION 'Job not found';
  END IF;
  
  -- Update job status
  UPDATE bulk_operation_jobs
  SET status = 'processing', started_at = NOW()
  WHERE id = p_job_id;
  
  -- Extract update values
  v_updates := v_job.parameters->'updates';
  
  -- Process each book
  FOR v_book_id IN 
    SELECT unnest(ARRAY(SELECT jsonb_array_elements_text(v_job.parameters->'target_ids'))::UUID[])
  LOOP
    BEGIN
      -- Dynamic update based on provided fields
      IF v_updates ? 'category' THEN
        UPDATE books SET category = v_updates->>'category', updated_at = NOW() WHERE id = v_book_id;
      END IF;
      
      IF v_updates ? 'publisher' THEN
        UPDATE books SET publisher = v_updates->>'publisher', updated_at = NOW() WHERE id = v_book_id;
      END IF;
      
      IF v_updates ? 'publication_year' THEN
        UPDATE books SET publication_year = (v_updates->>'publication_year')::INTEGER, updated_at = NOW() WHERE id = v_book_id;
      END IF;
      
      -- Log success
      INSERT INTO bulk_operation_logs (
        job_id, item_id, item_type, status, action_performed, new_value
      ) VALUES (
        p_job_id, v_book_id, 'book', 'success', 'Book updated', v_updates::TEXT
      );
      
      v_success_count := v_success_count + 1;
      
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO bulk_operation_logs (
        job_id, item_id, item_type, status, error_message
      ) VALUES (
        p_job_id, v_book_id, 'book', 'error', SQLERRM
      );
      
      v_error_count := v_error_count + 1;
    END;
    
    -- Update progress
    UPDATE bulk_operation_jobs
    SET 
      processed_count = v_success_count + v_error_count,
      success_count = v_success_count,
      error_count = v_error_count,
      progress_percentage = ((v_success_count + v_error_count)::DECIMAL / v_job.target_count * 100)::INTEGER
    WHERE id = p_job_id;
  END LOOP;
  
  -- Mark job as completed
  UPDATE bulk_operation_jobs
  SET status = 'completed', completed_at = NOW()
  WHERE id = p_job_id;
  
  RETURN true;
END;
$$;

-- Process bulk announcement send
CREATE OR REPLACE FUNCTION process_bulk_announcement_send(p_job_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job RECORD;
  v_user_id UUID;
  v_announcement_data JSONB;
  v_success_count INTEGER := 0;
  v_error_count INTEGER := 0;
  v_notification_id UUID;
BEGIN
  -- Get job details
  SELECT * INTO v_job FROM bulk_operation_jobs WHERE id = p_job_id;
  
  IF v_job IS NULL THEN
    RAISE EXCEPTION 'Job not found';
  END IF;
  
  -- Update job status
  UPDATE bulk_operation_jobs
  SET status = 'processing', started_at = NOW()
  WHERE id = p_job_id;
  
  -- Extract announcement data
  v_announcement_data := v_job.parameters->'announcement';
  
  -- Process each user
  FOR v_user_id IN 
    SELECT unnest(ARRAY(SELECT jsonb_array_elements_text(v_job.parameters->'target_ids'))::UUID[])
  LOOP
    BEGIN
      -- Create notification for user
      INSERT INTO user_notifications (
        user_id,
        type,
        title,
        message,
        priority,
        data
      ) VALUES (
        v_user_id,
        'broadcast',
        v_announcement_data->>'title',
        v_announcement_data->>'message',
        COALESCE(v_announcement_data->>'priority', 'normal'),
        v_announcement_data
      ) RETURNING id INTO v_notification_id;
      
      -- Log success
      INSERT INTO bulk_operation_logs (
        job_id, item_id, item_type, status, action_performed, metadata
      ) VALUES (
        p_job_id, v_user_id, 'user', 'success', 'Announcement sent',
        jsonb_build_object('notification_id', v_notification_id)
      );
      
      v_success_count := v_success_count + 1;
      
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO bulk_operation_logs (
        job_id, item_id, item_type, status, error_message
      ) VALUES (
        p_job_id, v_user_id, 'user', 'error', SQLERRM
      );
      
      v_error_count := v_error_count + 1;
    END;
    
    -- Update progress
    UPDATE bulk_operation_jobs
    SET 
      processed_count = v_success_count + v_error_count,
      success_count = v_success_count,
      error_count = v_error_count,
      progress_percentage = ((v_success_count + v_error_count)::DECIMAL / v_job.target_count * 100)::INTEGER
    WHERE id = p_job_id;
  END LOOP;
  
  -- Mark job as completed
  UPDATE bulk_operation_jobs
  SET status = 'completed', completed_at = NOW()
  WHERE id = p_job_id;
  
  RETURN true;
END;
$$;

-- Cancel a bulk operation job
CREATE OR REPLACE FUNCTION cancel_bulk_operation_job(p_job_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE bulk_operation_jobs
  SET status = 'cancelled', completed_at = NOW()
  WHERE id = p_job_id
    AND status IN ('pending', 'processing')
    AND created_by = auth.uid();
  
  RETURN FOUND;
END;
$$;

-- Get job status and progress
CREATE OR REPLACE FUNCTION get_bulk_job_status(p_job_id UUID)
RETURNS TABLE (
  id UUID,
  operation_type TEXT,
  status TEXT,
  progress_percentage INTEGER,
  target_count INTEGER,
  processed_count INTEGER,
  success_count INTEGER,
  error_count INTEGER,
  created_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    j.id,
    j.operation_type,
    j.status,
    j.progress_percentage,
    j.target_count,
    j.processed_count,
    j.success_count,
    j.error_count,
    j.created_at,
    j.started_at,
    j.completed_at
  FROM bulk_operation_jobs j
  WHERE j.id = p_job_id
    AND (j.created_by = auth.uid() OR EXISTS (
      SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin'
    ));
END;
$$;

-- =============================================================================
-- PART 5: Enable Row Level Security
-- =============================================================================

ALTER TABLE bulk_operation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_operation_logs ENABLE ROW LEVEL SECURITY;

-- Super admins can manage all jobs
DROP POLICY IF EXISTS "super_admins_manage_jobs" ON bulk_operation_jobs;
CREATE POLICY "super_admins_manage_jobs" ON bulk_operation_jobs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Users can view their own jobs
DROP POLICY IF EXISTS "users_view_own_jobs" ON bulk_operation_jobs;
CREATE POLICY "users_view_own_jobs" ON bulk_operation_jobs
  FOR SELECT USING (created_by = auth.uid());

-- Super admins can view all logs
DROP POLICY IF EXISTS "super_admins_view_logs" ON bulk_operation_logs;
CREATE POLICY "super_admins_view_logs" ON bulk_operation_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- =============================================================================
-- SUCCESS MESSAGE
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Bulk Operations Module created successfully!';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Tables created:';
  RAISE NOTICE '   - bulk_operation_jobs (job tracking)';
  RAISE NOTICE '   - bulk_operation_logs (detailed logs)';
  RAISE NOTICE '';
  RAISE NOTICE '⚙️ Functions created:';
  RAISE NOTICE '   - create_bulk_operation_job()';
  RAISE NOTICE '   - process_bulk_role_change()';
  RAISE NOTICE '   - process_bulk_institution_toggle()';
  RAISE NOTICE '   - process_bulk_book_update()';
  RAISE NOTICE '   - process_bulk_announcement_send()';
  RAISE NOTICE '   - cancel_bulk_operation_job()';
  RAISE NOTICE '   - get_bulk_job_status()';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 RLS policies: 4 policies created';
END $$;
