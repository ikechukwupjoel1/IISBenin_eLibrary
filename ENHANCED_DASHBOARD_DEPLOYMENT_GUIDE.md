# Enhanced Super Admin Dashboard - Deployment Guide

## 🎯 Overview

This deployment adds **User Management** and **Enhanced Dashboard Monitoring** to your Super Admin Dashboard.

### New Features Added:
1. **System Health Monitoring** - Real-time system health indicators
2. **Performance Monitoring** - Charts for response times, metrics trends
3. **User Management** - Comprehensive user administration across all institutions
4. **Bulk Operations** - Suspend, activate multiple users at once
5. **User Activity Logs** - Track user actions and changes
6. **Role Management** - Change user roles (student, librarian, super_admin)

---

## 📋 Prerequisites

- ✅ Supabase project with existing dashboard backend
- ✅ Super admin account created
- ✅ SAFE_DASHBOARD_MIGRATION.sql already executed
- ✅ STORAGE_CALCULATION_CUSTOM.sql already executed
- ✅ PG_CRON_SETUP.sql already executed

---

## 🚀 Step-by-Step Deployment

### Step 1: Run Database Migrations (Supabase SQL Editor)

#### 1.1 Run Enhanced Dashboard Migration

```sql
-- File: ENHANCED_DASHBOARD_MIGRATION.sql
-- This adds system health and performance monitoring functions
```

**Open Supabase SQL Editor:**
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** in sidebar
4. Click **New Query**
5. Copy and paste the entire `ENHANCED_DASHBOARD_MIGRATION.sql` file
6. Click **Run** (or press Ctrl+Enter)

**Expected Output:**
```
✅ Enhanced Dashboard Migration Part 1 Complete!
Added 4 new monitoring functions:
  - get_system_health()
  - get_performance_metrics()
  - get_storage_alerts()
  - get_trend_analysis()
```

**Verification Query:**
```sql
-- Test the new functions
SELECT get_system_health();
SELECT * FROM get_performance_metrics('24 hours');
SELECT * FROM get_storage_alerts();
SELECT get_trend_analysis(7);
```

---

#### 1.2 Run User Management Migration

```sql
-- File: USER_MANAGEMENT_MIGRATION.sql
-- This adds user management functions and audit logging
```

**Open a New Query:**
1. Click **New Query** in SQL Editor
2. Copy and paste the entire `USER_MANAGEMENT_MIGRATION.sql` file
3. Click **Run**

**Expected Output:**
```
✅ User Management Migration Complete!
Added:
  - user_management_log table
  - get_all_users_paginated() function
  - get_user_activity_log() function
  - bulk_suspend_users() function
  - bulk_activate_users() function
  - change_user_role() function
  - get_user_management_stats() function
  - 2 RLS policies
```

**Verification Query:**
```sql
-- Test user management functions
SELECT * FROM get_all_users_paginated(
  NULL, -- search_term
  NULL, -- role_filter
  NULL, -- institution_filter
  NULL, -- status_filter
  1,    -- page_num
  10,   -- page_size
  'created_at',
  'DESC'
);

-- Check user management stats
SELECT get_user_management_stats();
```

---

### Step 2: Deploy Frontend Code

Your frontend code is already built and ready. The production build was successful:

```bash
✓ built in 21.28s
```

**Commit and Deploy:**

```bash
# Stage all changes
git add .

# Commit with descriptive message
git commit -m "feat: Add User Management and Enhanced Monitoring to Super Admin Dashboard

- Add System Health monitoring with real-time indicators
- Add Performance Monitoring with trend charts (recharts)
- Add User Management with search, filters, pagination
- Add User Details modal with activity logs
- Add bulk user operations (suspend, activate, role change)
- Add UserDetailsModal with role management
- Add new navigation items: Users, System Health, Performance
- Backend: 7 new RPC functions, 1 new table, 2 RLS policies
- Dependencies: recharts for charts"

# Push to GitHub
git push origin main
```

---

## 🎨 New Features Guide

### 1. System Health Tab

**Location:** Super Admin Dashboard → System Health

