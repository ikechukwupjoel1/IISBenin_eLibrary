# Supabase SQL Execution Guide

## ⚡ PRIORITY ORDER - Run These Scripts

Execute these SQL files in your Supabase SQL Editor in this exact order:

---

## 🔴 **REQUIRED - Run First**

### 1. Main Dashboard Migration (REQUIRED)
**File:** `DASHBOARD_ENHANCEMENT_MIGRATION.sql`
**When:** Before anything else
**Why:** Creates all tables, RPC functions, and triggers needed for the dashboard

**Steps:**
1. Open Supabase Dashboard → SQL Editor
2. Click "New Query"
3. Copy entire contents of `DASHBOARD_ENHANCEMENT_MIGRATION.sql`
4. Click "Run" or press `Ctrl+Enter`
5. Wait for completion (should take ~5-10 seconds)

**Verify Success:**
```sql
-- Should return 4 rows
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

**Expected Output:** 
```
admin_activity_feed
system_metrics
active_sessions
storage_usage
```

---

## 🟡 **RECOMMENDED - Run Second**

### 2. Storage Calculation Implementation (RECOMMENDED)
**File:** `STORAGE_CALCULATION_IMPLEMENTATION.sql`
**When:** After main migration
**Why:** Enables accurate storage tracking per institution

**What it does:**
- Replaces placeholder `calculate_storage_usage()` with actual implementation
- Adds helper functions for storage monitoring
- Provides queries to view storage summaries

**Steps:**
1. New Query in SQL Editor
2. Copy entire contents of `STORAGE_CALCULATION_IMPLEMENTATION.sql`
3. Run it

**Test it works:**
```sql
-- Get storage summary (should not error)
SELECT * FROM get_storage_summary();
```

**Note:** You may need to customize the bucket names in the function based on your Supabase Storage setup.

---

## 🟢 **OPTIONAL - Run Third**

### 3. pg_cron Automation (OPTIONAL - Requires Pro Plan)
**File:** `PG_CRON_SETUP.sql`
**When:** After previous two
**Why:** Automates maintenance tasks (cleanup, storage calculation)

**⚠️ Prerequisites:**
- Supabase Pro plan (or request from support)
- pg_cron extension available

**Check if available:**
```sql
SELECT * FROM pg_available_extensions WHERE name = 'pg_cron';
```

**If available, run:**
1. New Query in SQL Editor
2. Copy entire contents of `PG_CRON_SETUP.sql`
3. Run it

**Verify Jobs Created:**
```sql
SELECT jobid, jobname, schedule, active 
FROM cron.job;
```

**Expected:** 5 jobs (cleanup-inactive-sessions, cleanup-old-metrics, etc.)

**If pg_cron not available:**
- Skip this file
- Run cleanup functions manually when needed:
  ```sql
  SELECT cleanup_old_sessions();
  SELECT cleanup_old_metrics(90);
  ```

---

## 🔵 **REFERENCE ONLY - Don't Run**

### 4. Activity Types Guide (REFERENCE)
**File:** `ACTIVITY_TYPES_GUIDE.sql`
**When:** When you want to add NEW activity types
**Why:** Shows examples of how to extend the system

**This is NOT a script to run all at once!**

It contains:
- Examples of how to add new activity types
- Sample trigger functions
- Template code

**Use it when:**
- Adding book borrowing tracking
- Adding digital content tracking
- Adding new activity categories
- Customizing for your needs

---

## 📋 Quick Start Checklist

```
□ 1. Run DASHBOARD_ENHANCEMENT_MIGRATION.sql (REQUIRED)
□ 2. Verify 4 tables created
□ 3. Test dashboard RPC: SELECT * FROM get_dashboard_metrics();
□ 4. Run STORAGE_CALCULATION_IMPLEMENTATION.sql (RECOMMENDED)
□ 5. Check storage works: SELECT * FROM get_storage_summary();
□ 6. [OPTIONAL] Check pg_cron available
□ 7. [OPTIONAL] Run PG_CRON_SETUP.sql if available
□ 8. [OPTIONAL] Verify cron jobs: SELECT * FROM cron.job;
□ 9. Test dashboard in your app!
```

---

## 🧪 Testing After Migration

### Test Dashboard Metrics
```sql
-- Should return 1 row with all metrics
SELECT * FROM get_dashboard_metrics();
```

### Test Activity Feed
```sql
-- Should return recent activities
SELECT * FROM get_activity_feed(10, 0);
```

### Test Session Tracking
```sql
-- After logging in, check sessions
SELECT COUNT(*) FROM active_sessions WHERE is_active = true;
```

### Test Storage Calculation
```sql
-- Calculate for a test institution
SELECT calculate_storage_usage('your-institution-id-here');

