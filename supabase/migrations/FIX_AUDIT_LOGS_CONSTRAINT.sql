-- Fix audit_logs constraint to include 'system_event' action type
-- This is needed for auto_flag_book_quality_issues() and other system-triggered events

-- Drop the old constraint
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS valid_action_type;

-- Add the updated constraint with 'system_event'
ALTER TABLE audit_logs ADD CONSTRAINT valid_action_type CHECK (action_type IN (
  'login', 'logout', 'failed_login',
  'create', 'update', 'delete', 'view', 'export',
  'password_change', 'password_reset',
  'permission_change', 'role_change',
  'file_upload', 'file_delete',
  'bulk_import', 'bulk_delete',
  'impersonate_start', 'impersonate_end',
  'api_call', 'system_event', 'other'
));

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ audit_logs constraint updated to include system_event';
END $$;
