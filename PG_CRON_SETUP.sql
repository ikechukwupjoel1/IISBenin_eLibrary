-- =====================================================
-- PG_CRON SETUP FOR AUTOMATED MAINTENANCE
-- =====================================================
-- This script sets up automated cleanup jobs using pg_cron
-- Run this AFTER the main migration is complete
-- =====================================================

-- =====================================================
-- STEP 1: ENABLE PG_CRON EXTENSION
-- =====================================================
-- Note: pg_cron may need to be enabled by Supabase support
-- Check if it's available in your project first

-- Enable the extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Verify extension is installed
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- =====================================================
-- STEP 2: GRANT PERMISSIONS
-- =====================================================
-- Grant necessary permissions for cron jobs

GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- =====================================================
-- STEP 3: SCHEDULE CLEANUP JOBS
-- =====================================================

-- Job 1: Cleanup old sessions every hour
-- This marks sessions as inactive if no activity for 1+ hour
SELECT cron.schedule(
  'cleanup-inactive-sessions',           -- Job name
  '0 * * * *',                          -- Every hour on the hour
  $$SELECT cleanup_old_sessions();$$    -- SQL command
);

-- Job 2: Cleanup old metrics every day at 2 AM
-- This deletes metrics older than 90 days
SELECT cron.schedule(
  'cleanup-old-metrics',                      -- Job name
  '0 2 * * *',                               -- Daily at 2 AM
  $$SELECT cleanup_old_metrics(90);$$        -- Keep 90 days
);

-- Job 3: Cleanup old activity feed entries (optional)
-- Delete activity logs older than 180 days (6 months)
SELECT cron.schedule(
  'cleanup-old-activities',
  '0 3 * * 0',                               -- Weekly on Sunday at 3 AM
  $$DELETE FROM admin_activity_feed 
    WHERE created_at < NOW() - INTERVAL '180 days';$$
);

-- Job 4: Calculate storage usage for all institutions daily
-- Runs at 4 AM to avoid peak hours
SELECT cron.schedule(
  'calculate-all-storage',
  '0 4 * * *',                               -- Daily at 4 AM
  $$
  DO $$
  DECLARE
    inst_record RECORD;
  BEGIN
    FOR inst_record IN 
      SELECT id FROM institutions WHERE is_active = true
    LOOP
      PERFORM calculate_storage_usage(inst_record.id);
    END LOOP;
  END $$;
  $$
);

-- Job 5: Record daily metrics snapshot
-- Captures key metrics once per day for historical tracking
SELECT cron.schedule(
  'daily-metrics-snapshot',
  '0 1 * * *',                               -- Daily at 1 AM
  $$
  INSERT INTO system_metrics (metric_name, metric_value, metric_unit)
  SELECT 
    'total_institutions',
    COUNT(*),
    'count'
  FROM institutions
  UNION ALL
  SELECT 
    'active_institutions',
    COUNT(*),
    'count'
  FROM institutions WHERE is_active = true
  UNION ALL
  SELECT 
    'total_users',
    COUNT(*),
    'count'
  FROM user_profiles
  UNION ALL
  SELECT 
    'total_books',
    COUNT(*),
    'count'
  FROM books
  UNION ALL
  SELECT 
    'active_sessions',
    COUNT(*),
    'count'
  FROM active_sessions 
  WHERE is_active = true 
    AND last_activity_at > NOW() - INTERVAL '30 minutes';
  $$
);

-- =====================================================
-- STEP 4: VERIFY SCHEDULED JOBS
-- =====================================================

-- List all scheduled jobs
SELECT 
  jobid,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active
FROM cron.job
ORDER BY jobid;

-- Check job run history
SELECT 
  jobid,
  runid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 20;

-- =====================================================
-- STEP 5: MANUAL TESTING
-- =====================================================

-- Test cleanup functions manually before scheduling
SELECT cleanup_old_sessions();
SELECT cleanup_old_metrics(90);

