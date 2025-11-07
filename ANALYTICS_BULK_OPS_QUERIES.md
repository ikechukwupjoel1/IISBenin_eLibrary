# Analytics & Bulk Operations - Quick Reference

## 🔍 Common Analytics Queries

### View Current Analytics Data

```sql
-- Latest daily snapshot
SELECT * FROM daily_analytics_snapshots 
ORDER BY snapshot_date DESC 
LIMIT 1;

-- Top 10 most borrowed books (all time)
SELECT * FROM book_usage_analytics 
ORDER BY total_borrows DESC 
LIMIT 10;

-- Most active users (last 30 days)
SELECT 
  full_name,
  email,
  borrows_last_30_days,
  active_borrows,
  overdue_count
FROM user_engagement_metrics
WHERE borrows_last_30_days > 0
ORDER BY borrows_last_30_days DESC
LIMIT 20;

-- Institution performance comparison
SELECT 
  institution_name,
  total_students,
  total_books,
  borrows_last_30_days,
  current_active_borrows,
  current_overdue,
  ROUND((borrows_last_30_days::DECIMAL / NULLIF(total_students, 0)), 2) as borrows_per_student
FROM institution_performance_stats
WHERE is_active = true
ORDER BY borrows_last_30_days DESC;

-- Category popularity ranking
SELECT 
  category,
  total_books,
  total_borrows,
  borrows_last_30_days,
  popularity_score,
  ROUND(avg_borrow_duration, 1) as avg_days
FROM category_analytics
ORDER BY popularity_score DESC;

-- Trending books (last 7 days)
SELECT * FROM get_trending_books(7, 10);

-- Trending books (last 30 days)
SELECT * FROM get_trending_books(30, 20);

-- Peak borrowing hours
SELECT 
  hour_of_day,
  day_of_week,
  borrow_count,
  most_borrowed_category,
  peak_hour
FROM borrowing_patterns
WHERE pattern_date >= CURRENT_DATE - INTERVAL '7 days'
  AND peak_hour = true
ORDER BY borrow_count DESC;

-- Growth over last 7 days
SELECT 
  snapshot_date,
  total_users,
  new_users_today,
  total_books,
  new_books_today,
  borrows_today,
  active_users
FROM daily_analytics_snapshots
WHERE snapshot_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY snapshot_date DESC;
```

### Maintenance Operations

```sql
-- Refresh all analytics (run periodically, e.g., every 15 minutes)
SELECT refresh_analytics_views();

-- Generate snapshot for today
SELECT generate_daily_snapshot(CURRENT_DATE);

-- Generate snapshot for specific date
SELECT generate_daily_snapshot('2025-11-07');

-- Update category analytics
SELECT update_category_analytics();

-- Analyze borrowing patterns for today
SELECT analyze_borrowing_patterns(CURRENT_DATE);

-- Analyze patterns for date range
DO $$
DECLARE
  current_date DATE := '2025-11-01';
  end_date DATE := CURRENT_DATE;
BEGIN
  WHILE current_date <= end_date LOOP
    PERFORM analyze_borrowing_patterns(current_date);
    current_date := current_date + INTERVAL '1 day';
  END LOOP;
END $$;
```

### Custom Analytics Queries