**Features:**
- ✅ Overall system status (healthy/warning/critical)
- ✅ Database size and health
- ✅ Active connections monitoring
- ✅ Performance metrics (avg response time)
- ✅ Error tracking (last hour)
- ✅ Storage usage with visual progress bars
- ✅ Auto-refresh every 30 seconds

**Color Coding:**
- 🟢 **Green** = Healthy
- 🟡 **Yellow** = Warning (needs attention)
- 🔴 **Red** = Critical (immediate action required)

---

### 2. Performance Monitoring Tab

**Location:** Super Admin Dashboard → Performance

**Features:**
- ✅ Line/Area charts for all metrics
- ✅ Time range selector (1 hour, 24 hours, 7 days)
- ✅ Trend indicators (increasing, decreasing, stable)
- ✅ Current/Avg/Min/Max values
- ✅ Visual trend analysis
- ✅ Auto-refresh every minute

**Metrics Tracked:**
- API response times
- Database query performance
- Active connections
- Error rates
- Custom metrics from `system_metrics` table

---

### 3. User Management Tab

**Location:** Super Admin Dashboard → User Management

**Features:**

#### Search & Filters:
- 🔍 **Search** by email or name
- 👤 **Role Filter** (Student, Librarian, Super Admin)
- ✅ **Status Filter** (Active, Suspended)
- 🏢 **Institution Filter** (dropdown of all institutions)
- 🧹 **Clear All Filters** button

#### Bulk Operations:
- ☑️ **Select All** checkbox in header
- ☑️ Individual row selection
- ✅ **Bulk Activate** (green button)
- 🚫 **Bulk Suspend** (red button)
- 📊 Selected count indicator

#### Table Features:
- 📄 **Pagination** (20 users per page)
- 📊 **Sortable Columns** (click headers to sort)
- 👁️ **View Details** button per user
- 📊 **Export to CSV** button

#### User Details Modal:
- 📧 Email, Name, Role, Status
- 🏢 Institution
- 🕐 Last Login, Account Created
- 📜 **Activity Log** (last 20 activities)
- 🔄 **Change Role** dropdown
- ✅ **Activate User** button
- 🚫 **Suspend User** button

---

### 4. Enhanced Quick Actions

**Location:** Dashboard Home Tab (top section)

**New Functionality:**
All Quick Action buttons now navigate to the appropriate tab:
- ➕ **Create Institution** → Opens Institutions tab with create modal
- 👥 **Invite Librarian** → Opens Institutions tab
- 📊 **View Analytics** → Opens Analytics tab
- ⚙️ **System Settings** → Opens Feature Flags tab

---

## 🔐 Security & Permissions

### RLS Policies Applied:
```sql
-- Only super admins can view user management logs
CREATE POLICY user_mgmt_log_view_super_admin ON user_management_log
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  ));

-- Only super admins can insert logs
CREATE POLICY user_mgmt_log_insert_super_admin ON user_management_log
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  ));
```

### Function Security:
All new RPC functions use `SECURITY DEFINER` for controlled access:
- `get_system_health()` - Checks database metrics
- `get_all_users_paginated()` - Queries auth.users table
- `bulk_suspend_users()` - Modifies auth.users.deleted_at
- `bulk_activate_users()` - Restores auth.users.deleted_at
- `change_user_role()` - Updates user_profiles.role

---

## 📊 Database Tables Created

### user_management_log
```sql
CREATE TABLE user_management_log (
  id UUID PRIMARY KEY,
  admin_id UUID REFERENCES auth.users(id),
  target_user_id UUID REFERENCES auth.users(id),
  action TEXT CHECK (action IN (
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
```

**Indexes:**
- `idx_user_mgmt_log_admin` (admin_id)
- `idx_user_mgmt_log_target` (target_user_id)
- `idx_user_mgmt_log_action` (action)
- `idx_user_mgmt_log_created` (created_at DESC)

---

## 🧪 Testing Checklist

### System Health
- [ ] Open System Health tab
- [ ] Verify all 6 health indicators display
- [ ] Check color coding matches status
- [ ] Wait 30 seconds, verify auto-refresh
- [ ] Verify storage usage percentage

### Performance Monitoring
- [ ] Open Performance tab
- [ ] Verify charts display (if data exists)
- [ ] Switch between time ranges (1h, 24h, 7d)
- [ ] Check trend indicators
- [ ] Verify auto-refresh after 1 minute

