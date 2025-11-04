-- =====================================================
-- USER MANAGEMENT MIGRATION
-- =====================================================
-- Adds comprehensive user management functions
-- Run this AFTER ENHANCED_DASHBOARD_MIGRATION.sql
-- =====================================================

-- =====================================================
-- USER MANAGEMENT TABLES
-- =====================================================

-- Table: User management audit log
CREATE TABLE IF NOT EXISTS user_management_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES auth.users(id),
  target_user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL CHECK (action IN (
    'suspend', 'activate', 'delete', 'password_reset', 
    'role_change', 'bulk_suspend', 'bulk_activate', 'bulk_delete'
  )),
  old_value JSONB,
  new_value JSONB,
  reason TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_mgmt_log_admin ON user_management_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_user_mgmt_log_target ON user_management_log(target_user_id);
CREATE INDEX IF NOT EXISTS idx_user_mgmt_log_action ON user_management_log(action);
CREATE INDEX IF NOT EXISTS idx_user_mgmt_log_created ON user_management_log(created_at DESC);

-- =====================================================
-- USER MANAGEMENT FUNCTIONS
-- =====================================================

-- Function: Get all users with pagination and filters
CREATE OR REPLACE FUNCTION get_all_users_paginated(
  search_term TEXT DEFAULT NULL,
  role_filter TEXT DEFAULT NULL,
  institution_filter UUID DEFAULT NULL,
  status_filter TEXT DEFAULT NULL,
  page_num INTEGER DEFAULT 1,
  page_size INTEGER DEFAULT 20,
  sort_by TEXT DEFAULT 'created_at',
  sort_order TEXT DEFAULT 'DESC'
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  role TEXT,
  institution_id UUID,
  institution_name TEXT,
  is_active BOOLEAN,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  offset_val INTEGER;
BEGIN
  offset_val := (page_num - 1) * page_size;
  
  RETURN QUERY
  WITH filtered_users AS (
    SELECT 
      u.id,
      u.email::TEXT,
      up.full_name,
      up.role,
      up.institution_id,
      i.name::TEXT as institution_name,
      CASE 
        WHEN u.deleted_at IS NULL THEN true
        ELSE false
      END as is_active,
      u.last_sign_in_at as last_login,
      u.created_at
    FROM auth.users u
    LEFT JOIN user_profiles up ON u.id = up.id
    LEFT JOIN institutions i ON up.institution_id = i.id
    WHERE 
      (search_term IS NULL OR 
       u.email ILIKE '%' || search_term || '%' OR 
       up.full_name ILIKE '%' || search_term || '%')
    AND (role_filter IS NULL OR up.role = role_filter)
    AND (institution_filter IS NULL OR up.institution_id = institution_filter)
    AND (status_filter IS NULL OR 
         (status_filter = 'active' AND u.deleted_at IS NULL) OR
         (status_filter = 'suspended' AND u.deleted_at IS NOT NULL))
  ),
  total_count_cte AS (
    SELECT COUNT(*) as total FROM filtered_users
  )
  SELECT 
    fu.*,
    tc.total
  FROM filtered_users fu
  CROSS JOIN total_count_cte tc
  ORDER BY 
    CASE WHEN sort_by = 'email' AND sort_order = 'ASC' THEN fu.email END ASC,
    CASE WHEN sort_by = 'email' AND sort_order = 'DESC' THEN fu.email END DESC,
    CASE WHEN sort_by = 'full_name' AND sort_order = 'ASC' THEN fu.full_name END ASC,
    CASE WHEN sort_by = 'full_name' AND sort_order = 'DESC' THEN fu.full_name END DESC,
    CASE WHEN sort_by = 'role' AND sort_order = 'ASC' THEN fu.role END ASC,
    CASE WHEN sort_by = 'role' AND sort_order = 'DESC' THEN fu.role END DESC,
    CASE WHEN sort_by = 'created_at' AND sort_order = 'ASC' THEN fu.created_at END ASC,
    CASE WHEN sort_by = 'created_at' AND sort_order = 'DESC' THEN fu.created_at END DESC
  LIMIT page_size
  OFFSET offset_val;
END;
$$;

-- Function: Get user activity log
CREATE OR REPLACE FUNCTION get_user_activity_log(
  target_user_id UUID,
  limit_count INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  activity_type TEXT,
  activity_description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    aaf.id,
    aaf.activity_type,
    aaf.activity_description,
    aaf.metadata,
    aaf.created_at
  FROM admin_activity_feed aaf
  WHERE aaf.metadata->>'user_id' = target_user_id::TEXT
    OR aaf.admin_id = target_user_id
  ORDER BY aaf.created_at DESC
  LIMIT limit_count;
END;
$$;

-- Function: Bulk suspend users
CREATE OR REPLACE FUNCTION bulk_suspend_users(
  user_ids UUID[],
  admin_id UUID,
  reason TEXT DEFAULT 'Administrative action'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  suspended_count INTEGER := 0;
  failed_count INTEGER := 0;
  user_id UUID;
  result JSON;
BEGIN
  FOREACH user_id IN ARRAY user_ids
  LOOP
    BEGIN
      -- Soft delete user
      UPDATE auth.users
      SET deleted_at = NOW()
      WHERE id = user_id AND deleted_at IS NULL;
      
      IF FOUND THEN
        suspended_count := suspended_count + 1;
        
        -- Log the action
        INSERT INTO user_management_log (
          admin_id, target_user_id, action, reason
        ) VALUES (
          admin_id, user_id, 'bulk_suspend', reason
        );
        
        -- Log to activity feed
        PERFORM log_activity(
          admin_id,
          'user_suspended',
          'User suspended: ' || (SELECT email FROM auth.users WHERE id = user_id),
          json_build_object('user_id', user_id, 'reason', reason)
        );
      ELSE
        failed_count := failed_count + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      failed_count := failed_count + 1;
    END;
  END LOOP;
  
  result := json_build_object(
    'success', true,
    'suspended_count', suspended_count,
    'failed_count', failed_count,
    'total_requested', array_length(user_ids, 1)
  );
  
  RETURN result;
END;
$$;

-- Function: Bulk activate users
CREATE OR REPLACE FUNCTION bulk_activate_users(
  user_ids UUID[],
  admin_id UUID,
  reason TEXT DEFAULT 'Administrative action'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  activated_count INTEGER := 0;
  failed_count INTEGER := 0;
  user_id UUID;
  result JSON;
BEGIN
  FOREACH user_id IN ARRAY user_ids
  LOOP
    BEGIN
      -- Restore user
      UPDATE auth.users
      SET deleted_at = NULL
      WHERE id = user_id AND deleted_at IS NOT NULL;
      
      IF FOUND THEN
        activated_count := activated_count + 1;
        
        -- Log the action
        INSERT INTO user_management_log (
          admin_id, target_user_id, action, reason
        ) VALUES (
          admin_id, user_id, 'bulk_activate', reason
        );
        
        -- Log to activity feed
        PERFORM log_activity(
          admin_id,
          'user_activated',
          'User activated: ' || (SELECT email FROM auth.users WHERE id = user_id),
          json_build_object('user_id', user_id, 'reason', reason)
        );
      ELSE
        failed_count := failed_count + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      failed_count := failed_count + 1;
    END;
  END LOOP;
  
  result := json_build_object(
    'success', true,
    'activated_count', activated_count,
    'failed_count', failed_count,
    'total_requested', array_length(user_ids, 1)
  );
  
  RETURN result;
END;
$$;

-- Function: Change user role
CREATE OR REPLACE FUNCTION change_user_role(
  target_user_id UUID,
  new_role TEXT,
  admin_id UUID,
  reason TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  old_role TEXT;
  result JSON;
BEGIN
  -- Validate role
  IF new_role NOT IN ('student', 'librarian', 'super_admin') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid role. Must be: student, librarian, or super_admin'
    );
  END IF;
  
  -- Get old role
  SELECT role INTO old_role
  FROM user_profiles
  WHERE id = target_user_id;
  
  IF old_role IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;
  
  -- Update role
  UPDATE user_profiles
  SET role = new_role, updated_at = NOW()
  WHERE id = target_user_id;
  
  -- Log the action
  INSERT INTO user_management_log (
    admin_id, target_user_id, action, old_value, new_value, reason
  ) VALUES (
    admin_id, 
    target_user_id, 
    'role_change',
    json_build_object('role', old_role),
    json_build_object('role', new_role),
    reason
  );
  
  -- Log to activity feed
  PERFORM log_activity(
    admin_id,
    'user_role_changed',
    format('User role changed from %s to %s', old_role, new_role),
    json_build_object(
      'user_id', target_user_id,
      'old_role', old_role,
      'new_role', new_role,
      'reason', reason
    )
  );
  
  result := json_build_object(
    'success', true,
    'old_role', old_role,
    'new_role', new_role,
    'user_id', target_user_id
  );
  
  RETURN result;
END;
$$;

-- Function: Get user management statistics
CREATE OR REPLACE FUNCTION get_user_management_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  total_users INTEGER;
  active_users INTEGER;
  suspended_users INTEGER;
  by_role JSON;
  recent_actions JSON;
BEGIN
  -- Count total users
  SELECT COUNT(*) INTO total_users FROM auth.users;
  
  -- Count active users
  SELECT COUNT(*) INTO active_users FROM auth.users WHERE deleted_at IS NULL;
  
  -- Count suspended users
  SELECT COUNT(*) INTO suspended_users FROM auth.users WHERE deleted_at IS NOT NULL;
  
  -- Group by role
  SELECT json_object_agg(role, count)
  INTO by_role
  FROM (
    SELECT role, COUNT(*) as count
    FROM user_profiles
    GROUP BY role
  ) roles;
  
  -- Get recent management actions
  SELECT json_agg(
    json_build_object(
      'action', action,
      'count', count,
      'last_performed', last_performed
    )
  )
  INTO recent_actions
  FROM (
    SELECT 
      action,
      COUNT(*) as count,
      MAX(created_at) as last_performed
    FROM user_management_log
    WHERE created_at > NOW() - INTERVAL '7 days'
    GROUP BY action
  ) actions;
  
  result := json_build_object(
    'total_users', total_users,
    'active_users', active_users,
    'suspended_users', suspended_users,
    'by_role', COALESCE(by_role, '{}'::JSON),
    'recent_actions', COALESCE(recent_actions, '[]'::JSON),
    'generated_at', NOW()
  );
  
  RETURN result;
END;
$$;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Enable RLS on user_management_log
ALTER TABLE user_management_log ENABLE ROW LEVEL SECURITY;

-- Policy: Super admins can view all logs
CREATE POLICY user_mgmt_log_view_super_admin ON user_management_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- Policy: Super admins can insert logs
CREATE POLICY user_mgmt_log_insert_super_admin ON user_management_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_all_users_paginated(TEXT, TEXT, UUID, TEXT, INTEGER, INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_activity_log(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION bulk_suspend_users(UUID[], UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION bulk_activate_users(UUID[], UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION change_user_role(UUID, TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_management_stats() TO authenticated;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Test get all users
SELECT * FROM get_all_users_paginated(NULL, NULL, NULL, NULL, 1, 10, 'created_at', 'DESC');

-- Test user management stats
SELECT get_user_management_stats();

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ User Management Migration Complete!';
  RAISE NOTICE 'Added:';
  RAISE NOTICE '  - user_management_log table';
  RAISE NOTICE '  - get_all_users_paginated() function';
  RAISE NOTICE '  - get_user_activity_log() function';
  RAISE NOTICE '  - bulk_suspend_users() function';
  RAISE NOTICE '  - bulk_activate_users() function';
  RAISE NOTICE '  - change_user_role() function';
  RAISE NOTICE '  - get_user_management_stats() function';
  RAISE NOTICE '  - 2 RLS policies';
END $$;