```sql
-- Books never borrowed
SELECT b.id, b.title, b.author, b.category
FROM books b
LEFT JOIN book_usage_analytics bua ON b.id = bua.book_id
WHERE bua.total_borrows IS NULL OR bua.total_borrows = 0;

-- Most overdue-prone books
SELECT 
  title,
  total_borrows,
  overdue_borrows,
  ROUND((overdue_borrows::DECIMAL / NULLIF(total_borrows, 0) * 100), 1) as overdue_rate
FROM book_usage_analytics
WHERE total_borrows > 5
ORDER BY overdue_rate DESC
LIMIT 20;

-- User engagement tiers
SELECT 
  CASE
    WHEN borrows_last_30_days >= 10 THEN 'Power User'
    WHEN borrows_last_30_days >= 5 THEN 'Active User'
    WHEN borrows_last_30_days >= 1 THEN 'Regular User'
    ELSE 'Inactive User'
  END as user_tier,
  COUNT(*) as user_count
FROM user_engagement_metrics
GROUP BY user_tier
ORDER BY MIN(borrows_last_30_days) DESC;

-- Category performance comparison
SELECT 
  c1.category,
  c1.borrows_last_30_days as current_month,
  LAG(c1.borrows_last_30_days) OVER (PARTITION BY c1.category ORDER BY c1.last_calculated) as previous_month,
  c1.borrows_last_30_days - LAG(c1.borrows_last_30_days) OVER (PARTITION BY c1.category ORDER BY c1.last_calculated) as growth
FROM category_analytics c1
ORDER BY growth DESC NULLS LAST;
```

---

## 🔄 Bulk Operations Reference

### Create Bulk Jobs

```sql
-- Bulk role change
SELECT create_bulk_operation_job(
  'role_change',
  jsonb_build_object('new_role', 'librarian'),
  ARRAY[
    'user-uuid-1'::UUID,
    'user-uuid-2'::UUID,
    'user-uuid-3'::UUID
  ]
);

-- Activate multiple institutions
SELECT create_bulk_operation_job(
  'institution_activation',
  '{}'::jsonb,
  ARRAY[
    'inst-uuid-1'::UUID,
    'inst-uuid-2'::UUID
  ]
);

-- Bulk book update
SELECT create_bulk_operation_job(
  'book_update',
  jsonb_build_object(
    'updates', jsonb_build_object(
      'category', 'Science Fiction',
      'publisher', 'Penguin Books'
    )
  ),
  ARRAY[
    'book-uuid-1'::UUID,
    'book-uuid-2'::UUID
  ]
);

-- Bulk announcement send
SELECT create_bulk_operation_job(
  'announcement_send',
  jsonb_build_object(
    'announcement', jsonb_build_object(
      'title', 'System Maintenance',
      'message', 'The library will be offline for maintenance on Sunday.',
      'priority', 'high'
    )
  ),
  ARRAY[
    'user-uuid-1'::UUID,
    'user-uuid-2'::UUID
  ]
);
```

### Process Jobs

```sql
-- Process role change job
SELECT process_bulk_role_change('job-uuid');

-- Process institution toggle job
SELECT process_bulk_institution_toggle('job-uuid');

-- Process book update job
SELECT process_bulk_book_update('job-uuid');

-- Process announcement send job
SELECT process_bulk_announcement_send('job-uuid');
```

### Monitor Jobs

```sql
-- Get job status
SELECT * FROM get_bulk_job_status('job-uuid');

-- View all jobs
SELECT 
  id,
  operation_type,
  status,
  target_count,
  processed_count,
  success_count,
  error_count,
  progress_percentage,
  created_at,
  completed_at
FROM bulk_operation_jobs
ORDER BY created_at DESC
LIMIT 20;

-- View pending jobs
SELECT * FROM bulk_operation_jobs
WHERE status = 'pending'
ORDER BY created_at;

-- View processing jobs
SELECT * FROM bulk_operation_jobs
WHERE status = 'processing'
ORDER BY created_at;

-- View failed jobs
SELECT 
  id,
  operation_type,
  error_count,
  parameters,
  created_at
FROM bulk_operation_jobs
WHERE status = 'failed'
ORDER BY created_at DESC;

-- View logs for a specific job
SELECT 
  item_type,
  status,
  action_performed,
  old_value,
  new_value,
  error_message,
  created_at
FROM bulk_operation_logs
WHERE job_id = 'job-uuid'
ORDER BY created_at;

-- Count errors by type
SELECT 
  j.operation_type,
  l.status,
  COUNT(*) as count
FROM bulk_operation_logs l
JOIN bulk_operation_jobs j ON l.job_id = j.id
GROUP BY j.operation_type, l.status
ORDER BY j.operation_type, l.status;
```

