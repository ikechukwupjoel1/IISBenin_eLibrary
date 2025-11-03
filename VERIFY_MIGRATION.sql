-- =====================================================
-- VERIFY DASHBOARD MIGRATION
-- =====================================================
-- Run these queries to verify everything is working
-- =====================================================

-- 1. Check all tables exist
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE columns.table_name = tables.table_name) as column_count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('admin_activity_feed', 'system_metrics', 'active_sessions', 'storage_usage')
ORDER BY table_name;

-- 2. Check all functions exist
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'log_activity',
    'record_metric',
    'start_session',
    'update_session_activity',
    'end_session',
    'calculate_storage_usage',
    'get_dashboard_metrics',
    'get_activity_feed',
    'get_metric_trend',
    'cleanup_old_sessions',
    'cleanup_old_metrics'
  )
ORDER BY routine_name;

-- 3. Check all triggers exist
SELECT 
  trigger_name,
  event_object_table,
  action_timing || ' ' || event_manipulation as trigger_event
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name IN (
    'log_institution_creation',
    'log_institution_status_change',
    'log_librarian_invitation'
  )
ORDER BY trigger_name;

-- 4. Test get_dashboard_metrics() - Should return data
SELECT * FROM get_dashboard_metrics();

-- 5. Check activity feed (should be empty or have trigger activities)
SELECT 
  activity_type,
  description,
  created_at
FROM admin_activity_feed
ORDER BY created_at DESC
LIMIT 5;

-- 6. Check active sessions table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'active_sessions'
ORDER BY ordinal_position;

-- 7. Check storage usage table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'storage_usage'
ORDER BY ordinal_position;

-- 8. Verify RLS is enabled
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('admin_activity_feed', 'system_metrics', 'active_sessions', 'storage_usage');

-- 9. Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('admin_activity_feed', 'system_metrics', 'active_sessions', 'storage_usage')
ORDER BY tablename, policyname;

-- =====================================================
-- If all queries return results, migration is successful!
-- =====================================================
