-- =====================================================
-- BASIC VERIFICATION (NO AUTH REQUIRED)
-- =====================================================
-- Run these to verify database objects exist
-- =====================================================

-- 1. ✅ Check all 4 tables exist
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE columns.table_name = tables.table_name) as column_count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('admin_activity_feed', 'system_metrics', 'active_sessions', 'storage_usage')
ORDER BY table_name;

-- Expected: 4 rows (admin_activity_feed=10, system_metrics=5, active_sessions=10, storage_usage=8)

-- 2. ✅ Check all 11 functions exist
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

-- Expected: 11 rows, all FUNCTION type

-- 3. ✅ Check all 3 triggers exist
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

-- Expected: 3 rows

-- 4. ✅ Check indexes were created
SELECT 
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('admin_activity_feed', 'system_metrics', 'active_sessions', 'storage_usage')
  AND indexname NOT LIKE '%pkey'  -- Exclude primary keys
ORDER BY tablename, indexname;

-- Expected: Multiple indexes per table

-- 5. ✅ Verify RLS is enabled
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('admin_activity_feed', 'system_metrics', 'active_sessions', 'storage_usage')
ORDER BY tablename;

-- Expected: All should show rowsecurity = true

-- 6. ✅ Check RLS policies count
SELECT 
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('admin_activity_feed', 'system_metrics', 'active_sessions', 'storage_usage')
GROUP BY tablename
ORDER BY tablename;

-- Expected: admin_activity_feed=2, system_metrics=2, active_sessions=2, storage_usage=2

-- 7. ✅ Check activity feed constraints
SELECT 
  conname as constraint_name,
  contype as constraint_type
FROM pg_constraint
WHERE conrelid = 'admin_activity_feed'::regclass
  AND conname = 'check_activity_type';

-- Expected: 1 row (check constraint exists)

-- 8. ✅ Check system metrics constraints
SELECT 
  conname as constraint_name,
  contype as constraint_type
FROM pg_constraint
WHERE conrelid = 'system_metrics'::regclass
  AND conname = 'check_metric_name';

-- Expected: 1 row (check constraint exists)

-- =====================================================
-- SUMMARY CHECK
-- =====================================================
SELECT 
  '✅ Tables' as component,
  COUNT(*)::text || ' / 4' as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('admin_activity_feed', 'system_metrics', 'active_sessions', 'storage_usage')

UNION ALL

SELECT 
  '✅ Functions' as component,
  COUNT(*)::text || ' / 11' as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'log_activity', 'record_metric', 'start_session', 'update_session_activity',
    'end_session', 'calculate_storage_usage', 'get_dashboard_metrics',
    'get_activity_feed', 'get_metric_trend', 'cleanup_old_sessions', 'cleanup_old_metrics'
  )

UNION ALL

SELECT 
  '✅ Triggers' as component,
  COUNT(*)::text || ' / 3' as status
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name IN ('log_institution_creation', 'log_institution_status_change', 'log_librarian_invitation')

UNION ALL

SELECT 
  '✅ RLS Policies' as component,
  COUNT(*)::text || ' / 8' as status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('admin_activity_feed', 'system_metrics', 'active_sessions', 'storage_usage');

-- =====================================================
-- If all show correct counts, migration is complete! ✅
-- =====================================================

-- NOTE: To test get_dashboard_metrics(), you must:
-- 1. Log in to your app as a super admin user
-- 2. The dashboard will automatically call the function
-- 3. Or run: SELECT * FROM get_dashboard_metrics(); while authenticated