### Cleanup

```sql
-- Cancel pending job
SELECT cancel_bulk_operation_job('job-uuid');

-- Delete old completed jobs (older than 30 days)
DELETE FROM bulk_operation_jobs
WHERE status = 'completed'
  AND completed_at < NOW() - INTERVAL '30 days';

-- Delete old failed jobs (older than 7 days)
DELETE FROM bulk_operation_jobs
WHERE status = 'failed'
  AND created_at < NOW() - INTERVAL '7 days';
```

---

## 📊 Advanced Analytics Queries

### Time Series Analysis

```sql
-- Daily borrow trend (last 30 days)
SELECT 
  snapshot_date,
  borrows_today,
  returns_today,
  new_users_today,
  new_books_today
FROM daily_analytics_snapshots
WHERE snapshot_date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY snapshot_date;

-- Weekly aggregation
SELECT 
  DATE_TRUNC('week', snapshot_date) as week,
  SUM(borrows_today) as total_borrows,
  SUM(returns_today) as total_returns,
  AVG(active_users) as avg_active_users
FROM daily_analytics_snapshots
WHERE snapshot_date >= CURRENT_DATE - INTERVAL '12 weeks'
GROUP BY week
ORDER BY week;

-- Month-over-month comparison
WITH monthly_stats AS (
  SELECT 
    DATE_TRUNC('month', snapshot_date) as month,
    SUM(borrows_today) as total_borrows,
    AVG(active_users) as avg_active_users,
    MAX(total_books) as books_end_of_month
  FROM daily_analytics_snapshots
  GROUP BY month
)
SELECT 
  month,
  total_borrows,
  LAG(total_borrows) OVER (ORDER BY month) as prev_month_borrows,
  total_borrows - LAG(total_borrows) OVER (ORDER BY month) as growth,
  ROUND(((total_borrows - LAG(total_borrows) OVER (ORDER BY month))::DECIMAL / 
    NULLIF(LAG(total_borrows) OVER (ORDER BY month), 0) * 100), 1) as growth_percentage
FROM monthly_stats
ORDER BY month DESC;
```

### Cohort Analysis

```sql
-- User retention by month
WITH user_first_borrow AS (
  SELECT 
    user_id,
    DATE_TRUNC('month', MIN(borrowed_at)) as cohort_month
  FROM borrowing_records
  GROUP BY user_id
),
monthly_activity AS (
  SELECT 
    br.user_id,
    DATE_TRUNC('month', br.borrowed_at) as activity_month
  FROM borrowing_records br
  GROUP BY br.user_id, activity_month
)
SELECT 
  ufb.cohort_month,
  COUNT(DISTINCT ufb.user_id) as cohort_size,
  COUNT(DISTINCT ma.user_id) FILTER (WHERE ma.activity_month = ufb.cohort_month + INTERVAL '1 month') as month_1,
  COUNT(DISTINCT ma.user_id) FILTER (WHERE ma.activity_month = ufb.cohort_month + INTERVAL '2 months') as month_2,
  COUNT(DISTINCT ma.user_id) FILTER (WHERE ma.activity_month = ufb.cohort_month + INTERVAL '3 months') as month_3
FROM user_first_borrow ufb
LEFT JOIN monthly_activity ma ON ufb.user_id = ma.user_id
GROUP BY ufb.cohort_month
ORDER BY ufb.cohort_month DESC;
```

### Performance Benchmarks

