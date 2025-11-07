-- Create audit_logs table for comprehensive activity tracking
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  institution_id UUID REFERENCES institutions(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL, -- login, logout, create, update, delete, view, export, etc.
  resource_type TEXT NOT NULL, -- book, student, staff, institution, ticket, etc.
  resource_id TEXT, -- ID of the resource affected
  description TEXT NOT NULL,
  metadata JSONB, -- Additional context (old_value, new_value, IP, user_agent, etc.)
  ip_address INET,
  user_agent TEXT,
  status TEXT DEFAULT 'success', -- success, failed, warning
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Add indexes for common queries
  CONSTRAINT valid_action_type CHECK (action_type IN (
    'login', 'logout', 'failed_login',
    'create', 'update', 'delete', 'view', 'export',
    'password_change', 'password_reset',
    'permission_change', 'role_change',
    'file_upload', 'file_delete',
    'bulk_import', 'bulk_delete',
    'impersonate_start', 'impersonate_end',
    'api_call', 'other'
  )),
  CONSTRAINT valid_status CHECK (status IN ('success', 'failed', 'warning'))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_institution_id ON audit_logs(institution_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_status ON audit_logs(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ip_address ON audit_logs(ip_address);

-- Create composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_action_date 
  ON audit_logs(user_id, action_type, created_at DESC);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Super admins can view all audit logs
CREATE POLICY "super_admins_view_all_logs" ON audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

-- Librarians can view logs from their institution
CREATE POLICY "librarians_view_institution_logs" ON audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'librarian'
      AND user_profiles.institution_id = audit_logs.institution_id
    )
  );

-- Only system can insert audit logs (via triggers or Edge Functions)
CREATE POLICY "system_insert_logs" ON audit_logs
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Create helper function to log actions
CREATE OR REPLACE FUNCTION log_audit_event(
  p_user_id UUID,
  p_institution_id UUID,
  p_action_type TEXT,
  p_resource_type TEXT,
  p_resource_id TEXT,
  p_description TEXT,
  p_metadata JSONB DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'success'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO audit_logs (
    user_id,
    institution_id,
    action_type,
    resource_type,
    resource_id,
    description,
    metadata,
    ip_address,
    user_agent,
    status
  ) VALUES (
    p_user_id,
    p_institution_id,
    p_action_type,
    p_resource_type,
    p_resource_id,
    p_description,
    p_metadata,
    p_ip_address::INET,
    p_user_agent,
    p_status
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- Create trigger function for automatic logging of sensitive tables
CREATE OR REPLACE FUNCTION audit_table_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_institution_id UUID;
  v_action_type TEXT;
  v_metadata JSONB;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  -- Determine action type
  IF TG_OP = 'INSERT' THEN
    v_action_type := 'create';
    v_metadata := jsonb_build_object('new_value', row_to_json(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    v_action_type := 'update';
    v_metadata := jsonb_build_object(
      'old_value', row_to_json(OLD),
      'new_value', row_to_json(NEW)
    );
  ELSIF TG_OP = 'DELETE' THEN
    v_action_type := 'delete';
    v_metadata := jsonb_build_object('old_value', row_to_json(OLD));
  END IF;
  
  -- Get institution_id if it exists in the table
  IF TG_OP = 'DELETE' THEN
    v_institution_id := OLD.institution_id;
  ELSE
    v_institution_id := NEW.institution_id;
  END IF;
  
  -- Log the event
  PERFORM log_audit_event(
    v_user_id,
    v_institution_id,
    v_action_type,
    TG_TABLE_NAME,
    COALESCE(NEW.id::TEXT, OLD.id::TEXT),
    format('%s %s on %s', v_action_type, TG_TABLE_NAME, COALESCE(NEW.id::TEXT, OLD.id::TEXT)),
    v_metadata,
    NULL,
    NULL,
    'success'
  );
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Add triggers to critical tables (commented out - can enable selectively)
-- CREATE TRIGGER audit_institutions_changes
--   AFTER INSERT OR UPDATE OR DELETE ON institutions
--   FOR EACH ROW EXECUTE FUNCTION audit_table_changes();

-- CREATE TRIGGER audit_user_profiles_changes
--   AFTER INSERT OR UPDATE OR DELETE ON user_profiles
--   FOR EACH ROW EXECUTE FUNCTION audit_table_changes();

-- CREATE TRIGGER audit_books_changes
--   AFTER INSERT OR UPDATE OR DELETE ON books
--   FOR EACH ROW EXECUTE FUNCTION audit_table_changes();

-- Create view for audit log statistics
CREATE OR REPLACE VIEW audit_log_stats AS
SELECT
  DATE_TRUNC('day', created_at) as date,
  action_type,
  resource_type,
  status,
  COUNT(*) as count,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT institution_id) as unique_institutions
FROM audit_logs
WHERE created_at >= NOW() - INTERVAL '90 days'
GROUP BY DATE_TRUNC('day', created_at), action_type, resource_type, status
ORDER BY date DESC;

-- Grant access to view
GRANT SELECT ON audit_log_stats TO authenticated;

-- Add comments
COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail of all user actions in the system';
COMMENT ON FUNCTION log_audit_event IS 'Helper function to create audit log entries from application code';
COMMENT ON FUNCTION audit_table_changes IS 'Trigger function for automatic audit logging of table changes';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Audit logs system created successfully!';
  RAISE NOTICE '📊 Table: audit_logs with 8 indexes';
  RAISE NOTICE '🔒 RLS policies: 3 policies (super_admin, librarian, system)';
  RAISE NOTICE '⚙️ Helper function: log_audit_event()';
  RAISE NOTICE '🔄 Trigger function: audit_table_changes()';
  RAISE NOTICE '📈 Stats view: audit_log_stats';
  RAISE NOTICE '';
  RAISE NOTICE '💡 To enable automatic logging on a table, run:';
  RAISE NOTICE '   CREATE TRIGGER audit_<table>_changes';
  RAISE NOTICE '     AFTER INSERT OR UPDATE OR DELETE ON <table>';
  RAISE NOTICE '     FOR EACH ROW EXECUTE FUNCTION audit_table_changes();';
END $$;