-- Test storage calculation for a specific institution
-- SELECT calculate_storage_usage('your-institution-id-here');

-- =====================================================
-- STEP 6: MONITORING QUERIES
-- =====================================================

-- Check cron job status
SELECT 
  jobid,
  jobname,
  schedule,
  active,
  database
FROM cron.job
WHERE jobname IN (
  'cleanup-inactive-sessions',
  'cleanup-old-metrics',
  'cleanup-old-activities',
  'calculate-all-storage',
  'daily-metrics-snapshot'
);

-- View recent job executions with any errors
SELECT 
  j.jobname,
  jrd.status,
  jrd.return_message,
  jrd.start_time,
  jrd.end_time,
  EXTRACT(EPOCH FROM (jrd.end_time - jrd.start_time)) as duration_seconds
FROM cron.job_run_details jrd
JOIN cron.job j ON j.jobid = jrd.jobid
WHERE j.jobname IN (
  'cleanup-inactive-sessions',
  'cleanup-old-metrics',
  'cleanup-old-activities',
  'calculate-all-storage',
  'daily-metrics-snapshot'
)
ORDER BY jrd.start_time DESC
LIMIT 50;

-- =====================================================
-- MANAGEMENT FUNCTIONS
-- =====================================================

-- Disable a specific job
-- SELECT cron.unschedule('job-name-here');

-- Enable a job that was unscheduled
-- You'll need to re-run the schedule command

-- Update job schedule (unschedule and re-schedule)
-- Example: Change cleanup frequency
/*
SELECT cron.unschedule('cleanup-inactive-sessions');
SELECT cron.schedule(
  'cleanup-inactive-sessions',
  '0 */2 * * *',  -- Every 2 hours instead of every hour
  $$SELECT cleanup_old_sessions();$$
);
*/

-- =====================================================
-- TROUBLESHOOTING
-- =====================================================

-- If jobs aren't running, check:

-- 1. Extension is enabled
SELECT * FROM pg_available_extensions WHERE name = 'pg_cron';

-- 2. Permissions are correct
SELECT has_schema_privilege('cron', 'USAGE');

-- 3. Jobs are active
SELECT jobid, jobname, active FROM cron.job;

-- 4. Check for errors in recent runs
SELECT 
  jobname,
  status,
  return_message
FROM cron.job_run_details jrd
JOIN cron.job j ON j.jobid = jrd.jobid
WHERE status = 'failed'
ORDER BY start_time DESC
LIMIT 10;

-- =====================================================
-- CLEANUP (IF NEEDED)
-- =====================================================

-- Remove all scheduled jobs
/*
SELECT cron.unschedule('cleanup-inactive-sessions');
SELECT cron.unschedule('cleanup-old-metrics');
SELECT cron.unschedule('cleanup-old-activities');
SELECT cron.unschedule('calculate-all-storage');
SELECT cron.unschedule('daily-metrics-snapshot');
*/

-- =====================================================
-- IMPORTANT NOTES
-- =====================================================

-- 1. pg_cron may not be available in all Supabase plans
--    Check with Supabase support if you encounter issues
--
-- 2. All times are in UTC timezone
--    Adjust schedules according to your needs
--
-- 3. Test jobs manually before relying on scheduled runs
--
-- 4. Monitor job execution regularly for the first week
--
-- 5. Adjust retention periods based on your requirements:
--    - Sessions: 1 hour of inactivity
--    - Metrics: 90 days retention
--    - Activities: 180 days retention (6 months)
--
-- 6. Cron schedule format: minute hour day month day-of-week
--    Examples:
--    '0 * * * *'      - Every hour
--    '0 2 * * *'      - Daily at 2 AM
--    '0 3 * * 0'      - Weekly on Sunday at 3 AM
--    '*/15 * * * *'   - Every 15 minutes
--    '0 */6 * * *'    - Every 6 hours

-- =====================================================
-- SETUP COMPLETE
-- =====================================================