```sql
-- Top performing institutions
SELECT 
  institution_name,
  total_students,
  borrows_last_30_days,
  ROUND((borrows_last_30_days::DECIMAL / NULLIF(total_students, 0)), 2) as borrows_per_student,
  ROUND((current_overdue::DECIMAL / NULLIF(current_active_borrows, 0) * 100), 1) as overdue_rate,
  CASE
    WHEN borrows_last_30_days::DECIMAL / NULLIF(total_students, 0) >= 3 THEN '⭐⭐⭐ Excellent'
    WHEN borrows_last_30_days::DECIMAL / NULLIF(total_students, 0) >= 2 THEN '⭐⭐ Good'
    WHEN borrows_last_30_days::DECIMAL / NULLIF(total_students, 0) >= 1 THEN '⭐ Fair'
    ELSE '❌ Needs Improvement'
  END as performance_rating
FROM institution_performance_stats
WHERE is_active = true
  AND total_students > 0
ORDER BY borrows_per_student DESC;
```

---

## 🚨 Monitoring & Alerts

### Health Checks

```sql
-- Check for stale analytics (not updated in last hour)
SELECT 
  'book_usage_analytics' as view_name,
  analytics_month,
  NOW() - analytics_month as age
FROM book_usage_analytics
WHERE analytics_month < NOW() - INTERVAL '1 hour'
LIMIT 1;

-- Check for failed bulk jobs
SELECT 
  COUNT(*) as failed_job_count,
  MIN(created_at) as oldest_failed_job
FROM bulk_operation_jobs
WHERE status = 'failed';

-- Check for stuck processing jobs (processing > 1 hour)
SELECT 
  id,
  operation_type,
  started_at,
  NOW() - started_at as processing_duration
FROM bulk_operation_jobs
WHERE status = 'processing'
  AND started_at < NOW() - INTERVAL '1 hour';
```

### Alerting Queries

```sql
-- High overdue rate alert (>20%)
SELECT 
  institution_name,
  current_active_borrows,
  current_overdue,
  ROUND((current_overdue::DECIMAL / NULLIF(current_active_borrows, 0) * 100), 1) as overdue_rate
FROM institution_performance_stats
WHERE current_active_borrows > 0
  AND (current_overdue::DECIMAL / current_active_borrows) > 0.2
ORDER BY overdue_rate DESC;

-- Low engagement alert (no borrows in 30 days)
SELECT 
  institution_name,
  total_students,
  borrows_last_30_days
FROM institution_performance_stats
WHERE is_active = true
  AND total_students > 10
  AND borrows_last_30_days = 0;

-- Category with declining popularity
SELECT 
  category,
  borrows_last_30_days,
  growth_rate
FROM category_analytics
WHERE growth_rate < -20
ORDER BY growth_rate;
```

---

## 📅 Scheduled Maintenance Tasks

### Recommended Schedule

```sql
-- Every 15 minutes: Refresh materialized views
SELECT refresh_analytics_views();

-- Hourly: Update category analytics
SELECT update_category_analytics();

-- Daily at midnight: Generate snapshot
SELECT generate_daily_snapshot(CURRENT_DATE);

-- Daily at midnight: Analyze patterns
SELECT analyze_borrowing_patterns(CURRENT_DATE);

-- Weekly: Clean up old notifications
SELECT cleanup_old_notifications();

-- Monthly: Archive old bulk operation logs
INSERT INTO bulk_operation_logs_archive
SELECT * FROM bulk_operation_logs
WHERE created_at < NOW() - INTERVAL '90 days';

DELETE FROM bulk_operation_logs
WHERE created_at < NOW() - INTERVAL '90 days';
```

---

## 💡 Best Practices

### Analytics
- Always refresh views before generating reports
- Generate snapshots at consistent times (e.g., midnight)
- Archive old snapshots after 1 year
- Monitor materialized view refresh times
- Use indexes for custom queries

### Bulk Operations
- Test with 2-3 items before large batches
- Monitor job progress in real-time
- Review error logs immediately after completion
- Cancel stuck jobs manually if needed
- Keep operation logs for at least 90 days
- Set up alerts for failed jobs

---

**Last Updated:** November 7, 2025