### User Management
- [ ] Open User Management tab
- [ ] Search for a user by email
- [ ] Filter by role (Student)
- [ ] Filter by status (Active)
- [ ] Filter by institution
- [ ] Clear all filters
- [ ] Select multiple users
- [ ] Click "Bulk Suspend" (cancel confirmation)
- [ ] Click a user's "View" button
- [ ] Check user details modal
- [ ] View activity log
- [ ] Change user role (test, then revert)
- [ ] Export to CSV
- [ ] Test pagination (if > 20 users)

### Quick Actions
- [ ] Click "Create Institution" → Opens institutions tab
- [ ] Click "Invite Librarian" → Opens institutions tab
- [ ] Click "View Analytics" → Opens analytics tab
- [ ] Click "System Settings" → Opens features tab

---

## 📈 Monitoring & Maintenance

### Daily Checks:
1. **System Health** - Check for warnings/critical status
2. **User Management Logs** - Review bulk actions
3. **Performance Metrics** - Monitor trends

### Weekly Tasks:
1. Review user management audit logs
2. Check storage alerts
3. Analyze performance trends
4. Clean up old data (automated by pg_cron)

### Automated Maintenance (pg_cron):
- ✅ Cleanup inactive sessions (hourly)
- ✅ Cleanup old metrics (daily 2 AM)
- ✅ Cleanup old activities (weekly Sunday 3 AM)
- ✅ Calculate storage (daily 4 AM)
- ✅ Daily metrics snapshot (daily 1 AM)

---

## 🐛 Troubleshooting

### Issue: "Function does not exist"
**Solution:** Run the migration SQL files again in Supabase SQL Editor.

### Issue: "No users showing in User Management"
**Solution:** Check RLS policies. Ensure you're logged in as super admin.
```sql
-- Verify your role
SELECT role FROM user_profiles WHERE id = auth.uid();
-- Should return: 'super_admin'
```

### Issue: "Charts not displaying"
**Solution:** No data yet. Metrics will appear as system collects data.
```sql
-- Check if metrics exist
SELECT COUNT(*) FROM system_metrics;
-- Run manual metrics capture
INSERT INTO system_metrics (metric_name, metric_value, metric_unit)
VALUES ('test_metric', 100, 'count');
```

### Issue: "Bulk operations fail"
**Solution:** Check user_management_log table exists and has correct permissions.
```sql
-- Verify table exists
SELECT * FROM user_management_log LIMIT 1;
```

---

## 📦 Dependencies Added

```json
{
  "recharts": "^2.x.x"  // For performance charts
}
```

Already included in build. No additional installation needed if using the latest code.

---

## ✅ Deployment Checklist

- [ ] ENHANCED_DASHBOARD_MIGRATION.sql executed in Supabase
- [ ] USER_MANAGEMENT_MIGRATION.sql executed in Supabase
- [ ] Verification queries run successfully
- [ ] Frontend code committed to Git
- [ ] Changes pushed to GitHub main branch
- [ ] Production build successful (`npm run build`)
- [ ] System Health tab tested
- [ ] Performance tab tested
- [ ] User Management tab tested
- [ ] Bulk operations tested
- [ ] User Details modal tested
- [ ] Quick Actions tested
- [ ] CSV export tested

---

## 🎉 Success!

Your Super Admin Dashboard now includes:
1. ✅ **System Health Monitoring** - Real-time health indicators
2. ✅ **Performance Analytics** - Trend charts and metrics
3. ✅ **User Management** - Full CRUD operations
4. ✅ **Bulk Operations** - Efficient user administration
5. ✅ **Audit Logging** - Complete activity trail
6. ✅ **Role Management** - Change user permissions

**Next Steps:**
- Log in as super admin
- Explore the new tabs
- Test user management features
- Monitor system health regularly

**Need More Features?**
Consider implementing:
- Activity Feed filters and export
- Real-time subscriptions for live updates
- Enhanced Quick Actions with keyboard shortcuts
- Advanced analytics with custom reports
- Billing & subscriptions management

---

**Questions or Issues?**
Check the troubleshooting section or review the migration SQL files for detailed comments.
