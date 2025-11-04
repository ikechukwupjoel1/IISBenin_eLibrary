-- =====================================================
-- UPDATE USER MANAGEMENT WITH INSTITUTION INFO
-- =====================================================
-- Update the function to properly fetch institution info
-- for students and staff from their tables
-- =====================================================

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
  WITH all_users AS (
    -- Users from auth.users and user_profiles (librarians, super admins)
    SELECT 
      u.id,
      u.email::TEXT as email,
      up.full_name,
      up.role,
      up.institution_id,
      i.name::TEXT as institution_name,
      CASE 
        WHEN u.deleted_at IS NULL THEN true
        ELSE false
      END as is_active,
      u.last_sign_in_at as last_login,
      u.created_at,
      'auth_user' as source
    FROM auth.users u
    LEFT JOIN user_profiles up ON u.id = up.id
    LEFT JOIN institutions i ON up.institution_id = i.id
    
    UNION ALL
    
    -- Students from students table
    SELECT 
      s.id,
      COALESCE(s.email, s.enrollment_id || '@student.local')::TEXT as email,
      s.name as full_name,
      'student'::TEXT as role,
      s.institution_id,
      i.name::TEXT as institution_name,
      true as is_active,
      NULL::TIMESTAMPTZ as last_login,
      s.created_at,
      'student' as source
    FROM students s
    LEFT JOIN institutions i ON s.institution_id = i.id
    WHERE NOT EXISTS (
      SELECT 1 FROM auth.users au WHERE au.id = s.id
    )
    
    UNION ALL
    
    -- Staff from staff table
    SELECT 
      st.id,
      COALESCE(st.email, st.enrollment_id || '@staff.local')::TEXT as email,
      st.name as full_name,
      'staff'::TEXT as role,
      st.institution_id,
      i.name::TEXT as institution_name,
      true as is_active,
      NULL::TIMESTAMPTZ as last_login,
      st.created_at,
      'staff' as source
    FROM staff st
    LEFT JOIN institutions i ON st.institution_id = i.id
    WHERE NOT EXISTS (
      SELECT 1 FROM auth.users au WHERE au.id = st.id
    )
  ),
  filtered_users AS (
    SELECT 
      au.id,
      au.email,
      au.full_name,
      au.role,
      au.institution_id,
      au.institution_name,
      au.is_active,
      au.last_login,
      au.created_at
    FROM all_users au
    WHERE 
      (search_term IS NULL OR 
       au.email ILIKE '%' || search_term || '%' OR 
       au.full_name ILIKE '%' || search_term || '%')
    AND (role_filter IS NULL OR au.role = role_filter)
    AND (institution_filter IS NULL OR au.institution_id = institution_filter)
    AND (status_filter IS NULL OR 
         (status_filter = 'active' AND au.is_active = true) OR
         (status_filter = 'suspended' AND au.is_active = false))
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

-- Test query
SELECT * FROM get_all_users_paginated(NULL, NULL, NULL, NULL, 1, 10, 'created_at', 'DESC');

-- Check if students table has institution_id column
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'students' 
ORDER BY ordinal_position;

DO $$
BEGIN
  RAISE NOTICE '✅ User Management function updated with institution support!';
  RAISE NOTICE 'Now properly fetches institution info for students and staff';
END $$;
