# Dashboard Enhancement Migration Guide

## Overview
This guide walks you through applying the comprehensive dashboard backend infrastructure migration.

## Prerequisites
- Supabase project access
- Super admin SQL Editor access
- Understanding of your current database schema

## Migration Steps

### Step 1: Review the Migration File
Open `DASHBOARD_ENHANCEMENT_MIGRATION.sql` and review the changes:
- 4 new tables (admin_activity_feed, system_metrics, active_sessions, storage_usage)
- 12 RPC functions
- 3 automatic triggers
- Row Level Security (RLS) policies

### Step 2: Run the Migration

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project

2. **Navigate to SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy and Execute SQL**
   - Copy the entire contents of `DASHBOARD_ENHANCEMENT_MIGRATION.sql`
   - Paste into the SQL Editor
   - Click "Run" (or press Ctrl+Enter)

4. **Verify Success**
   - Check that all queries executed without errors
   - You should see success messages for each statement

### Step 3: Verify Tables Created

Run this query to verify all tables exist:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'admin_activity_feed',
  'system_metrics',
  'active_sessions',
  'storage_usage'
);
```

Expected result: 4 rows

### Step 4: Verify RPC Functions

Run this query to verify all functions exist:
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_type = 'FUNCTION'
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
);
```

Expected result: 11 rows

### Step 5: Test RPC Functions

Test the main dashboard function:
```sql
SELECT * FROM get_dashboard_metrics();
```

Expected result: One row with metrics (may show zeros if no data yet)

Test the activity feed:
```sql
SELECT * FROM get_activity_feed(10, 0);
```

Expected result: Activity records (depends on automatic triggers)

### Step 6: Verify Triggers

Check that triggers are installed:
```sql
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
AND trigger_name IN (
  'log_institution_creation',
  'log_institution_status_change',
  'log_librarian_invitation'
);
```

Expected result: 3 rows

### Step 7: Set Up Scheduled Cleanup (Optional)

For automatic cleanup of old data, set up Supabase cron jobs:

1. Go to Database → Extensions
2. Enable `pg_cron` extension
3. Add cleanup jobs:

```sql
-- Cleanup old sessions every hour
SELECT cron.schedule(
  'cleanup-old-sessions',
  '0 * * * *', -- Every hour
  $$ SELECT cleanup_old_sessions(); $$
);

-- Cleanup old metrics every day at 2 AM
SELECT cron.schedule(
  'cleanup-old-metrics',
  '0 2 * * *', -- 2 AM daily
  $$ SELECT cleanup_old_metrics(90); $$ -- Keep 90 days
);
```

## Post-Migration Testing

### Test Activity Logging

Create a test institution and verify activity is logged:
```sql
-- Create test institution
INSERT INTO institutions (name, code)
VALUES ('Test Institution', 'TEST001');

-- Check if activity was logged
SELECT * FROM admin_activity_feed 
WHERE activity_type = 'institution_created'
ORDER BY created_at DESC 
LIMIT 1;
```

### Test Session Tracking

The session tracking will be tested automatically when users log in. Check sessions:
```sql
SELECT 
  user_id,
  login_at,
  last_activity_at,
  is_active
FROM active_sessions
ORDER BY login_at DESC
LIMIT 10;
```

### Test Storage Usage

Calculate storage for an institution:
```sql
-- Replace with actual institution_id
SELECT calculate_storage_usage('your-institution-id-here');

-- View storage data
SELECT * FROM storage_usage;
```

## Troubleshooting

### Issue: RLS Policy Error
If you get "permission denied" errors, verify your user is super admin:
```sql
SELECT role FROM user_profiles WHERE id = auth.uid();
```

### Issue: Trigger Not Firing
Check if triggers are enabled:
```sql
SELECT trigger_name, status 
FROM information_schema.triggers 
WHERE trigger_schema = 'public';
```

### Issue: Function Not Found
Ensure functions have correct permissions:
```sql
-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_dashboard_metrics() TO authenticated;
GRANT EXECUTE ON FUNCTION get_activity_feed(INTEGER, INTEGER, TEXT[], UUID) TO authenticated;
```

## Rollback (If Needed)

If you need to rollback the migration:

```sql
-- Drop triggers
DROP TRIGGER IF EXISTS log_institution_creation ON institutions;
DROP TRIGGER IF EXISTS log_institution_status_change ON institutions;
DROP TRIGGER IF EXISTS log_librarian_invitation ON librarian_invitations;

-- Drop functions
DROP FUNCTION IF EXISTS log_activity;
DROP FUNCTION IF EXISTS record_metric;
DROP FUNCTION IF EXISTS start_session;
DROP FUNCTION IF EXISTS update_session_activity;
DROP FUNCTION IF EXISTS end_session;
DROP FUNCTION IF EXISTS calculate_storage_usage;
DROP FUNCTION IF EXISTS get_dashboard_metrics;
DROP FUNCTION IF EXISTS get_activity_feed;
DROP FUNCTION IF EXISTS get_metric_trend;
DROP FUNCTION IF EXISTS cleanup_old_sessions;
DROP FUNCTION IF EXISTS cleanup_old_metrics;
DROP FUNCTION IF EXISTS trigger_log_institution_creation;
DROP FUNCTION IF EXISTS trigger_log_institution_status_change;
DROP FUNCTION IF EXISTS trigger_log_librarian_invitation;

-- Drop tables
DROP TABLE IF EXISTS storage_usage;
DROP TABLE IF EXISTS active_sessions;
DROP TABLE IF EXISTS system_metrics;
DROP TABLE IF EXISTS admin_activity_feed;
```

## Next Steps

After successful migration:
1. ✅ Tables and functions are ready
2. ✅ Frontend is already updated to use new RPC functions
3. ✅ Session tracking is integrated
4. 🔄 Monitor dashboard for 24 hours
5. 🔄 Verify activity logs are populating
6. 🔄 Check session counts are accurate
7. 📝 Customize storage calculation logic if needed (see `calculate_storage_usage` function)

## Support

If you encounter issues:
1. Check Supabase logs (Dashboard → Logs)
2. Verify RLS policies allow super admin access
3. Test individual functions in SQL Editor
4. Review trigger execution in database logs

## Migration Complete! 🎉

Your Super Admin Dashboard now has:
- ✅ Real-time metrics from database
- ✅ Comprehensive activity logging (24 types)
- ✅ Active session tracking
- ✅ Storage usage monitoring
- ✅ Automatic triggers for key events
- ✅ Optimized RPC functions