-- View results
SELECT * FROM storage_usage;
```

---

## 🚨 Common Issues

### Issue 1: "relation does not exist"
**Problem:** Trying to run scripts out of order
**Solution:** Run DASHBOARD_ENHANCEMENT_MIGRATION.sql first

### Issue 2: "permission denied"
**Problem:** Not logged in as super admin
**Solution:** Make sure your user has super_admin role:
```sql
UPDATE user_profiles 
SET role = 'super_admin' 
WHERE email = 'your-email@example.com';
```

### Issue 3: "pg_cron extension not found"
**Problem:** Extension not available in your plan
**Solution:** 
- Contact Supabase support to enable it, OR
- Skip pg_cron setup and run cleanup manually

### Issue 4: "function already exists"
**Problem:** Running migration twice
**Solution:** Either:
- Drop functions first: `DROP FUNCTION function_name;`
- Or skip, it's already installed

---

## 💡 What Happens After Running?

### Your Dashboard Will Have:
- ✅ Real-time metrics (institutions, users, books, sessions)
- ✅ Activity feed with comprehensive logging
- ✅ Active session tracking
- ✅ Storage usage monitoring
- ✅ Automatic triggers logging key events

### Automatic Logging Enabled For:
- New institutions created
- Institutions suspended/reactivated
- Librarians invited
- (More triggers as you add them)

### RPC Functions Available:
```sql
-- Dashboard data
get_dashboard_metrics()
get_activity_feed(limit, offset, types, institution_id)
get_metric_trend(metric_name, days)

-- Session management
start_session(token, user_agent, ip)
update_session_activity(token)
end_session(token)

-- Storage
calculate_storage_usage(institution_id)
get_storage_summary()

-- Helpers
log_activity(type, description, ...)
record_metric(name, value, ...)
```

---

## 📞 Need Help?

**Check Supabase Logs:**
1. Dashboard → Logs
2. Filter by "Postgres Logs"
3. Look for errors

**Test Individual Functions:**
```sql
-- Test if function exists
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'get_dashboard_metrics';

-- Test if table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'admin_activity_feed';
```

**Rollback if Needed:**
See DASHBOARD_MIGRATION_GUIDE.md for rollback procedures

---

## ✅ Success Criteria

Your migration is successful when:

1. **Query returns data:**
   ```sql
   SELECT * FROM get_dashboard_metrics();
   ```

2. **Activity feed works:**
   ```sql
   SELECT * FROM get_activity_feed(5, 0);
   ```

3. **Dashboard loads without errors in your app**

4. **Metrics show real numbers (not all zeros)**

5. **Activity feed shows recent events**

---

## 🎯 Summary

**MUST RUN:**
- ✅ `DASHBOARD_ENHANCEMENT_MIGRATION.sql`

**SHOULD RUN:**
- ⭐ `STORAGE_CALCULATION_IMPLEMENTATION.sql`

**OPTIONAL:**
- 🔧 `PG_CRON_SETUP.sql` (if available)

**REFERENCE:**
- 📚 `ACTIVITY_TYPES_GUIDE.sql` (use when extending)

**Total Time:** ~5-15 minutes depending on options chosen

**Start with #1, test it works, then proceed to #2 and #3!**
